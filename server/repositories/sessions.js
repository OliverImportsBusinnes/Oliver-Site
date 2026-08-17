/* =========================================================================
   Repositório de sessões. Guarda o HASH do token, nunca o token em si.
   ========================================================================= */

export function sessionsRepository(db) {
  return {
    async create({ id, userId, expiresAt }) {
      await db.execute(
        'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [id, userId, expiresAt, Date.now()]
      );
    },

    /**
     * Busca a sessão junto com o usuário — uma consulta só.
     * (Checklist "Performance": nada de buscar sessão e depois usuário.)
     * Sessão vencida não é retornada, mesmo que ainda exista na tabela.
     */
    async findValidWithUser(id, now = Date.now()) {
      return db.queryOne(
        `SELECT s.id          AS session_id,
                s.expires_at  AS expires_at,
                u.id          AS user_id,
                u.name        AS name,
                u.company     AS company,
                u.email       AS email,
                u.role        AS role
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > ?`,
        [id, now]
      );
    },

    async delete(id) {
      await db.execute('DELETE FROM sessions WHERE id = ?', [id]);
    },

    async deleteAllForUser(userId) {
      await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    },

    /** Faxina das sessões vencidas (chamada no login). */
    async deleteExpired(now = Date.now()) {
      const { affectedRows } = await db.execute(
        'DELETE FROM sessions WHERE expires_at <= ?',
        [now]
      );
      return affectedRows;
    },
  };
}
