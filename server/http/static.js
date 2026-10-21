/* =========================================================================
   Auxiliares do servidor de produção (server.js), isolados aqui para serem
   testáveis sem subir o processo: caminho estático seguro, status do fallback
   da SPA e leitura do corpo da requisição.
   ========================================================================= */

import { extname, join, normalize, resolve, sep } from 'node:path';
import { seoFor } from '../../shared/seo.js';

/**
 * Resolve o caminho pedido DENTRO de `dist`.
 * · null      → tentativa de sair da pasta (`../`): path traversal.
 * · undefined → percent-encoding inválido (`%E0%A4%A`): o chamador responde 400.
 */
export function caminhoEstatico(dist, pathname) {
  let decodificado;
  try {
    decodificado = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const alvo = resolve(join(dist, normalize(decodificado)));

  if (alvo !== dist && !alvo.startsWith(dist + sep)) return null;
  return alvo;
}

/**
 * Status do fallback da SPA. Caminho com extensão de arquivo que não existe
 * (/assets/x.js, /favicon.ico) é 404 sem HTML; rota que o React não conhece
 * também sai 404, mas com o HTML da SPA para o React mostrar a página 404.
 */
export function statusDaSpa(pathname) {
  if (extname(pathname)) return 404;
  return seoFor(pathname).notFound ? 404 : 200;
}

/**
 * Lê o corpo juntando Buffers e decodificando UTF-8 só no fim (decodificar
 * pedaço a pedaço corrompe caractere multibyte cortado entre dois pedaços).
 * Mede BYTES. Acima do limite devolve `{ tooLarge: true }` e para de ler — sem
 * `destroy()`, para o chamador ainda poder responder 413 no mesmo socket.
 */
export function lerCorpo(request, maxBytes) {
  return new Promise((resolvePromise) => {
    const pedacos = [];
    let total = 0;
    let encerrado = false;

    const terminar = (resultado) => {
      if (encerrado) return;
      encerrado = true;
      resolvePromise(resultado);
    };

    request.on('data', (pedaco) => {
      if (encerrado) return;
      total += pedaco.length;
      if (total > maxBytes) {
        pedacos.length = 0;
        request.pause();
        terminar({ body: '', tooLarge: true });
        return;
      }
      pedacos.push(pedaco);
    });
    request.on('end', () =>
      terminar({ body: Buffer.concat(pedacos).toString('utf8'), tooLarge: false })
    );
    request.on('error', () => terminar({ body: '', tooLarge: false }));
    request.on('close', () =>
      terminar({ body: Buffer.concat(pedacos).toString('utf8'), tooLarge: false })
    );
  });
}
