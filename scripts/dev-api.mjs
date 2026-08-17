/* =========================================================================
   Servidor de API para desenvolvimento local.

   Em produção quem atende /api é a Netlify Function. Localmente subimos a
   MESMA aplicação (`server/app.js`) num servidor http comum, para o front
   funcionar de verdade durante o desenvolvimento.

   Uso:  npm run dev:api      (o `npm run dev` já sobe os dois juntos)
   ========================================================================= */

import { createServer } from 'node:http';
import './env.mjs'; // precisa vir antes de config.js
import { LIMITS } from '../server/config.js';
import { getDb } from '../server/db/index.js';
import { createApp } from '../server/app.js';

const PORT = Number(process.env.API_PORT ?? 8788);

/* A imagem do chat viaja em base64 (cresce ~33%): o teto precisa folgar sobre
   UPLOAD_MAX_BYTES, senão o upload morre na leitura antes de ser validado. */
const MAX_BODY_BYTES = Math.ceil(LIMITS.UPLOAD_MAX_BYTES * 1.5) + 64 * 1024;

const db = await getDb();
await db.init(); // garante as tabelas em ambiente novo

const app = createApp(db, {
  allowedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${PORT}`,
  ],
});

const readBody = (request) =>
  new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      /* Corpo absurdo é cortado antes de consumir memória. */
      if (raw.length > MAX_BODY_BYTES) request.destroy();
    });
    request.on('end', () => resolve(raw));
    request.on('error', () => resolve(''));
  });

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${PORT}`);
    const raw = await readBody(request);

    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({ error: 'JSON_INVALIDO', message: 'Corpo inválido.' })
        );
        return;
      }
    }

    const result = await app.handle({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: request.headers,
      body,
    });

    /* Resposta binária (imagem do chat): manda os bytes como estão. */
    if (result.isRaw) {
      response.writeHead(result.status, result.headers);
      response.end(result.buffer);
      return;
    }

    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    const cookies = result.headers['Set-Cookie'];
    if (cookies?.length) headers['Set-Cookie'] = cookies;

    response.writeHead(result.status, headers);
    response.end(JSON.stringify(result.body));
  } catch (error) {
    console.error('[dev-api] falha:', error?.message);
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({ error: 'ERRO_INTERNO', message: 'Erro interno.' })
    );
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] ouvindo em http://localhost:${PORT}`);
  console.log('[dev-api] o Vite encaminha /api para cá (ver vite.config.js)');
});
