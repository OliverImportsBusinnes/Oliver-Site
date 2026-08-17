/* Roteamento da função serverless — lógica de deploy que não dá para
   validar sem o Netlify, então é validada aqui. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiPath } from '../../server/http/path.js';

test('chamada direta a /api passa intacta', () => {
  assert.equal(normalizeApiPath('/api/auth/login'), '/api/auth/login');
  assert.equal(normalizeApiPath('/api/projects'), '/api/projects');
  assert.equal(normalizeApiPath('/api/admin/clients/2/projects'), '/api/admin/clients/2/projects');
});

test('caminho vindo do redirect do Netlify é normalizado', () => {
  assert.equal(
    normalizeApiPath('/.netlify/functions/api/auth/login'),
    '/api/auth/login'
  );
  assert.equal(
    normalizeApiPath('/.netlify/functions/api/admin/clients/2/projects/1'),
    '/api/admin/clients/2/projects/1'
  );
  assert.equal(normalizeApiPath('/.netlify/functions/api'), '/api');
});

test('não confunde caminho que apenas começa parecido', () => {
  /* Sem a checagem da barra, "/api-docs" viraria "/apidocs". */
  assert.equal(normalizeApiPath('/api-docs'), '/api-docs');
  assert.equal(
    normalizeApiPath('/.netlify/functions/apiOutro/x'),
    '/.netlify/functions/apiOutro/x'
  );
});

test('entrada inválida vira raiz em vez de quebrar', () => {
  assert.equal(normalizeApiPath(''), '/');
  assert.equal(normalizeApiPath(null), '/');
  assert.equal(normalizeApiPath(undefined), '/');
  assert.equal(normalizeApiPath(42), '/');
});
