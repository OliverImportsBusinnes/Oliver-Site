/* Agrupamento das mensagens por dia — a lógica que separa a conversa em
   "Hoje", "Ontem" e datas anteriores. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparPorDia,
  chaveDoDia,
  rotuloDoDia,
} from '../src/components/chat/datas.js';

/* Referência fixa para o teste não depender do dia em que roda. */
const HOJE = new Date(2026, 7, 11, 15, 0, 0).getTime(); // 11/08/2026 15h
const ONTEM = new Date(2026, 7, 10, 9, 30, 0).getTime();
const SEMANA_PASSADA = new Date(2026, 7, 4, 18, 0, 0).getTime();

const mensagem = (id, created_at, author_id = 1) => ({
  id,
  created_at,
  author_id,
  body: `mensagem ${id}`,
});

test('chaveDoDia usa o fuso local e ignora a hora', () => {
  const manha = new Date(2026, 7, 11, 0, 5, 0).getTime();
  const noite = new Date(2026, 7, 11, 23, 55, 0).getTime();

  assert.equal(chaveDoDia(manha), '2026-08-11');
  assert.equal(chaveDoDia(manha), chaveDoDia(noite), 'mesmo dia, mesma chave');
});

test('rótulo diferencia hoje, ontem e datas anteriores', () => {
  assert.equal(rotuloDoDia(HOJE, HOJE), 'Hoje');
  assert.equal(rotuloDoDia(ONTEM, HOJE), 'Ontem');
  assert.match(rotuloDoDia(SEMANA_PASSADA, HOJE), /agosto/);
});

test('"ontem" funciona na virada do mês', () => {
  const primeiroDeAgosto = new Date(2026, 7, 1, 10, 0, 0).getTime();
  const trintaEUmDeJulho = new Date(2026, 6, 31, 22, 0, 0).getTime();

  assert.equal(rotuloDoDia(trintaEUmDeJulho, primeiroDeAgosto), 'Ontem');
});

test('agrupa mensagens do mesmo dia em um bloco só', () => {
  const grupos = agruparPorDia(
    [
      mensagem(1, ONTEM),
      mensagem(2, ONTEM + 60_000),
      mensagem(3, HOJE),
      mensagem(4, HOJE + 60_000),
      mensagem(5, HOJE + 120_000),
    ],
    HOJE
  );

  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].rotulo, 'Ontem');
  assert.equal(grupos[0].mensagens.length, 2);
  assert.equal(grupos[1].rotulo, 'Hoje');
  assert.equal(grupos[1].mensagens.length, 3);
});

test('preserva a ordem cronológica recebida', () => {
  const grupos = agruparPorDia(
    [mensagem(1, SEMANA_PASSADA), mensagem(2, ONTEM), mensagem(3, HOJE)],
    HOJE
  );

  assert.deepEqual(
    grupos.map((g) => g.rotulo),
    [rotuloDoDia(SEMANA_PASSADA, HOJE), 'Ontem', 'Hoje']
  );
  assert.deepEqual(
    grupos.flatMap((g) => g.mensagens.map((m) => m.id)),
    [1, 2, 3]
  );
});

test('lista vazia não quebra', () => {
  assert.deepEqual(agruparPorDia([], HOJE), []);
  assert.deepEqual(agruparPorDia(undefined, HOJE), []);
});

test('mensagem única gera um grupo', () => {
  const grupos = agruparPorDia([mensagem(1, HOJE)], HOJE);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].mensagens.length, 1);
});
