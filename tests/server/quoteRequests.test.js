/* Orçamentos do site: validação, encaminhamento à API de licenciamento,
   limite por visitante e comportamento quando a API central falha.

   O `fetch` é substituído por uma função de teste — o que se verifica aqui é o
   que ESTE servidor faz: o que valida, o que envia, o que esconde e o que
   repassa. A API central tem os próprios testes. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/db/index.js';
import { createApp } from '../../server/app.js';
import { quoteRequestsService } from '../../server/services/quoteRequests.js';
import { request } from './helpers.js';

const LICENSING = {
  baseUrl: 'https://licenciamento.exemplo',
  serviceKey: 'chave-de-servico-de-teste',
  timeoutMs: 5000,
};

const PEDIDO = {
  requesterName: 'Joana Prado',
  requesterEmail: 'joana@sorveteria.com',
  requesterPhone: '12988887777',
  company: 'Sorveteria Gigi',
  subject: 'Sistema de estoque para duas lojas',
  description: 'Preciso controlar estoque e comandas nas duas unidades.',
};

/** Sobe a app com um `fetch` controlado e registra o que foi enviado. */
async function createAppWithLicensing({
  status = 201,
  body = { id: 7, status: 'New' },
  fail = null,
  licensing = LICENSING,
} = {}) {
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
  const app = createApp(db, {
    quoteRequests: quoteRequestsService({ fetchImpl, licensing }),
  });
  return { app, calls, close: () => db.close() };
}

test('encaminha o pedido à API central e devolve o que ela gravou', async () => {
  const { app, calls, close } = await createAppWithLicensing();
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.quoteRequest.id, 7);
    assert.equal(calls.length, 1, 'deveria chamar a API uma única vez');

    const [call] = calls;
    assert.equal(
      call.url,
      'https://licenciamento.exemplo/api/v1/site/quote-requests'
    );
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.headers['X-Service-Key'], LICENSING.serviceKey);

    const enviado = JSON.parse(call.options.body);
    assert.equal(enviado.requesterName, PEDIDO.requesterName);
    assert.equal(enviado.subject, PEDIDO.subject);
  } finally {
    close();
  }
});

test('a base com barra final não duplica nem perde segmento', async () => {
  const { app, calls, close } = await createAppWithLicensing({
    licensing: { ...LICENSING, baseUrl: 'https://licenciamento.exemplo/' },
  });
  try {
    await request(app, 'POST', '/api/quote-requests', { body: PEDIDO });
    assert.equal(
      calls[0].url,
      'https://licenciamento.exemplo/api/v1/site/quote-requests'
    );
  } finally {
    close();
  }
});

test('recusa campos inválidos sem chamar a API', async () => {
  const { app, calls, close } = await createAppWithLicensing();
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: { ...PEDIDO, requesterEmail: 'nao-e-email', description: 'curto' },
    });

    assert.equal(response.status, 400);
    assert.ok(response.body.details.requesterEmail, 'e-mail deveria falhar');
    assert.ok(response.body.details.description, 'descrição deveria falhar');
    assert.equal(calls.length, 0, 'não pode gastar chamada com dado inválido');
  } finally {
    close();
  }
});

test('campo opcional vazio não vira string vazia no envio', async () => {
  const { app, calls, close } = await createAppWithLicensing();
  try {
    await request(app, 'POST', '/api/quote-requests', {
      body: { ...PEDIDO, requesterPhone: '   ', company: '' },
    });

    const enviado = JSON.parse(calls[0].options.body);
    assert.ok(
      !('requesterPhone' in enviado) || enviado.requesterPhone === undefined,
      'telefone em branco não deveria ser enviado'
    );
    assert.ok(
      !('company' in enviado) || enviado.company === undefined,
      'empresa em branco não deveria ser enviada'
    );
  } finally {
    close();
  }
});

