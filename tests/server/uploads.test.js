/* =========================================================================
   Upload de imagem no chat: funcionamento e tentativas de abuso.
   Upload é o vetor clássico — cada teste aqui é um ataque real.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp, createAdmin, createClient, request } from './helpers.js';
import { LIMITS } from '../../server/config.js';
import {
  detectarTipoReal,
  limparNomeArquivo,
} from '../../server/security/imageValidation.js';

/* PNG 1x1 de verdade (com a assinatura correta nos primeiros bytes). */
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const b64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');

async function abrirSolicitacao(app, token) {
  const r = await request(app, 'POST', '/api/me/requests', {
    token,
    body: { type: 'Site', description: 'Uma descrição suficientemente longa.' },
  });
  return r.body.request.id;
}

/* ------------------------------------------------ detecção por assinatura */

test('detecta o tipo pelos bytes, não pela extensão', () => {
  assert.equal(detectarTipoReal(Buffer.from(PNG_1X1, 'base64')).mime, 'image/png');
  assert.equal(detectarTipoReal(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).mime, 'image/jpeg');
  assert.equal(detectarTipoReal(Buffer.from('GIF89a')).mime, 'image/gif');
  assert.equal(detectarTipoReal(Buffer.from('<html><script>')), null);
  assert.equal(detectarTipoReal(Buffer.from('%PDF-1.4')), null);
  assert.equal(detectarTipoReal(Buffer.alloc(0)), null);
});

test('nome de arquivo é higienizado', () => {
  assert.equal(limparNomeArquivo('logo.png', 'png'), 'logo.png');
  assert.equal(limparNomeArquivo('../../etc/passwd', 'png'), 'passwd');
  assert.equal(limparNomeArquivo('<img onerror=x>.png', 'png'), 'img onerrorx.png');
  assert.equal(limparNomeArquivo('', 'png'), 'imagem.png');
  assert.equal(limparNomeArquivo('..', 'png'), 'imagem.png');
  assert.ok(limparNomeArquivo('a'.repeat(500), 'png').length <= 80);
});

/* --------------------------------------------------------- caminho feliz */

test('envia imagem e ela aparece na conversa', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: {
        body: 'Segue a logo da empresa',
        image: { dataBase64: PNG_1X1, filename: 'logo.png' },
      },
    });

    assert.equal(envio.status, 201);
    assert.equal(envio.body.message.attachments.length, 1);
    assert.equal(envio.body.message.attachments[0].mime, 'image/png');
    assert.equal(envio.body.message.attachments[0].filename, 'logo.png');

    const conversa = await request(app, 'GET', `/api/requests/${id}/messages`, {
      token: cliente.token,
    });
    assert.equal(conversa.body.messages[0].attachments.length, 1);
    assert.match(conversa.body.messages[0].attachments[0].url, /^\/api\/attachments\/\d+$/);
  } finally {
    close();
  }
});

test('mensagem só com imagem é aceita (texto opcional)', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'so-a-foto.png' } },
    });

    assert.equal(envio.status, 201);
    assert.equal(envio.body.message.body, '');
    assert.equal(envio.body.message.attachments.length, 1);
  } finally {
    close();
  }
});

test('mensagem sem texto e sem imagem continua recusada', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const vazia = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { body: '   ' },
    });
    assert.equal(vazia.status, 400);
  } finally {
    close();
  }
});

test('o download devolve os bytes com o tipo correto e nosniff', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'logo.png' } },
    });
    const anexoId = envio.body.message.attachments[0].id;

    const download = await request(app, 'GET', `/api/attachments/${anexoId}`, {
      token: cliente.token,
    });

    assert.equal(download.status, 200);
    assert.equal(download.isRaw, true);
    assert.equal(download.headers['Content-Type'], 'image/png');
    assert.equal(download.headers['X-Content-Type-Options'], 'nosniff');
    assert.match(download.headers['Cache-Control'], /private/);
    assert.ok(Buffer.isBuffer(download.buffer));
    assert.deepEqual(download.buffer, Buffer.from(PNG_1X1, 'base64'));
  } finally {
    close();
  }
});

/* --------------------------------------------------------------- ataques */

