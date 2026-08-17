/* =========================================================================
   Vínculo projeto ↔ cliente: funcionamento, autorização e casos de abuso.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp, createAdmin, createClient, request } from './helpers.js';

/** Cria um projeto pela API administrativa e devolve o id. */
async function criarProjeto(app, adminToken, titulo) {
  const resposta = await request(app, 'POST', '/api/admin/projects', {
    token: adminToken,
    body: { title: titulo, technologies: ['C#'], isPublic: true },
  });
  assert.equal(resposta.status, 201, `falha ao criar projeto ${titulo}`);
  return resposta.body.project.id;
}

test('admin vincula um projeto e o cliente passa a enxergá-lo', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app, { email: 'marina@padaria.com' });
    const projetoId = await criarProjeto(app, admin.token, 'Sistema de Gestão');

    /* Antes: nada vinculado. */
    const antes = await request(app, 'GET', '/api/me/projects', { token: cliente.token });
    assert.deepEqual(antes.body.projects, []);

    const vinculo = await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });
    assert.equal(vinculo.status, 200);
    assert.equal(vinculo.body.alreadyLinked, false);

    /* Depois: o cliente vê o projeto no painel dele. */
    const depois = await request(app, 'GET', '/api/me/projects', { token: cliente.token });
    assert.equal(depois.body.projects.length, 1);
    assert.equal(depois.body.projects[0].title, 'Sistema de Gestão');

    const resumo = await request(app, 'GET', '/api/me/summary', { token: cliente.token });
    assert.equal(resumo.body.summary.projects, 1);
  } finally {
    close();
  }
});

test('vincular duas vezes não duplica nem quebra', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Único');

    const primeira = await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });
    const segunda = await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });

    assert.equal(primeira.status, 200);
    assert.equal(segunda.status, 200, 'duplo clique não pode virar erro 500');
    assert.equal(segunda.body.alreadyLinked, true);

    const total = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM client_projects');
    assert.equal(Number(total.t), 1, 'não pode duplicar a linha');
  } finally {
    close();
  }
});

test('desvincular remove o projeto da visão do cliente', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Temporário');

    await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });

    const remocao = await request(
      app,
      'DELETE',
      `/api/admin/clients/${cliente.id}/projects/${projetoId}`,
      { token: admin.token }
    );
    assert.equal(remocao.status, 200);

    const depois = await request(app, 'GET', '/api/me/projects', { token: cliente.token });
    assert.deepEqual(depois.body.projects, []);

    /* O projeto em si continua existindo — só o vínculo caiu. */
    const projeto = await request(app, 'GET', `/api/admin/projects`, { token: admin.token });
    assert.equal(projeto.body.projects.length, 1);
  } finally {
    close();
  }
});

test('desvincular algo que não está vinculado devolve 404', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Nunca vinculado');

    const resposta = await request(
      app,
      'DELETE',
      `/api/admin/clients/${cliente.id}/projects/${projetoId}`,
      { token: admin.token }
    );
    assert.equal(resposta.status, 404);
  } finally {
    close();
  }
});

test('ids inexistentes devolvem 404, não erro de banco', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Real');

    const clienteFantasma = await request(app, 'POST', '/api/admin/clients/99999/projects', {
      token: admin.token,
      body: { projectId: projetoId },
    });
    assert.equal(clienteFantasma.status, 404);

    const projetoFantasma = await request(
      app,
      'POST',
      `/api/admin/clients/${cliente.id}/projects`,
      { token: admin.token, body: { projectId: 99999 } }
    );
    assert.equal(projetoFantasma.status, 404);

    /* Nenhum vínculo órfão pode ter sido criado. */
    const total = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM client_projects');
    assert.equal(Number(total.t), 0);
  } finally {
    close();
  }
});

