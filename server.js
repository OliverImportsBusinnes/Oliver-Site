/* =========================================================================
   Servidor de produção — um processo Node servindo DUAS coisas:

     /api/*        → a aplicação (server/app.js), que fala com o PostgreSQL
     qualquer outra→ os arquivos estáticos de `dist/` (o site React)

   Servir os dois na MESMA origem não é detalhe de arrumação: o cookie de
   sessão é HttpOnly + SameSite=Lax e o front chama `/api` com
   `credentials: 'same-origin'`. Separar o site da API em domínios diferentes
   exigiria SameSite=None, que é justamente a configuração que abre espaço
   para CSRF. Aqui não é preciso.

   Uso:
     npm run build && npm start
     PORT=10000 npm start        (o Render define PORT sozinho)

   O schema do banco NÃO é aplicado aqui, de propósito: `npm run db:migrate`
   é rodado à parte, para um erro de DDL aparecer na hora e não como um
   servidor que morre antes de abrir a porta.
   ========================================================================= */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { LIMITS, assertProductionConfig } from './server/config.js';
import { getDb } from './server/db/index.js';
import { createApp } from './server/app.js';
import { normalizeApiPath } from './server/http/path.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

/** Pasta gerada por `npm run build`. */
const DIST = resolve(import.meta.dirname, 'dist');

/* Corpo máximo aceito. A imagem do chat viaja em base64 (cresce ~33%), então
   o limite precisa folgar sobre UPLOAD_MAX_BYTES, senão o upload morre na
   leitura antes de a validação sequer rodar. */
const MAX_BODY_BYTES = Math.ceil(LIMITS.UPLOAD_MAX_BYTES * 1.5) + 64 * 1024;

const TIPOS = new Map(
  Object.entries({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
  })
);

/* Os mesmos cabeçalhos que o netlify.toml aplicava. Sem eles, sair do Netlify
   seria uma perda silenciosa de segurança.
   · script-src sem 'unsafe-inline': o build gera um <script src> só.
   · style-src mantém 'unsafe-inline' por margem (React aplica estilo via
     CSSOM, que a CSP não bloqueia, mas um <style> futuro quebraria a página).
   · img-src data: cobre a textura de ruído do CSS e a prévia das imagens. */
const SEGURANCA = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; " +
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/* ------------------------------------------------------------- inicialização */

assertProductionConfig();

const db = await getDb();

/* Origens autorizadas a enviar POST/PUT/PATCH/DELETE (defesa de CSRF).

   O fallback para RENDER_EXTERNAL_URL — que o Render injeta com o endereço
   .onrender.com do serviço — existe porque a URL pública só é conhecida DEPOIS
   do primeiro deploy. Sem ele, o site subiria com a checagem de Origin
   desligada justamente na estreia, que é quando ninguém confere.

   A barra final é removida: o navegador manda `Origin: https://site.com`, sem
   barra, então `https://site.com/` na configuração nunca casaria — e a falha
   apareceria como um 403 no login, sem pista nenhuma da causa. */
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS ?? '').split(','),
  process.env.RENDER_EXTERNAL_URL ?? '',
]
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .filter((origin, indice, lista) => lista.indexOf(origin) === indice);

/* Fail-closed: em produção, lista vazia significa que a conferência de Origin
   não roda em rota nenhuma (ver server/app.js). Derrubar o boot deixa isso
   visível no log do Render; seguir em frente seria uma proteção a menos que
   ninguém notaria. */
if (!allowedOrigins.length) {
  const aviso =
    'ALLOWED_ORIGINS vazio e RENDER_EXTERNAL_URL ausente: a conferência de ' +
    'Origin (defesa de CSRF) ficaria desligada. Defina ALLOWED_ORIGINS com a ' +
    'URL pública do site, sem barra final.';

  if (process.env.NODE_ENV === 'production') throw new Error(`[server] ${aviso}`);
  console.warn(`[server] ${aviso}`);
}

const app = createApp(db, { allowedOrigins });

/* ------------------------------------------------------------------ auxiliares */

const lerCorpo = (request) =>
  new Promise((resolve) => {
    let bruto = '';
    request.on('data', (pedaco) => {
      bruto += pedaco;
      if (bruto.length > MAX_BODY_BYTES) request.destroy();
    });
    request.on('end', () => resolve(bruto));
    request.on('error', () => resolve(''));
  });

