/* Testes da validação de URLs — a defesa contra XSS armazenado que passa a
   importar quando os links vierem do painel administrativo (Fase 2). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl } from '../src/utils/url.js';

test('aceita URLs http e https', () => {
  assert.equal(safeUrl('https://exemplo.com'), 'https://exemplo.com');
  assert.equal(safeUrl('http://exemplo.com/a?b=1'), 'http://exemplo.com/a?b=1');
});

test('aceita mailto e caminho relativo', () => {
  assert.equal(safeUrl('mailto:a@b.com'), 'mailto:a@b.com');
  assert.equal(safeUrl('/projetos/erp'), '/projetos/erp');
});

test('bloqueia javascript: em todas as variações', () => {
  const payloads = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'JAVASCRIPT:alert(document.cookie)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'javascript:void(0)',
  ];

  for (const payload of payloads) {
    assert.equal(safeUrl(payload), null, `deveria bloquear: ${payload}`);
  }
});

test('bloqueia data:, vbscript: e file:', () => {
  assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeUrl('vbscript:msgbox(1)'), null);
  assert.equal(safeUrl('file:///etc/passwd'), null);
});

test('trata entradas inválidas sem lançar exceção', () => {
  assert.equal(safeUrl(null), null);
  assert.equal(safeUrl(undefined), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl('   '), null);
  assert.equal(safeUrl(42), null);
  assert.equal(safeUrl({}), null);
});
