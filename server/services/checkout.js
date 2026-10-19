/* =========================================================================
   Compra do sistema pelo site.
   -------------------------------------------------------------------------
   O visitante preenche o formulário, este servidor valida e pede à API de
   licenciamento o link de pagamento recorrente do Mercado Pago. Nada aqui
   libera licença: quem libera é o webhook do pagamento, e o código de
   ativação segue por e-mail depois disso. O navegador nunca fala com a API;
   quem chama é este servidor, com a credencial de serviço.

   Mesma estrutura do orçamento (quoteRequests.js): validação dos dois lados,
   limite por visitante, e erro genérico quando a API central falha.
   ========================================================================= */

import { config, LIMITS } from '../config.js';
import { AppError, badRequest, tooManyRequests } from '../http/errors.js';
import { createValidator } from '../http/validation.js';
import { isValidTaxId, onlyDigits } from '../../shared/taxId.js';
import { PLAN } from '../../shared/plan.js';

/* Cada pedido válido cria um cliente e uma cobrança do outro lado, então o
   limite é mais apertado que o do orçamento. Em memória, pelo mesmo motivo
   documentado em quoteRequests.js. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const UNAVAILABLE =
  'A compra online está indisponível agora. Fale com a gente pelo WhatsApp e ' +
  'resolvemos por lá.';

export function checkoutService({
  fetchImpl = fetch,
  licensing = config.licensing,
  publicUrl = config.site.publicUrl,
} = {}) {
  const recentByClient = new Map();

  const configured = Boolean(licensing.baseUrl && licensing.serviceKey);

  /** O Mercado Pago só aceita voltar para um endereço https. */
  const backUrl = (() => {
    if (!publicUrl) return null;
    try {
      const url = new URL('/obrigado', publicUrl);
      return url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  })();

  async function create(input, { clientKey = 'desconhecido' } = {}) {
    const payload = validate(input);
    enforceRateLimit(clientKey);

    if (!configured || !backUrl) {
      /* Sem integração, ou sem o endereço público do site, o visitante
         pagaria sem ter para onde voltar. Melhor dizer que está fora. */
      throw new AppError(503, 'COMPRA_INDISPONIVEL', UNAVAILABLE);
    }

    return send({ ...payload, backUrl });
  }

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
        'Você já tentou comprar várias vezes agora há pouco. Aguarde alguns ' +
          'minutos ou fale com a gente pelo WhatsApp.'
      );
    }
    recentByClient.set(clientKey, [...recent, now]);
  }

  function validate(input) {
    const validator = createValidator();
    validator.text('companyName', input.companyName, {
      min: 2,
      max: LIMITS.COMPANY_MAX,
      label: 'o nome da empresa',
    });
    validator.text('contactName', input.contactName, {
      min: 2,
      max: LIMITS.NAME_MAX,
      label: 'seu nome',
    });
    if (!isValidTaxId(input.taxId)) {
      validator.fail('taxId', 'Confira o CPF ou o CNPJ.');
    }
    validator.email('email', input.email);
    validator.text('phone', input.phone, {
      min: 8,
      max: LIMITS.PHONE_MAX,
      label: 'o telefone',
    });

    const devices = Number(input.devices);
    if (!Number.isInteger(devices) || devices < 1 || devices > PLAN.maxDevices) {
      validator.fail(
        'devices',
        `Escolha de 1 a ${PLAN.maxDevices} computadores.`
      );
    }
    /* O aceite dos termos é uma exigência do site, não da API; sem ele a
       compra nem sai daqui. */
    if (input.acceptTerms !== true) {
      validator.fail('acceptTerms', 'Aceite os termos de uso para continuar.');
    }
    validator.assert();

    return {
      companyName: input.companyName.trim(),
      contactName: input.contactName.trim(),
      taxId: onlyDigits(input.taxId),
      email: input.email.trim(),
      phone: input.phone.trim(),
      devices,
    };
  }

  async function send(payload) {
    const url = new URL(
      'api/v1/site/checkout',
      licensing.baseUrl.endsWith('/')
        ? licensing.baseUrl
        : `${licensing.baseUrl}/`
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), licensing.timeoutMs);

    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': licensing.serviceKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (cause) {
      console.error('[compra] falha ao chamar a API de licenciamento:', cause);
      throw new AppError(503, 'COMPRA_INDISPONIVEL', UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
    }

    return readResponse(response);
  }

  async function readResponse(response) {
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    if (response.ok) {
      /* Sem link não há o que mostrar: tratar como indisponível em vez de
         mandar o visitante para um endereço vazio. */
      if (typeof body.checkoutUrl !== 'string' || !body.checkoutUrl) {
        console.error('[compra] a API respondeu sem checkoutUrl');
        throw new AppError(503, 'COMPRA_INDISPONIVEL', UNAVAILABLE);
      }
      return { checkoutUrl: body.checkoutUrl, resumed: body.resumed === true };
    }

    if (response.status === 400) {
      throw badRequest(
        body.detail ?? 'Confira os campos destacados.',
        body.errors ?? null
      );
    }
    /* Documento que já tem cadastro: o texto da API já diz o que fazer (falar
       pelo WhatsApp) e não revela nada além de "este documento existe", que o
       próprio dono do documento precisa saber. */
    if (response.status === 409) {
      throw new AppError(
        409,
        'DOCUMENTO_JA_CADASTRADO',
        body.detail ??
          'Este CPF ou CNPJ já tem cadastro. Fale com a gente pelo WhatsApp.'
      );
    }

    console.error(
      `[compra] API de licenciamento respondeu ${response.status}`,
      body.correlationId ? `correlationId=${body.correlationId}` : ''
    );
    throw new AppError(503, 'COMPRA_INDISPONIVEL', UNAVAILABLE);
  }

  return { create };
}