test('arquivo HTML disfarçado de imagem é recusado', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const disfarces = [
      { conteudo: '<html><script>alert(document.cookie)</script></html>', nome: 'xss.png' },
      { conteudo: '<svg onload="alert(1)"></svg>', nome: 'imagem.svg' },
      { conteudo: '%PDF-1.4 fake', nome: 'doc.png' },
      { conteudo: '#!/bin/sh\nrm -rf /', nome: 'script.jpg' },
      { conteudo: 'GIF', nome: 'curto.gif' }, // assinatura incompleta
    ];

    for (const { conteudo, nome } of disfarces) {
      const resposta = await request(app, 'POST', `/api/requests/${id}/messages`, {
        token: cliente.token,
        body: { body: 'olha isso', image: { dataBase64: b64(conteudo), filename: nome } },
      });

      assert.equal(resposta.status, 400, `deveria recusar: ${nome}`);
      assert.match(resposta.body.message, /Formato não aceito|imagem válida/);
    }

    /* Nenhum anexo gravado e nenhuma mensagem órfã. */
    const anexos = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM attachments');
    const mensagens = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM messages');
    assert.equal(Number(anexos.t), 0);
    assert.equal(Number(mensagens.t), 0, 'mensagem não pode sobrar sem a imagem');
  } finally {
    close();
  }
});

test('imagem acima do limite é recusada', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    /* PNG válido, porém grande demais. */
    const cabecalho = Buffer.from(PNG_1X1, 'base64');
    const gigante = Buffer.concat([
      cabecalho,
      Buffer.alloc(LIMITS.UPLOAD_MAX_BYTES + 1024, 0x41),
    ]);

    const resposta = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: {
        body: 'foto grande',
        image: { dataBase64: gigante.toString('base64'), filename: 'grande.png' },
      },
    });

    assert.equal(resposta.status, 400);
    assert.match(resposta.body.message, /limite/i);
  } finally {
    close();
  }
});

test('base64 inválido não derruba o servidor', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    for (const valor of ['isso não é base64!!!', '', null, 123, {}, []]) {
      const resposta = await request(app, 'POST', `/api/requests/${id}/messages`, {
        token: cliente.token,
        body: { body: 'oi', image: { dataBase64: valor, filename: 'x.png' } },
      });
      assert.ok(
        resposta.status === 400 || resposta.status === 201,
        `status inesperado: ${resposta.status}`
      );
      assert.notEqual(resposta.status, 500, 'nunca pode ser erro interno');
    }
  } finally {
    close();
  }
});

test('cliente não baixa imagem de conversa alheia (IDOR)', async () => {
  const { app, close } = await createTestApp();
  try {
    const ana = await createClient(app, { email: 'ana@teste.com' });
    const bruno = await createClient(app, { email: 'bruno@teste.com' });

    const id = await abrirSolicitacao(app, ana.token);
    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: ana.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'privado.png' } },
    });
    const anexoId = envio.body.message.attachments[0].id;

    const tentativa = await request(app, 'GET', `/api/attachments/${anexoId}`, {
      token: bruno.token,
    });
    assert.equal(tentativa.status, 404, 'não pode nem confirmar que existe');

    const semSessao = await request(app, 'GET', `/api/attachments/${anexoId}`);
    assert.equal(semSessao.status, 401);
  } finally {
    close();
  }
});

test('admin consegue baixar a imagem do cliente', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const admin = await createAdmin(ctx, app);
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'logo.png' } },
    });

    const download = await request(
      app,
      'GET',
      `/api/attachments/${envio.body.message.attachments[0].id}`,
      { token: admin.token }
    );
    assert.equal(download.status, 200);
  } finally {
    close();
  }
});

test('anexo inexistente devolve 404', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const resposta = await request(app, 'GET', '/api/attachments/99999', {
      token: cliente.token,
    });
    assert.equal(resposta.status, 404);
  } finally {
    close();
  }
});

test('excluir a mensagem leva o anexo junto', async () => {
  const { app, ctx, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    const envio = await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'logo.png' } },
    });

    await ctx.db.execute('DELETE FROM messages WHERE id = ?', [envio.body.message.id]);

    const restantes = await ctx.db.queryOne('SELECT COUNT(*) AS t FROM attachments');
    assert.equal(Number(restantes.t), 0, 'ON DELETE CASCADE deve limpar');
  } finally {
    close();
  }
});

test('a listagem da conversa não devolve os bytes da imagem', async () => {
  const { app, close } = await createTestApp();
  try {
    const cliente = await createClient(app);
    const id = await abrirSolicitacao(app, cliente.token);

    await request(app, 'POST', `/api/requests/${id}/messages`, {
      token: cliente.token,
      body: { image: { dataBase64: PNG_1X1, filename: 'logo.png' } },
    });

    const conversa = await request(app, 'GET', `/api/requests/${id}/messages`, {
      token: cliente.token,
    });

    const texto = JSON.stringify(conversa.body);
    assert.ok(!texto.includes('content'), 'os bytes não podem vir na listagem');
    assert.ok(!texto.includes(PNG_1X1.slice(0, 40)));
  } finally {
    close();
  }
});
