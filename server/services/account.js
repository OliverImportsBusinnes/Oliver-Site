/* =========================================================================
   Área do cliente comprador ("Minha licença").
   -------------------------------------------------------------------------
   O comprador não tem senha aqui. Ele informa CPF/CNPJ e e-mail; a API de
   licenciamento, se os dois baterem com o cadastro, manda ao e-mail cadastrado
   um link válido por 30 minutos. O link traz um token depois do "#", que a
   página lê e manda para cá; este servidor só repassa à API, com a credencial
   de serviço, e devolve o resumo da licença.

   O pedido de link sempre responde igual (202), exista ou não o cadastro:
   a tela não pode servir para descobrir quem é cliente.
   ========================================================================= */

import { config } from '../config.js';
import { AppError, badRequest, tooManyRequests, unauthorized } from '../http/errors.js';
import { createValidator } from '../http/validation.js';
import { isValidTaxId, onlyDigits } from '../../shared/taxId.js';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const TOKEN_PATTERN = /^v1\.[0-9]{1,19}\.[0-9]{1,12}\.[A-Za-z0-9_-]{20,64}$/;

const UNAVAILABLE =
  'A área do cliente está indisponível agora. Tente de novo em alguns minutos ' +
  'ou fale com a gente pelo WhatsApp.';

export function accountService({ fetchImpl = fetch, licensing = config.licensing } = {}) {
  const recentByClient = new Map();
  const configured = Boolean(licensing.baseUrl && licensing.serviceKey);

  function enforceRateLimit(clientKey) {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, timestamps] of recentByClient) {
      const fresh = timestamps.filter((instant) => instant > cutoff);
      if (fresh.length === 0) recentByClient.delete(key);
      else recentByClient.set(key, fresh);
    }
    const recent = recentByClient.get(clientKey) ?? [];
    if (recent.length >= RATE_LIMIT_MAX) {
      throw tooManyRequests(
        'Você pediu vários links agora há pouco. Confira o e-mail ou aguarde alguns minutos.'
      );
    }
    recentByClient.set(clientKey, [...recent, now]);
  }

  async function callApi(path, payload) {
    if (!configured) throw new AppError(503, 'AREA_INDISPONIVEL', UNAVAILABLE);

    const base = licensing.baseUrl.endsWith('/') ? licensing.baseUrl : `${licensing.baseUrl}/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), licensing.timeoutMs);
    try {
      return await fetchImpl(new URL(path, base), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': licensing.serviceKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (cause) {
      console.error('[conta] falha ao chamar a API de licenciamento:', cause);
      throw new AppError(503, 'AREA_INDISPONIVEL', UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function requestLink(input, { clientKey = 'desconhecido' } = {}) {
    const validator = createValidator();
    if (!isValidTaxId(input.taxId)) validator.fail('taxId', 'Confira o CPF ou o CNPJ.');
    validator.email('email', input.email);
    validator.assert();
    enforceRateLimit(clientKey);

    const response = await callApi('api/v1/site/account/access-link', {
      taxId: onlyDigits(input.taxId),
      email: input.email.trim(),
    });
    if (response.ok) return { sent: true };
    if (response.status === 400) throw badRequest('Confira o CPF/CNPJ e o e-mail.');
    console.error(`[conta] API respondeu ${response.status} ao pedido de link`);
    throw new AppError(503, 'AREA_INDISPONIVEL', UNAVAILABLE);
  }

  async function summary(input) {
    const token = typeof input.token === 'string' ? input.token.trim() : '';
    if (!TOKEN_PATTERN.test(token)) {
      throw unauthorized('Link inválido ou vencido. Peça um novo link de acesso.');
    }

    const response = await callApi('api/v1/site/account/summary', { token });
    const text = await response.text();
    if (response.ok) {
      try {
        return JSON.parse(text);
      } catch {
        throw new AppError(503, 'AREA_INDISPONIVEL', UNAVAILABLE);
      }
    }
    if (response.status === 401 || response.status === 400) {
      throw unauthorized('Link inválido ou vencido. Peça um novo link de acesso.');
    }
    console.error(`[conta] API respondeu ${response.status} ao resumo`);
    throw new AppError(503, 'AREA_INDISPONIVEL', UNAVAILABLE);
  }

  return { requestLink, summary };
}
