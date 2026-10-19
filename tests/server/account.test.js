/* Área do cliente comprador: o que este servidor manda à API, o que devolve ao
   navegador e como reage a link inválido ou API fora do ar. O `fetch` é falso:
   a API central tem os próprios testes do token e do resumo. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/db/index.js';
import { createApp } from '../../server/app.js';
import { accountService } from '../../server/services/account.js';
import { request } from './helpers.js';

const LICENSING = {
  baseUrl: 'https://licenciamento.exemplo',
  serviceKey: 'chave-de-servico-de-teste',
  timeoutMs: 5000,
};
const TOKEN = 'v1.42.1792451000.' + 'a'.repeat(43);
const RESUMO = {
  companyName: 'Sorveteria Gigi',
  contactFirstName: 'Joana',
  licenseState: 'Active',
  allowedDevices: 2,
  activeDevices: 1,
  devices: [{ name: 'Caixa 1', lastCheckAt: null }],
};

async function setup({ status = 202, body = {}, fail = null, licensing = LICENSING } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (fail) throw fail;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    };
  };
  const db = await createTestDb();
  await db.init();
  const app = createApp(db, { account: accountService({ fetchImpl, licensing }) });
  return { app, calls, close: () => db.close() };
}

test('pedido de link manda só os dígitos do documento e o e-mail, com a chave de serviço', async () => {
  const { app, calls, close } = await setup();
  try {
    const res = await request(app, 'POST', '/api/account/access-link', {
      body: { taxId: '529.982.247-25', email: ' joana@exemplo.com ', extra: 'x' },
    });
    assert.equal(res.status, 202);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://licenciamento.exemplo/api/v1/site/account/access-link');
    assert.equal(calls[0].options.headers['X-Service-Key'], LICENSING.serviceKey);
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      taxId: '52998224725',
      email: 'joana@exemplo.com',
    });
  } finally {
    await close();
  }
});

test('documento inválido não chega à API', async () => {
  const { app, calls, close } = await setup();
  try {
    const res = await request(app, 'POST', '/api/account/access-link', {
      body: { taxId: '111.111.111-11', email: 'joana@exemplo.com' },
    });
    assert.equal(res.status, 400);
    assert.equal(calls.length, 0);
  } finally {
    await close();
  }
});

test('o sexto pedido de link em 10 minutos é barrado', async () => {
  const { app, close } = await setup();
  try {
    const body = { taxId: '52998224725', email: 'joana@exemplo.com' };
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await request(app, 'POST', '/api/account/access-link', { body })).status, 202);
    }
    assert.equal((await request(app, 'POST', '/api/account/access-link', { body })).status, 429);
  } finally {
    await close();
  }
});

test('resumo com token válido devolve o que a API mandou', async () => {
  const { app, calls, close } = await setup({ status: 200, body: RESUMO });
  try {
    const res = await request(app, 'POST', '/api/account/summary', { body: { token: TOKEN } });
    assert.equal(res.status, 200);
    assert.equal(res.body.companyName, 'Sorveteria Gigi');
    assert.deepEqual(JSON.parse(calls[0].options.body), { token: TOKEN });
  } finally {
    await close();
  }
});

test('token com formato estranho nem vai para a API', async () => {
  const { app, calls, close } = await setup({ status: 200, body: RESUMO });
  try {
    const res = await request(app, 'POST', '/api/account/summary', {
      body: { token: 'v1.42.1.<script>' },
    });
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
  } finally {
    await close();
  }
});

test('token recusado pela API vira 401 com pedido de novo link', async () => {
  const { app, close } = await setup({ status: 401, body: { title: 'Link inválido' } });
  try {
    const res = await request(app, 'POST', '/api/account/summary', { body: { token: TOKEN } });
    assert.equal(res.status, 401);
    assert.match(res.body.message, /novo link/);
  } finally {
    await close();
  }
});

test('API fora do ar ou sem configuração responde 503 sem detalhe interno', async () => {
  const fora = await setup({ fail: new Error('ECONNREFUSED 10.0.0.5') });
  const semConfig = await setup({ licensing: { baseUrl: '', serviceKey: '', timeoutMs: 1000 } });
  try {
    const a = await request(fora.app, 'POST', '/api/account/summary', { body: { token: TOKEN } });
    assert.equal(a.status, 503);
    assert.doesNotMatch(JSON.stringify(a.body), /10\.0\.0\.5/);
    const b = await request(semConfig.app, 'POST', '/api/account/access-link', {
      body: { taxId: '52998224725', email: 'joana@exemplo.com' },
    });
    assert.equal(b.status, 503);
  } finally {
    await fora.close();
    await semConfig.close();
  }
});
