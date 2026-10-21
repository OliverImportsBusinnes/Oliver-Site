/* Endurecimento: rate limit (IP, documento, login/cadastro), repasse de erros
   da API de licenciamento, timeout inválido e configuração. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/db/index.js';
import { createApp } from '../../server/app.js';
import { accountService } from '../../server/services/account.js';
import { checkoutService } from '../../server/services/checkout.js';
import { quoteRequestsService } from '../../server/services/quoteRequests.js';
import { createRateLimiter } from '../../server/http/rateLimit.js';
import { clientAddress } from '../../server/http/clientAddress.js';
import { assertProductionConfig, parseTimeoutMs } from '../../server/config.js';
import { request } from './helpers.js';

const LICENSING = { baseUrl: 'https://lic.exemplo', serviceKey: 'chave', timeoutMs: 5000 };
const CPF = '529.982.247-25';

async function appCom(servicos) {
  const db = await createTestDb();
  await db.init();
  return { app: createApp(db, servicos), close: () => db.close() };
}

/* ---- 1. endereço do visitante ---- */

test('clientAddress usa o ÚLTIMO item de x-forwarded-for, não o primeiro', () => {
  assert.equal(clientAddress({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 9.9.9.9' }, '10.0.0.1'), '9.9.9.9');
});

test('clientAddress sem cabeçalho usa o IP do socket, não um bucket único', () => {
  assert.equal(clientAddress({}, '10.0.0.7'), '10.0.0.7');
  assert.equal(clientAddress({}, undefined), 'desconhecido');
});

test('rate limit não é burlado trocando o primeiro item de x-forwarded-for', async () => {
  const { app, close } = await appCom({
    quoteRequests: quoteRequestsService({
      licensing: LICENSING,
      fetchImpl: async () => ({ ok: true, status: 201, text: async () => '{}' }),
    }),
  });
  try {
    const corpo = {
      requesterName: 'Joana Silva',
      requesterEmail: 'joana@exemplo.com',
      requesterPhone: '11999999999',
      subject: 'Orçamento teste',
      description: 'Descrição suficiente do pedido.',
    };
    let ultimo;
    for (let i = 0; i < 6; i += 1) {
      ultimo = await request(app, 'POST', '/api/quote-requests', {
        body: corpo,
        headers: { 'x-forwarded-for': `1.2.3.${i}, 8.8.8.8` },
      });
    }
    assert.equal(ultimo.status, 429);
  } finally {
    await close();
  }
});

/* ---- rate limiter ---- */

test('createRateLimiter limita o tamanho do mapa', () => {
  const limiter = createRateLimiter({ max: 5, windowMs: 60_000, maxKeys: 10 });
  for (let i = 0; i < 100; i += 1) limiter.hit(`ip-${i}`);
  assert.ok(limiter.size() <= 10);
});

test('createRateLimiter bloqueia após o máximo e hit devolve false', () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
  assert.equal(limiter.hit('a'), true);
  assert.equal(limiter.hit('a'), true);
  assert.equal(limiter.hit('a'), false);
  assert.equal(limiter.hit('b'), true);
});

/* ---- 1b. access-link por documento ---- */

test('access-link limita por documento mesmo trocando de IP', async () => {
  const { app, close } = await appCom({
    account: accountService({
      licensing: LICENSING,
      fetchImpl: async () => ({ ok: true, status: 202, text: async () => '{}' }),
    }),
  });
  try {
    let ultimo;
    for (let i = 0; i < 6; i += 1) {
      ultimo = await request(app, 'POST', '/api/account/access-link', {
        body: { taxId: CPF, email: 'a@exemplo.com' },
        headers: { 'x-forwarded-for': `7.7.7.${i}` },
      });
    }
    assert.equal(ultimo.status, 429);
  } finally {
    await close();
  }
});

/* ---- 5. login e cadastro por IP ---- */

test('login é limitado por IP, mesmo variando o e-mail', async () => {
  const { app, close } = await appCom({});
  try {
    let ultimo;
    for (let i = 0; i < 25; i += 1) {
      ultimo = await request(app, 'POST', '/api/auth/login', {
        body: { email: `x${i}@exemplo.com`, password: 'qualquer' },
        headers: { 'x-forwarded-for': '5.5.5.5' },
      });
    }
    assert.equal(ultimo.status, 429);
    const outro = await request(app, 'POST', '/api/auth/login', {
      body: { email: 'y@exemplo.com', password: 'qualquer' },
      headers: { 'x-forwarded-for': '6.6.6.6' },
    });
    assert.equal(outro.status, 401);
  } finally {
    await close();
  }
});

test('cadastro é limitado por IP', async () => {
  const { app, close } = await appCom({});
  try {
    let ultimo;
    for (let i = 0; i < 12; i += 1) {
      ultimo = await request(app, 'POST', '/api/auth/register', {
        body: { name: 'Fulano', email: `n${i}@exemplo.com`, password: 'SenhaForte123' },
        headers: { 'x-forwarded-for': '4.4.4.4' },
      });
    }
    assert.equal(ultimo.status, 429);
  } finally {
    await close();
  }
});

/* ---- 6. repasse de erros da API ---- */

function checkoutCom(status, body) {
  return checkoutService({
    licensing: LICENSING,
    publicUrl: 'https://loja.exemplo',
    fetchImpl: async () => ({ ok: false, status, text: async () => JSON.stringify(body) }),
  });
}
const PEDIDO = {
  companyName: 'Sorveteria Gigi',
  contactName: 'Joana',
  taxId: CPF,
  email: 'joana@exemplo.com',
  phone: '11999999999',
  devices: 1,
  acceptTerms: true,
};

test('checkout só repassa errors de campos conhecidos com mensagem string', async () => {
  const servico = checkoutCom(400, {
    detail: 'Trace: at Foo.bar (/srv/app.js:1)\nsecreto',
    errors: {
      taxId: ['Documento inválido.'],
      email: 'E-mail ruim.',
      senhaDoBanco: ['vazou'],
      phone: [{ x: 1 }],
      companyName: 42,
    },
  });
  await assert.rejects(servico.create(PEDIDO), (erro) => {
    assert.equal(erro.status, 400);
    assert.doesNotMatch(erro.message, /Trace|secreto/);
    assert.deepEqual(erro.details, { taxId: ['Documento inválido.'], email: 'E-mail ruim.' });
    return true;
  });
});

test('checkout 409 usa mensagem fixa, sem o detail cru', async () => {
  const servico = checkoutCom(409, { detail: '<script>alert(1)</script>' });
  await assert.rejects(servico.create(PEDIDO), (erro) => {
    assert.equal(erro.status, 409);
    assert.doesNotMatch(erro.message, /script/);
    return true;
  });
});

test('orçamento só repassa errors de campos conhecidos', async () => {
  const servico = quoteRequestsService({
    licensing: LICENSING,
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ detail: 'interno\nstack', errors: { subject: ['Curto.'], hack: ['x'] } }),
    }),
  });
  await assert.rejects(
    servico.create({
      requesterName: 'Joana Silva',
      requesterEmail: 'joana@exemplo.com',
      requesterPhone: '11999999999',
      subject: 'Orçamento teste',
      description: 'Descrição suficiente do pedido.',
    }),
    (erro) => {
      assert.equal(erro.status, 400);
      assert.doesNotMatch(erro.message, /stack/);
      assert.deepEqual(erro.details, { subject: ['Curto.'] });
      return true;
    }
  );
});

