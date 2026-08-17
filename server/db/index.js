/* =========================================================================
   Escolha do banco.

   O resto da aplicação nunca sabe qual driver está ativo: importa `getDb()`
   e usa sempre a mesma interface (query / queryOne / execute / transaction).
   ========================================================================= */

import { config } from '../config.js';
import { createPostgresDriver } from './postgres.js';

let instance = null;

/* Import dinâmico, pelo mesmo motivo que o `pg` é carregado sob demanda: em
   produção o driver é o PostgreSQL, e um import estático faria o servidor
   carregar `node:sqlite` — módulo ainda experimental — a cada boot. Além do
   aviso no log, isso amarraria a produção a uma versão do Node que talvez nem
   tenha o módulo. */
const carregarSqlite = async () =>
  (await import('./sqlite.js')).createSqliteDriver;

/** Instância única por processo (reaproveita o pool entre requisições). */
export async function getDb() {
  if (instance) return instance;

  instance =
    config.driver === 'postgres'
      ? await createPostgresDriver(config.postgres)
      : (await carregarSqlite())({ file: config.sqliteFile });

  return instance;
}

/** Usado pelos testes: banco em memória, isolado e descartável. */
export async function createTestDb() {
  return (await carregarSqlite())({ file: ':memory:' });
}

/** Troca a instância global (testes). */
export function setDb(db) {
  instance = db;
}

export async function closeDb() {
  if (!instance) return;
  await instance.close();
  instance = null;
}
