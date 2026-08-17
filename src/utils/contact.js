/* =========================================================================
   Helpers de contato — WhatsApp e e-mail.
   Nenhum número/e-mail é escrito diretamente em componentes: tudo vem de
   `src/data/company.js` e passa por aqui.
   ========================================================================= */

import { EMAIL, WHATSAPP_NUMBER, WHATSAPP_MESSAGES } from '../data/company.js';

/** Mantém apenas dígitos (aceita o número escrito com +, espaços, hífens...). */
const digitsOnly = (value) => String(value).replace(/\D/g, '');

/**
 * O número só é considerado válido quando tem cara de telefone internacional
 * (10 a 15 dígitos). Com o placeholder `[MEU_WHATSAPP]` isso é `false`.
 */
export const isWhatsAppConfigured = (() => {
  const digits = digitsOnly(WHATSAPP_NUMBER);
  return digits.length >= 10 && digits.length <= 15;
})();

/** Link `mailto:` com assunto e corpo pré-preenchidos. */
export const createMailtoLink = (message, subject = 'Contato pelo site') =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}` +
  (message ? `&body=${encodeURIComponent(message)}` : '');

/**
 * Gera o link do WhatsApp com a mensagem já preenchida.
 * Enquanto WHATSAPP_NUMBER for o placeholder, devolve o `mailto:` para que o
 * botão continue funcional em vez de apontar para um link quebrado.
 */
let warned = false;

export const createWhatsAppLink = (message = WHATSAPP_MESSAGES.default) => {
  if (!isWhatsAppConfigured) {
    if (import.meta.env.DEV && !warned) {
      warned = true;
      console.warn(
        '[contato] WHATSAPP_NUMBER ainda é um placeholder. ' +
          'Edite src/data/company.js e informe o número no formato internacional (ex.: 5511999999999).'
      );
    }
    return createMailtoLink(message, 'Projeto de software');
  }

  return `https://wa.me/${digitsOnly(WHATSAPP_NUMBER)}?text=${encodeURIComponent(
    message
  )}`;
};

/**
 * Versão legível do número para exibir na tela.
 * Formata padrões brasileiros (+55 11 99999-9999) e devolve o valor original
 * quando ainda é placeholder ou tem outro formato.
 */
export const whatsappDisplay = (() => {
  if (!isWhatsAppConfigured) return WHATSAPP_NUMBER;

  const digits = digitsOnly(WHATSAPP_NUMBER);
  const br = digits.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (br) return `+55 (${br[1]}) ${br[2]}-${br[3]}`;

  return `+${digits}`;
})();

/** Atributos padrão para links externos abertos em nova aba. */
export const externalLinkProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
};

/**
 * Atributos dos botões de WhatsApp. Nova aba só faz sentido para o link real
 * do wa.me — no fallback `mailto:` abriria uma aba em branco.
 */
export const whatsappLinkProps = isWhatsAppConfigured ? externalLinkProps : {};
