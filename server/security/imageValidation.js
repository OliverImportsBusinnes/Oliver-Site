/* =========================================================================
   Validação de imagem enviada pelo usuário.
   -------------------------------------------------------------------------
   Regra central: NUNCA confiar no `type` que o navegador manda.

   Um atacante pode enviar um arquivo HTML com `type: "image/png"`. Se o
   servidor aceitar e depois devolver esse conteúdo, o navegador pode
   interpretá-lo como página — XSS armazenado. Por isso o tipo real é
   descoberto lendo os primeiros bytes (assinatura do formato), e é ESSE tipo
   que é gravado e devolvido depois.
   ========================================================================= */

import { LIMITS } from '../config.js';

/** Assinaturas dos formatos aceitos. */
const ASSINATURAS = [
  {
    mime: 'image/png',
    ext: 'png',
    testar: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    testar: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/gif',
    ext: 'gif',
    testar: (b) =>
      b.length >= 4 &&
      b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    testar: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // WEBP
  },
];

export const MIMES_ACEITOS = ASSINATURAS.map((a) => a.mime);

/** Descobre o tipo real pelos bytes. `null` quando não é imagem conhecida. */
export function detectarTipoReal(buffer) {
  return ASSINATURAS.find((a) => a.testar(buffer)) ?? null;
}

/**
 * Limpa o nome do arquivo para exibição.
 * O nome NUNCA é usado para montar caminho — o arquivo vive no banco — mas
 * ainda assim é higienizado para não carregar caminho nem caractere de
 * controle até a interface.
 */
export function limparNomeArquivo(nome, extensaoPadrao) {
  const base =
    typeof nome === 'string'
      ? nome
          .split(/[\\/]/) // descarta qualquer caminho
          .pop()
          .replace(/[^a-zA-Z0-9._ -]/g, '') // lista branca: remove acento, controle e sinal
          .trim()
          .slice(0, 80)
      : '';

  if (!base || base === '.' || base === '..') return `imagem.${extensaoPadrao}`;
  return base;
}

/**
 * Valida o base64 recebido e devolve `{ buffer, mime, ext, size, filename }`.
 * Lança string de erro legível quando recusa — quem chama transforma em 400.
 */
export function validarImagemBase64({ dataBase64, filename }) {
  if (typeof dataBase64 !== 'string' || !dataBase64) {
    throw new Error('Envie uma imagem válida.');
  }

  /* Aceita tanto "data:image/png;base64,AAA" quanto o base64 puro. */
  const puro = dataBase64.includes(',')
    ? dataBase64.slice(dataBase64.indexOf(',') + 1)
    : dataBase64;

  /* Barra pelo tamanho da string ANTES de decodificar: evita alocar 50 MB
     por causa de um payload gigante. */
  const bytesEstimados = Math.ceil((puro.length * 3) / 4);
  if (bytesEstimados > LIMITS.UPLOAD_MAX_BYTES) {
    throw new Error(
      `A imagem passa do limite de ${Math.round(LIMITS.UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`
    );
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(puro)) {
    throw new Error('Envie uma imagem válida.');
  }

  const buffer = Buffer.from(puro, 'base64');

  if (!buffer.length) throw new Error('Envie uma imagem válida.');
  if (buffer.length > LIMITS.UPLOAD_MAX_BYTES) {
    throw new Error(
      `A imagem passa do limite de ${Math.round(LIMITS.UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`
    );
  }

  const tipo = detectarTipoReal(buffer);
  if (!tipo) {
    throw new Error('Formato não aceito. Envie PNG, JPG, GIF ou WEBP.');
  }

  return {
    buffer,
    mime: tipo.mime, // o tipo REAL, não o declarado
    ext: tipo.ext,
    size: buffer.length,
    filename: limparNomeArquivo(filename, tipo.ext),
  };
}
