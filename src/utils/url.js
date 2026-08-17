/* =========================================================================
   Validação de URLs vindas de dados.
   -------------------------------------------------------------------------
   Hoje os links de projeto são escritos à mão em `src/data/projects.js`. Na
   fase seguinte eles virão do painel administrativo — ou seja, de conteúdo
   editável. Um `href` como `javascript:...` viraria XSS armazenado.

   Por isso todo link de dado passa por aqui: só http, https e mailto sobrevivem.
   ========================================================================= */

import { ALLOWED_URL_PROTOCOLS } from '../config/constants.js';

/**
 * Devolve a URL se o protocolo for permitido; caso contrário `null`.
 * Quem chama decide o que fazer (normalmente: não renderizar o link).
 */
export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    /* `window.location.origin` como base aceita caminhos relativos ("/algo")
       sem abrir mão da checagem de protocolo. */
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const url = new URL(value, base);

    return ALLOWED_URL_PROTOCOLS.includes(url.protocol) ? value : null;
  } catch {
    /* URL malformada é tratada como ausente, não como erro fatal. */
    return null;
  }
}