/**
 * Resolve o caminho pedido DENTRO de `dist`. Devolve null para qualquer
 * tentativa de sair da pasta (`../`), que é a defesa contra path traversal.
 */
function caminhoEstatico(pathname) {
  const decodificado = decodeURIComponent(pathname);
  const alvo = resolve(join(DIST, normalize(decodificado)));

  if (alvo !== DIST && !alvo.startsWith(DIST + sep)) return null;
  return alvo;
}

async function enviarArquivo(response, caminho, { status = 200, imutavel = false } = {}) {
  const conteudo = await readFile(caminho);

  response.writeHead(status, {
    ...SEGURANCA,
    'Content-Type': TIPOS.get(extname(caminho).toLowerCase()) ?? 'application/octet-stream',
    'Content-Length': conteudo.length,
    /* Os nomes em /assets trazem hash do conteúdo: mudou o arquivo, mudou o
       nome. Por isso podem ser guardados para sempre. O index.html, não —
       ele é quem aponta para os nomes novos. */
    'Cache-Control': imutavel
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });

  response.end(conteudo);
}

/* ------------------------------------------------------------------ requisições */

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

    /* ------------------------------------------------------------------ API */
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const bruto = await lerCorpo(request);

      let body = {};
      if (bruto) {
        try {
          body = JSON.parse(bruto);
        } catch {
          response.writeHead(400, {
            ...SEGURANCA,
            'Content-Type': 'application/json; charset=utf-8',
          });
          response.end(
            JSON.stringify({
              error: 'JSON_INVALIDO',
              message: 'Corpo da requisição não é um JSON válido.',
            })
          );
          return;
        }
      }

      const resultado = await app.handle({
        method: request.method,
        path: normalizeApiPath(url.pathname),
        query: Object.fromEntries(url.searchParams),
        headers: request.headers,
        body,
      });

      /* Resposta binária (imagem do chat): manda os bytes como estão. Os
         cabeçalhos vêm primeiro para que os do próprio resultado (Content-Type,
         nosniff, Content-Disposition) continuem tendo a última palavra. */
      if (resultado.isRaw) {
        response.writeHead(resultado.status, { ...SEGURANCA, ...resultado.headers });
        response.end(resultado.buffer);
        return;
      }

      /* A API também responde com os cabeçalhos de segurança: sem `nosniff`,
         um JSON com conteúdo enviado pelo usuário pode ser reinterpretado como
         HTML por navegador antigo e virar XSS na própria origem do site. */
      const headers = { ...SEGURANCA, 'Content-Type': 'application/json; charset=utf-8' };
      const cookies = resultado.headers['Set-Cookie'];
      if (cookies?.length) headers['Set-Cookie'] = cookies;

      response.writeHead(resultado.status, headers);
      response.end(JSON.stringify(resultado.body));
      return;
    }

    /* -------------------------------------------------------------- estáticos */
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const caminho = caminhoEstatico(url.pathname);
    if (!caminho) {
      response.writeHead(400);
      response.end();
      return;
    }

    const arquivo = await stat(caminho).catch(() => null);

    if (arquivo?.isFile()) {
      await enviarArquivo(response, caminho, {
        imutavel: url.pathname.startsWith('/assets/'),
      });
      return;
    }

    /* Single-page app: qualquer outra rota é do React Router, então devolve o
       index.html — mas com 200 só quando faz sentido. */
    await enviarArquivo(response, join(DIST, 'index.html'));
  } catch (error) {
    console.error('[server] falha:', error?.message);
    if (!response.headersSent) {
      response.writeHead(500, {
        ...SEGURANCA,
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    response.end(
      JSON.stringify({ error: 'ERRO_INTERNO', message: 'Serviço indisponível no momento.' })
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[server] ouvindo em http://${HOST}:${PORT}`);
  console.log(`[server] estáticos: ${DIST}`);
  console.log(`[server] origens autorizadas: ${allowedOrigins.join(', ') || '(nenhuma)'}`);
});

/* O Render manda SIGTERM ao trocar de versão: fechar o pool evita que a
   instância antiga segure conexões do Neon enquanto a nova sobe. */
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, () => {
    console.log(`[server] ${sinal} recebido, encerrando.`);
    server.close(() => {
      db.close().finally(() => process.exit(0));
    });
  });
}
