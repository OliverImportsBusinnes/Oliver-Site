/* =========================================================================
   Trilha de auditoria e controle de tentativas de login.

   O que NUNCA entra aqui: senha, hash de senha, token de sessão.
   ========================================================================= */

import { SECURITY } from '../config.js';

export function auditRepository(db) {
  return {
    async log({ userId = null, action, resourceType = null, resourceId = null, details = null }) {
      await db.execute(
        `INSERT INTO audit_logs
           (user_id, action, resource_type, resource_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          resourceType,
          resourceId === null ? null : String(resourceId),
          details === null ? null : JSON.stringify(details),
          Date.now(),
        ]
      );
    },

    async list({ limit, offset }) {
      return db.query(
        `SELECT a.id, a.user_id, a.action, a.resource_type, a.resource_id,
                a.details, a.created_at, u.name AS user_name
           FROM audit_logs a
           LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC
          LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    },
  };
}

export function loginAttemptsRepository(db) {
  return {
    async register(email) {
      await db.execute(
        'INSERT INTO login_attempts (email, created_at) VALUES (?, ?)',
        [email, Date.now()]
      );
    },

    /** Tentativas falhas recentes para este e-mail. */
    async countRecent(email, now = Date.now()) {
      const row = await db.queryOne(
        'SELECT COUNT(*) AS total FROM login_attempts WHERE email = ? AND created_at > ?',
        [email, now - SECURITY.LOGIN_WINDOW_MS]
      );
      return Number(row?.total ?? 0);
    },

    /** Login bem-sucedido zera o contador daquele e-mail. */
    async clear(email) {
      await db.execute('DELETE FROM login_attempts WHERE email = ?', [email]);
    },

    async deleteOlderThan(timestamp) {
      await db.execute('DELETE FROM login_attempts WHERE created_at <= ?', [timestamp]);
    },
  };
}
