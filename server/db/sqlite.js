/* =========================================================================
   Driver SQLite — desenvolvimento e testes.
   Usa o módulo `node:sqlite`, embutido no Node 22+: nenhuma dependência.
   ========================================================================= */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeParams, toNumber } from './normalize.js';

const SCHEMA_PATH = resolve(import.meta.dirname, 'schema.sqlite.sql');

export function createSqliteDriver({ file = ':memory:' } = {}) {
  if (file !== ':memory:') mkdirSync(dirname(resolve(file)), { recursive: true });

  const db = new DatabaseSync(file);

  /* Integridade referencial não é ligada por padrão no SQLite. */
  db.exec('PRAGMA foreign_keys = ON');

  return {
    dialect: 'sqlite',

    /** Cria as tabelas (idempotente). */
    async init() {
      db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
    },

    async query(sql, params = []) {
      return db.prepare(sql).all(...normalizeParams(params));
    },

    async queryOne(sql, params = []) {
      const rows = db.prepare(sql).all(...normalizeParams(params));
      return rows[0] ?? null;
    },

    async execute(sql, params = []) {
      const result = db.prepare(sql).run(...normalizeParams(params));
      return {
        insertId: toNumber(result.lastInsertRowid),
        affectedRows: toNumber(result.changes),
      };
    },

    /** Transação: reverte tudo se a função lançar. */
    async transaction(run) {
      db.exec('BEGIN');
      try {
        const result = await run(this);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    async close() {
      db.close();
    },
  };
}
