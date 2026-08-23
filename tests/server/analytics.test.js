/* =========================================================================
   Visitas do site: consentimento, anonimização e relatório.

   O teste central é o primeiro: sem consentimento nada é gravado. Os demais
   confirmam que o que é gravado não identifica ninguém e que o relatório
   responde "de onde essa gente veio".
   ========================================================================= */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTestApp,
  createAdmin,
  createClient,
  request,
} from './helpers.js';
import {
  clientIp,
  parseUserAgent,
  readGeo,
} from '../../server/services/analytics.js';

const VISITA = {
  consent: true,
  path: '/',
  visitorId: 'visitante-0000000000001',
  sessionId: 'sessao-0000000000001',
};

const CABECALHOS_CLOUDFLARE = {
  'cf-ipcountry': 'BR',
  'cf-ipcity': 'Uberlândia',
  'cf-region': 'Minas Gerais',
  'cf-ray': '8f2a1b3c4d5e6789-GRU',
  'cf-connecting-ip': '203.0.113.9',
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

test('sem consentimento nada é gravado', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  const response = await request(app, 'POST', '/api/analytics/visit', {
    body: { ...VISITA, consent: false },
  });

  assert.equal(response.status, 202);
  assert.equal(response.body.recorded, false);

  const total = await ctx.db.queryOne('SELECT COUNT(*) AS total FROM site_visits');
  assert.equal(Number(total.total), 0);
});

test('consentimento ausente também não grava', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  await request(app, 'POST', '/api/analytics/visit', {
    body: { path: '/', visitorId: VISITA.visitorId },
  });

  const total = await ctx.db.queryOne('SELECT COUNT(*) AS total FROM site_visits');
  assert.equal(Number(total.total), 0);
});

test('com consentimento grava origem sem guardar o IP', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  const response = await request(app, 'POST', '/api/analytics/visit', {
    body: {
      ...VISITA,
      path: '/servicos?utm_source=instagram',
      referrer: 'https://www.instagram.com/oliverimports',
      utmSource: 'instagram',
      utmCampaign: 'lancamento',
      screenWidth: 390,
      screenHeight: 844,
    },
    headers: CABECALHOS_CLOUDFLARE,
  });

  assert.equal(response.status, 202);
  assert.equal(response.body.recorded, true);

  const linha = await ctx.db.queryOne('SELECT * FROM site_visits LIMIT 1');
  assert.equal(linha.country, 'BR');
  assert.equal(linha.city, 'Uberlândia');
  assert.equal(linha.region, 'Minas Gerais');
  assert.equal(linha.edge_colo, 'GRU');
  assert.equal(linha.referrer_host, 'www.instagram.com');
  assert.equal(linha.utm_source, 'instagram');
  assert.equal(linha.utm_campaign, 'lancamento');
  assert.equal(linha.device, 'celular');
  assert.equal(linha.os, 'iOS');
  assert.equal(linha.screen_width, 390);

  /* A querystring fica de fora do caminho: ela costuma carregar identificador
     de campanha e, às vezes, dado pessoal colado por engano. */
  assert.equal(linha.path, '/servicos');

  /* Nada de endereço nem do identificador cru do navegador. */
  const serializado = JSON.stringify(linha);
  assert.ok(!serializado.includes('203.0.113.9'), 'gravou o IP em claro');
  assert.ok(!serializado.includes(VISITA.visitorId), 'gravou o id do navegador em claro');
  assert.match(linha.ip_hash, /^[0-9a-f]{64}$/);
  assert.match(linha.visitor_hash, /^[0-9a-f]{64}$/);
});

test('caminho inválido é recusado', async (t) => {
  const { app, close } = await createTestApp();
  t.after(close);

  const response = await request(app, 'POST', '/api/analytics/visit', {
    body: { ...VISITA, path: 'https://outro-site.com/phishing' },
  });

  assert.equal(response.status, 400);
});