test('não é possível vincular projeto a um administrador', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const outroAdmin = await createAdmin(ctx, app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto do Admin');

    const resposta = await request(app, 'POST', `/api/admin/clients/${outroAdmin.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });

    assert.equal(resposta.status, 404, 'a rota é de clientes, não de admins');
  } finally {
    close();
  }
});

test('id malicioso no vínculo é recusado antes do banco', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);

    for (const id of ["1 OR 1=1", "1'--", 'abc', '-1', '0']) {
      const resposta = await request(app, 'POST', `/api/admin/clients/${id}/projects`, {
        token: admin.token,
        body: { projectId: 1 },
      });
      assert.ok(
        resposta.status === 400 || resposta.status === 404,
        `id "${id}" deveria ser recusado, veio ${resposta.status}`
      );
    }

    /* projectId malicioso no corpo também. */
    const corpo = await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: "1; DROP TABLE projects" },
    });
    assert.equal(corpo.status, 400);

    const tabelas = await ctx.db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    );
    assert.equal(tabelas.length, 1, 'a tabela precisa continuar existindo');
  } finally {
    close();
  }
});

test('cliente não acessa as rotas de vínculo', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const ana = await createClient(app, { email: 'ana@teste.com' });
    const bruno = await createClient(app, { email: 'bruno@teste.com' });
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Protegido');

    /* Ana tentando ver a ficha do Bruno. */
    const ficha = await request(app, 'GET', `/api/admin/clients/${bruno.id}`, {
      token: ana.token,
    });
    assert.equal(ficha.status, 403);

    /* Ana tentando vincular um projeto a si mesma. */
    const vinculo = await request(app, 'POST', `/api/admin/clients/${ana.id}/projects`, {
      token: ana.token,
      body: { projectId: projetoId },
    });
    assert.equal(vinculo.status, 403);

    /* Ana tentando desvincular. */
    const remocao = await request(
      app,
      'DELETE',
      `/api/admin/clients/${bruno.id}/projects/${projetoId}`,
      { token: ana.token }
    );
    assert.equal(remocao.status, 403);

    /* E sem sessão nenhuma. */
    const semSessao = await request(app, 'GET', `/api/admin/clients/${ana.id}`);
    assert.equal(semSessao.status, 401);
  } finally {
    close();
  }
});

test('a ficha do cliente traz tudo em uma chamada', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app, { email: 'marina@padaria.com' });
    const vinculado = await criarProjeto(app, admin.token, 'Projeto Vinculado');
    await criarProjeto(app, admin.token, 'Projeto Solto');

    await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: vinculado },
    });
    await request(app, 'POST', '/api/me/requests', {
      token: cliente.token,
      body: { type: 'Site', description: 'Uma descrição suficientemente longa.' },
    });

    const ficha = await request(app, 'GET', `/api/admin/clients/${cliente.id}`, {
      token: admin.token,
    });

    assert.equal(ficha.status, 200);
    assert.equal(ficha.body.client.email, 'marina@padaria.com');
    assert.equal(ficha.body.linkedProjects.length, 1);
    assert.equal(ficha.body.availableProjects.length, 1, 'o já vinculado sai da lista');
    assert.equal(ficha.body.availableProjects[0].title, 'Projeto Solto');
    assert.equal(ficha.body.requests.length, 1);

    /* A ficha não pode expor hash de senha. */
    assert.ok(!JSON.stringify(ficha.body).includes('scrypt$'));
    assert.ok(!('password_hash' in ficha.body.client));
  } finally {
    close();
  }
});

test('excluir o projeto remove o vínculo e some do painel do cliente', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Que Será Excluído');

    await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });

    await request(app, 'DELETE', `/api/admin/projects/${projetoId}`, { token: admin.token });

    const doCliente = await request(app, 'GET', '/api/me/projects', { token: cliente.token });
    assert.deepEqual(doCliente.body.projects, [], 'o vínculo cai junto (ON DELETE CASCADE)');

    const total = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM client_projects');
    assert.equal(Number(total.t), 0);
  } finally {
    close();
  }
});

test('a auditoria registra vínculo e desvínculo sem dado sensível', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const projetoId = await criarProjeto(app, admin.token, 'Projeto Auditado');

    await request(app, 'POST', `/api/admin/clients/${cliente.id}/projects`, {
      token: admin.token,
      body: { projectId: projetoId },
    });
    await request(app, 'DELETE', `/api/admin/clients/${cliente.id}/projects/${projetoId}`, {
      token: admin.token,
    });

    const auditoria = await request(app, 'GET', '/api/admin/audit', {
      token: admin.token,
      query: { limit: '50' },
    });
    const acoes = auditoria.body.logs.map((log) => log.action);

    assert.ok(acoes.includes('PROJETO_VINCULADO'));
    assert.ok(acoes.includes('PROJETO_DESVINCULADO'));
    assert.ok(!JSON.stringify(auditoria.body).includes('scrypt$'));
  } finally {
    close();
  }
});
