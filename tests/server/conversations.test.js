/* Caixa de mensagens: recorte por papel, última mensagem, não lidas e ordem. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp, createAdmin, createClient, request } from './helpers.js';

async function abrirSolicitacao(app, token, tipo, descricao) {
  const resposta = await request(app, 'POST', '/api/me/requests', {
    token,
    body: { type: tipo, description: descricao },
  });
  assert.equal(resposta.status, 201);
  return resposta.body.request.id;
}

test('cliente vê apenas as próprias conversas', async () => {
  const { app, close } = await createTestApp();
  try {
    const ana = await createClient(app, { email: 'ana@teste.com' });
    const bruno = await createClient(app, { email: 'bruno@teste.com' });

    await abrirSolicitacao(app, ana.token, 'Site', 'Solicitação da Ana bem descrita.');
    await abrirSolicitacao(app, bruno.token, 'Automação', 'Solicitação do Bruno descrita.');

    const daAna = await request(app, 'GET', '/api/conversations', { token: ana.token });

    assert.equal(daAna.status, 200);
    assert.equal(daAna.body.conversations.length, 1);
    assert.equal(daAna.body.conversations[0].type, 'Site');
    assert.equal(daAna.body.conversations[0].client.id, ana.id);
    assert.equal(daAna.body.conversations[0].lastMessage, null, 'ainda sem mensagem');
  } finally {
    close();
  }
});

test('admin vê as conversas de todos os clientes', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const ana = await createClient(app, { name: 'Ana Souza', email: 'ana@teste.com' });
    const bruno = await createClient(app, { name: 'Bruno Lima', email: 'bruno@teste.com' });

    await abrirSolicitacao(app, ana.token, 'Site', 'Solicitação da Ana bem descrita.');
    await abrirSolicitacao(app, bruno.token, 'Automação', 'Solicitação do Bruno descrita.');

    const doAdmin = await request(app, 'GET', '/api/conversations', { token: admin.token });

    assert.equal(doAdmin.body.conversations.length, 2);

    const ids = doAdmin.body.conversations.map((c) => c.client.id).sort();
    assert.deepEqual(ids, [ana.id, bruno.id].sort(), 'uma conversa de cada cliente');

    const nomes = doAdmin.body.conversations.map((c) => c.client.name).sort();
    assert.deepEqual(nomes, ['Ana Souza', 'Bruno Lima']);
  } finally {
    close();
  }
});

test('traz a última mensagem e marca se foi minha', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const ana = await createClient(app);
    const id = await abrirSolicitacao(app, ana.token, 'Site', 'Preciso de um site novo.');

    await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: ana.token,
      body: { body: 'Primeira mensagem da cliente.' },
    });
    await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: admin.token,
      body: { body: 'Resposta da equipe.' },
    });

    const daAna = await request(app, 'GET', '/api/conversations', { token: ana.token });
    const conversa = daAna.body.conversations[0];

    assert.equal(conversa.lastMessage.body, 'Resposta da equipe.');
    assert.equal(conversa.lastMessage.mine, false, 'a última foi do admin');

    const doAdmin = await request(app, 'GET', '/api/conversations', { token: admin.token });
    assert.equal(doAdmin.body.conversations[0].lastMessage.mine, true);
  } finally {
    close();
  }
});

test('conta as não lidas de quem está olhando', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const ana = await createClient(app);
    const id = await abrirSolicitacao(app, ana.token, 'Site', 'Preciso de um site novo.');

    /* Duas do admin: não lidas para a Ana, lidas para o próprio admin. */
    await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: admin.token,
      body: { body: 'Mensagem um.' },
    });
    await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: admin.token,
      body: { body: 'Mensagem dois.' },
    });

    const daAna = await request(app, 'GET', '/api/conversations', { token: ana.token });
    assert.equal(daAna.body.conversations[0].unread, 2);

    const doAdmin = await request(app, 'GET', '/api/conversations', { token: admin.token });
    assert.equal(doAdmin.body.conversations[0].unread, 0, 'ninguém tem não lida da própria');

    /* Abrir a conversa zera. */
    await request(app, 'GET', `/api/requests/${id}/messages`, { token: ana.token });
    const depois = await request(app, 'GET', '/api/conversations', { token: ana.token });
    assert.equal(depois.body.conversations[0].unread, 0);
  } finally {
    close();
  }
});

test('conversa com mensagem mais recente aparece primeiro', async () => {
  const { app, close } = await createTestApp();
  try {
    const ana = await createClient(app);
    const antiga = await abrirSolicitacao(app, ana.token, 'Site', 'A primeira solicitação.');
    const nova = await abrirSolicitacao(app, ana.token, 'Automação', 'A segunda solicitação.');

    /* Mensagem na conversa ANTIGA deve trazê-la para o topo. */
    await request(app, 'POST', `/api/requests/${antiga}/messages`, {
      token: ana.token,
      body: { body: 'Voltando a falar da primeira.' },
    });

    const lista = await request(app, 'GET', '/api/conversations', { token: ana.token });
    assert.equal(lista.body.conversations[0].requestId, antiga);
    assert.equal(lista.body.conversations[1].requestId, nova);
  } finally {
    close();
  }
});

test('conversa sem nenhuma mensagem ainda aparece na lista', async () => {
  const { app, close } = await createTestApp();
  try {
    const ana = await createClient(app);
    await abrirSolicitacao(app, ana.token, 'Site', 'Solicitação recém aberta.');

    const lista = await request(app, 'GET', '/api/conversations', { token: ana.token });

    assert.equal(lista.body.conversations.length, 1);
    assert.equal(lista.body.conversations[0].lastMessage, null);
    assert.equal(lista.body.conversations[0].unread, 0);
  } finally {
    close();
  }
});

test('a caixa de mensagens exige sessão', async () => {
  const { app, close } = await createTestApp();
  try {
    const resposta = await request(app, 'GET', '/api/conversations');
    assert.equal(resposta.status, 401);
  } finally {
    close();
  }
});

test('a lista não expõe hash de senha', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const ana = await createClient(app);
    await abrirSolicitacao(app, ana.token, 'Site', 'Uma solicitação qualquer.');

    const lista = await request(app, 'GET', '/api/conversations', { token: admin.token });
    assert.ok(!JSON.stringify(lista.body).includes('scrypt$'));
    assert.ok(!JSON.stringify(lista.body).includes('password'));
  } finally {
    close();
  }
});