test('relatório resume totais, série e rankings', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  await request(app, 'POST', '/api/analytics/visit', {
    body: { ...VISITA, utmSource: 'instagram' },
    headers: CABECALHOS_CLOUDFLARE,
  });
  await request(app, 'POST', '/api/analytics/visit', {
    body: {
      ...VISITA,
      visitorId: 'visitante-0000000000002',
      sessionId: 'sessao-0000000000002',
      path: '/projetos',
      utmSource: 'instagram',
    },
    headers: CABECALHOS_CLOUDFLARE,
  });

  const admin = await createAdmin(ctx, app);
  const response = await request(app, 'GET', '/api/admin/analytics', {
    token: admin.token,
    query: { days: '7' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.totals.visits, 2);
  assert.equal(response.body.totals.visitors, 2);
  assert.equal(response.body.window.days, 7);
  assert.equal(response.body.rankings.country[0].label, 'BR');
  assert.equal(response.body.rankings.country[0].visits, 2);
  assert.equal(response.body.rankings.source[0].label, 'instagram');
  assert.ok(response.body.daily.length >= 1);
  assert.match(response.body.daily[0].date, /^\d{4}-\d{2}-\d{2}$/);
});

test('relatório é só do administrador', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  const anonimo = await request(app, 'GET', '/api/admin/analytics');
  assert.equal(anonimo.status, 401);

  const cliente = await createClient(app);
  const comoCliente = await request(app, 'GET', '/api/admin/analytics', {
    token: cliente.token,
  });
  assert.equal(comoCliente.status, 403);
});

test('leitura servidor-a-servidor exige a chave configurada', async (t) => {
  const { app, close } = await createTestApp();
  t.after(close);

  /* Sem ANALYTICS_READ_KEY no ambiente, a porta fica fechada — inclusive para
     quem manda um valor qualquer. */
  const semChave = await request(app, 'GET', '/api/analytics/report');
  assert.equal(semChave.status, 403);

  const chaveQualquer = await request(app, 'GET', '/api/analytics/report', {
    headers: { 'x-analytics-key': 'tentativa' },
  });
  assert.equal(chaveQualquer.status, 403);
});

test('gerar o relatório também aplica a retenção', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  await request(app, 'POST', '/api/analytics/visit', {
    body: VISITA,
    headers: CABECALHOS_CLOUDFLARE,
  });
  /* Uma visita de dois anos atrás, além dos 400 dias de retenção padrão. */
  await ctx.db.execute('UPDATE site_visits SET created_at = ?', [
    Date.now() - 730 * 86400000,
  ]);

  const admin = await createAdmin(ctx, app);
  const response = await request(app, 'GET', '/api/admin/analytics', {
    token: admin.token,
  });

  assert.equal(response.status, 200);
  const total = await ctx.db.queryOne('SELECT COUNT(*) AS total FROM site_visits');
  assert.equal(Number(total.total), 0);
});

test('a limpeza descarta visitas fora da retenção', async (t) => {
  const { app, ctx, close } = await createTestApp();
  t.after(close);

  await request(app, 'POST', '/api/analytics/visit', {
    body: VISITA,
    headers: CABECALHOS_CLOUDFLARE,
  });
  await ctx.db.execute('UPDATE site_visits SET created_at = ?', [1000]);

  await app.services.analytics.purge();

  const total = await ctx.db.queryOne('SELECT COUNT(*) AS total FROM site_visits');
  assert.equal(Number(total.total), 0);
});

/* --------------------------- leitura de cabeçalhos --------------------------- */

test('geolocalização do Netlify vem em base64', () => {
  const geo = readGeo({
    'x-nf-geo': Buffer.from(
      JSON.stringify({
        city: 'Curitiba',
        country: { code: 'BR', name: 'Brazil' },
        subdivision: { code: 'PR', name: 'Paraná' },
        timezone: 'America/Sao_Paulo',
      })
    ).toString('base64'),
  });

  assert.equal(geo.country, 'BR');
  assert.equal(geo.city, 'Curitiba');
  assert.equal(geo.region, 'Paraná');
});

test('cabeçalho de geolocalização quebrado não derruba a leitura', () => {
  const geo = readGeo({ 'x-nf-geo': 'nao-e-base64-valido!!' });
  assert.equal(geo.country, null);
});

test('IP sai na ordem dos provedores conhecidos', () => {
  assert.equal(clientIp({ 'cf-connecting-ip': '1.1.1.1' }), '1.1.1.1');
  assert.equal(clientIp({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }), '2.2.2.2');
  assert.equal(clientIp({}), null);
});

test('User-Agent separa computador, celular e tablet', () => {
  assert.equal(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120').device, 'computador');
  assert.equal(parseUserAgent('Mozilla/5.0 (Linux; Android 14) Mobile Safari').device, 'celular');
  assert.equal(parseUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0) Safari').device, 'tablet');
  assert.equal(parseUserAgent('').device, null);
});
