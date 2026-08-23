/* =========================================================================
   Visitas do site.

   Só grava quem aceitou os cookies — a checagem do consentimento fica no
   serviço, e este arquivo cuida apenas do SQL.

   O que NUNCA entra aqui: endereço IP em claro, nome, e-mail, identificador
   de sessão da área do cliente. As colunas `visitor_hash` e `ip_hash` são
   resumos, não endereços.
   ========================================================================= */

/**
 * Recortes permitidos no relatório. Um mapa fechado porque o valor vira nome
 * de coluna no GROUP BY: é o único trecho interpolado do arquivo, e ele
 * precisa ficar fora do alcance de qualquer texto vindo de fora.
 */
const DIMENSIONS = Object.freeze({
  country: 'country',
  city: 'city',
  region: 'region',
  referrer: 'referrer_host',
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  device: 'device',
  browser: 'browser',
  os: 'os',
  language: 'language',
  path: 'path',
});

export const ANALYTICS_DIMENSIONS = Object.freeze(Object.keys(DIMENSIONS));

/** Um dia em milissegundos — o divisor que agrupa a série diária. */
const DAY_MS = 86400000;

export function analyticsRepository(db) {
  return {
    async record(visit) {
      await db.execute(
        `INSERT INTO site_visits
           (visitor_hash, session_hash, path, referrer, referrer_host,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            country, region, city, timezone, edge_colo,
            device, browser, os, language,
            screen_width, screen_height, ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          visit.visitorHash,
          visit.sessionHash,
          visit.path,
          visit.referrer,
          visit.referrerHost,
          visit.utmSource,
          visit.utmMedium,
          visit.utmCampaign,
          visit.utmTerm,
          visit.utmContent,
          visit.country,
          visit.region,
          visit.city,
          visit.timezone,
          visit.edgeColo,
          visit.device,
          visit.browser,
          visit.os,
          visit.language,
          visit.screenWidth,
          visit.screenHeight,
          visit.ipHash,
          visit.createdAt,
        ]
      );
    },

    async totals({ since, until }) {
      const row = await db.queryOne(
        `SELECT COUNT(*) AS visits,
                COUNT(DISTINCT visitor_hash) AS visitors,
                COUNT(DISTINCT session_hash) AS sessions
           FROM site_visits
          WHERE created_at >= ? AND created_at < ?`,
        [since, until]
      );
      return {
        visits: Number(row?.visits ?? 0),
        visitors: Number(row?.visitors ?? 0),
        sessions: Number(row?.sessions ?? 0),
      };
    },

    /**
     * Ranking por um dos recortes permitidos. Linhas sem o dado ficam de fora:
     * uma fatia gigante de "(desconhecido)" não ajuda a decidir nada.
     */
    async ranking(dimension, { since, until, limit = 10 }) {
      const column = DIMENSIONS[dimension];
      if (!column) return [];

      const rows = await db.query(
        `SELECT ${column} AS label,
                COUNT(*) AS visits,
                COUNT(DISTINCT visitor_hash) AS visitors
           FROM site_visits
          WHERE created_at >= ? AND created_at < ?
            AND ${column} IS NOT NULL AND ${column} <> ''
          GROUP BY ${column}
          ORDER BY COUNT(*) DESC, ${column} ASC
          LIMIT ?`,
        [since, until, limit]
      );

      return rows.map((row) => ({
        label: row.label,
        visits: Number(row.visits ?? 0),
        visitors: Number(row.visitors ?? 0),
      }));
    },

    /**
     * Série por dia. A divisão inteira do epoch pelo tamanho do dia funciona
     * igual nos dois bancos e evita depender de função de data de cada um.
     */
    async daily({ since, until }) {
      const rows = await db.query(
        `SELECT (created_at / ${DAY_MS}) AS day_bucket,
                COUNT(*) AS visits,
                COUNT(DISTINCT visitor_hash) AS visitors
           FROM site_visits
          WHERE created_at >= ? AND created_at < ?
          GROUP BY (created_at / ${DAY_MS})
          ORDER BY 1 ASC`,
        [since, until]
      );

      return rows.map((row) => ({
        date: new Date(Number(row.day_bucket) * DAY_MS).toISOString().slice(0, 10),
        visits: Number(row.visits ?? 0),
        visitors: Number(row.visitors ?? 0),
      }));
    },

    /** Últimas visitas, para conferir se a coleta está de pé. */
    async recent({ limit = 20 }) {
      const rows = await db.query(
        `SELECT path, referrer_host, country, region, city, device, browser,
                utm_source, utm_campaign, created_at
           FROM site_visits
          ORDER BY created_at DESC
          LIMIT ?`,
        [limit]
      );
      return rows;
    },

    async deleteOlderThan(timestamp) {
      await db.execute('DELETE FROM site_visits WHERE created_at <= ?', [timestamp]);
    },
  };
}