/* ---- 13. timeout ---- */

test('parseTimeoutMs cai no padrão quando o valor não é um número válido', () => {
  assert.equal(parseTimeoutMs('abc'), 90000);
  assert.equal(parseTimeoutMs('-5'), 90000);
  assert.equal(parseTimeoutMs('0'), 90000);
  assert.equal(parseTimeoutMs(undefined), 90000);
  assert.equal(parseTimeoutMs('30000'), 30000);
});

test('checkout com timeoutMs NaN ainda chama a API (não aborta na hora)', async () => {
  let chamou = false;
  const servico = checkoutService({
    licensing: { ...LICENSING, timeoutMs: Number.NaN },
    publicUrl: 'https://loja.exemplo',
    fetchImpl: async (_url, opcoes) => {
      chamou = true;
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(opcoes.signal.aborted, false);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ checkoutUrl: 'https://www.mercadopago.com.br/x' }),
      };
    },
  });
  const r = await servico.create(PEDIDO);
  assert.ok(chamou);
  assert.equal(r.checkoutUrl, 'https://www.mercadopago.com.br/x');
});

/* ---- 9. SESSION_SECRET ---- */

test('assertProductionConfig não exige SESSION_SECRET', () => {
  const antes = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    assert.doesNotThrow(() => assertProductionConfig());
  } finally {
    if (antes !== undefined) process.env.SESSION_SECRET = antes;
  }
});