test('campo não declarado é descartado (mass assignment)', async () => {
  const { app, calls, close } = await createAppWithLicensing();
  try {
    await request(app, 'POST', '/api/quote-requests', {
      body: { ...PEDIDO, status: 'Completed', customerId: 1, id: 99 },
    });

    const enviado = JSON.parse(calls[0].options.body);
    assert.ok(!('status' in enviado), 'situação não pode vir do visitante');
    assert.ok(!('customerId' in enviado), 'cliente não pode vir do visitante');
    assert.ok(!('id' in enviado), 'identificador não pode vir do visitante');
  } finally {
    close();
  }
});

test('o visitante é barrado depois de cinco pedidos seguidos', async () => {
  const { app, calls, close } = await createAppWithLicensing();
  try {
    const headers = { 'x-forwarded-for': '203.0.113.10' };
    for (let i = 0; i < 5; i++) {
      const ok = await request(app, 'POST', '/api/quote-requests', {
        body: PEDIDO,
        headers,
      });
      assert.equal(ok.status, 201, `pedido ${i + 1} deveria passar`);
    }

    const barrado = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
      headers,
    });
    assert.equal(barrado.status, 429);
    assert.equal(calls.length, 5, 'o sexto não pode chegar à API central');
  } finally {
    close();
  }
});

test('o limite é por visitante, não global', async () => {
  const { app, close } = await createAppWithLicensing();
  try {
    for (let i = 0; i < 5; i++) {
      await request(app, 'POST', '/api/quote-requests', {
        body: PEDIDO,
        headers: { 'x-forwarded-for': '203.0.113.10' },
      });
    }

    const outro = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
      headers: { 'x-forwarded-for': '203.0.113.99' },
    });
    assert.equal(outro.status, 201, 'outro visitante não pode ser punido');
  } finally {
    close();
  }
});

test('sem integração configurada, avisa em vez de fingir que recebeu', async () => {
  const { app, calls, close } = await createAppWithLicensing({
    licensing: { baseUrl: null, serviceKey: null, timeoutMs: 5000 },
  });
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });

    assert.equal(response.status, 503);
    assert.equal(calls.length, 0);
  } finally {
    close();
  }
});

test('a API central fora do ar vira 503, sem vazar detalhe interno', async () => {
  const { app, close } = await createAppWithLicensing({
    fail: new Error('getaddrinfo ENOTFOUND licenciamento.exemplo'),
  });
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });

    assert.equal(response.status, 503);
    assert.ok(
      !JSON.stringify(response.body).includes('ENOTFOUND'),
      'o erro de rede não pode chegar ao navegador'
    );
  } finally {
    close();
  }
});

test('erro 500 da API central não vira 500 aqui nem expõe o motivo', async () => {
  const { app, close } = await createAppWithLicensing({
    status: 500,
    body: { title: 'Erro interno', detail: 'coluna situacao não existe' },
  });
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });

    assert.equal(response.status, 503);
    assert.ok(
      !JSON.stringify(response.body).includes('coluna'),
      'detalhe do banco não pode chegar ao navegador'
    );
  } finally {
    close();
  }
});

test('400 da API central repassa os campos para o formulário destacar', async () => {
  const { app, close } = await createAppWithLicensing({
    status: 400,
    body: {
      detail: 'Revise os campos informados.',
      errors: { Subject: ['Assunto curto demais.'] },
    },
  });
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.details, {
      Subject: ['Assunto curto demais.'],
    });
  } finally {
    close();
  }
});

test('resposta ilegível da API central não derruba o servidor', async () => {
  const db = await createTestDb();
  await db.init();
  const app = createApp(db, {
    quoteRequests: quoteRequestsService({
      licensing: LICENSING,
      fetchImpl: async () => ({
        ok: true,
        status: 201,
        text: async () => '<html>gateway</html>',
      }),
    }),
  });
  try {
    const response = await request(app, 'POST', '/api/quote-requests', {
      body: PEDIDO,
    });
    assert.equal(response.status, 201, 'corpo vazio é aceito, sem exceção');
  } finally {
    db.close();
  }
});
