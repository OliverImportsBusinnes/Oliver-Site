/* Servidor estático: fallback da SPA, decodificação do caminho e leitura do corpo. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { caminhoEstatico, lerCorpo, statusDaSpa } from '../../server/http/static.js';
import { applySeo } from '../../shared/seo.js';

const DIST = resolve('/tmp/dist-teste');

/* ---- 3. fallback da SPA ---- */

test('caminho com extensão que não existe dá 404; rota do React dá 200', () => {
  assert.equal(statusDaSpa('/assets/x.js'), 404);
  assert.equal(statusDaSpa('/favicon.ico'), 404);
  assert.equal(statusDaSpa('/foo.png'), 404);
  assert.equal(statusDaSpa('/comprar'), 200);
  assert.equal(statusDaSpa('/'), 200);
  assert.equal(statusDaSpa('/obrigado'), 200);
  assert.equal(statusDaSpa('/admin/projetos'), 200);
});

test('rota que o seoFor não conhece sai com 404 (HTML da SPA continua servido)', () => {
  assert.equal(statusDaSpa('/nao-existe'), 404);
  assert.equal(statusDaSpa('/comprar/lixo'), 404);
});

/* ---- 12. decodeURIComponent ---- */

test('caminhoEstatico devolve undefined (400) para percent-encoding inválido', () => {
  assert.equal(caminhoEstatico(DIST, '/%E0%A4%A'), undefined);
  assert.equal(caminhoEstatico(DIST, '/%'), undefined);
});

test('caminhoEstatico bloqueia travessia e aceita caminho normal', () => {
  /* `normalize` colapsa o `..` na raiz: o resultado nunca sai de dist. */
  const preso = caminhoEstatico(DIST, '/..%2f..%2fetc/passwd');
  assert.ok(preso === null || preso.startsWith(DIST));
  assert.equal(caminhoEstatico(DIST, '/assets/a.js'), resolve(DIST, 'assets/a.js'));
});

/* ---- 11. lerCorpo ---- */

test('lerCorpo junta Buffers e decodifica UTF-8 no fim', async () => {
  const bytes = Buffer.from('{"nome":"ação ✓"}', 'utf8');
  /* Corta no meio de um caractere multibyte: com `+=` de chunks isto corrompe. */
  const req = Readable.from([bytes.subarray(0, 10), bytes.subarray(10)]);
  const r = await lerCorpo(req, 1000);
  assert.equal(r.tooLarge, false);
  assert.equal(r.body, '{"nome":"ação ✓"}');
});

test('lerCorpo acima do limite em BYTES devolve tooLarge sem ficar pendurado', async () => {
  const req = Readable.from([Buffer.from('ã'.repeat(30))]); // 60 bytes, 30 caracteres
  const r = await Promise.race([
    lerCorpo(req, 40),
    new Promise((_, rej) => setTimeout(() => rej(new Error('pendurado')), 1000)),
  ]);
  assert.equal(r.tooLarge, true);
});

/* ---- 4. applySeo ---- */

const HTML =
  '<html><head><title>x</title><link rel="canonical" href="https://s.exemplo" /></head><body></body></html>';

test('applySeo não é corrompido por $ e $& no caminho e escapa atributo', () => {
  const out = applySeo(HTML, '/a$\'b$&c"><x');
  assert.ok(
    out.includes('<link rel="canonical" href="https://s.exemplo/a$&#39;b$&amp;c&quot;&gt;&lt;x" />'),
    out
  );
  assert.equal((out.match(/<\/head>/g) ?? []).length, 1);
  assert.doesNotMatch(out, /"><x/);
});
