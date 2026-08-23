/* =========================================================================
   Origem de quem visita o site.

   Duas regras que valem para tudo aqui:

   1. Sem consentimento, nada é gravado. O navegador só chama esta rota
      depois de a pessoa clicar em "Aceitar" no aviso de cookies, e o
      servidor confere o campo `consent` mesmo assim — a checagem do
      navegador é conveniência, esta é a que vale.

   2. Endereço IP nunca é gravado. Dele saem duas coisas: o país/cidade que a
      borda (Cloudflare, Netlify, Vercel) já resolveu, e um resumo com sal do
      servidor que serve só para separar visitantes distintos.
   ========================================================================= */

import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { badRequest, forbidden } from '../http/errors.js';
import { ANALYTICS_DIMENSIONS } from '../repositories/analytics.js';

const DAY_MS = 86400000;

/** Recorte máximo do relatório: um ano e um mês. */
const MAX_REPORT_DAYS = 400;

/** Quantas linhas cada ranking devolve. */
const RANKING_LIMIT = 12;

export function analyticsService(ctx) {
  /** Descarta visitas antigas conforme a retenção configurada. */
  async function purge(now = Date.now()) {
    const days = Number.isFinite(config.analytics.retentionDays)
      ? config.analytics.retentionDays
      : 400;
    await ctx.analytics.deleteOlderThan(now - Math.max(days, 1) * DAY_MS);
  }

  return {
    /**
     * Registra uma página aberta. Devolve `{ recorded: false }` quando não há
     * consentimento — sem erro, porque recusar cookies é uma resposta válida
     * e não deve aparecer como falha no navegador de quem recusou.
     */
    async record(input, headers = {}) {
      if (input?.consent !== true) {
        return { recorded: false, reason: 'SEM_CONSENTIMENTO' };
      }

      const path = cleanPath(input.path);
      if (!path) throw badRequest('Caminho inválido.');

      const visitorHash = hashOpaque(input.visitorId, 'visitor');
      const sessionHash = hashOpaque(input.sessionId ?? input.visitorId, 'session');
      if (!visitorHash || !sessionHash) {
        throw badRequest('Identificador de visita inválido.');
      }

      const geo = readGeo(headers);
      const agent = parseUserAgent(headers['user-agent']);
      const referrer = cleanUrl(input.referrer);

      await ctx.analytics.record({
        visitorHash,
        sessionHash,
        path,
        referrer,
        referrerHost: hostOf(referrer),
        utmSource: cleanTag(input.utmSource),
        utmMedium: cleanTag(input.utmMedium),
        utmCampaign: cleanTag(input.utmCampaign),
        utmTerm: cleanTag(input.utmTerm),
        utmContent: cleanTag(input.utmContent),
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone ?? cleanTag(input.timezone, 60),
        edgeColo: geo.colo,
        device: agent.device,
        browser: agent.browser,
        os: agent.os,
        language: cleanTag(input.language, 20) ?? languageOf(headers['accept-language']),
        screenWidth: clampNumber(input.screenWidth, 0, 20000),
        screenHeight: clampNumber(input.screenHeight, 0, 20000),
        ipHash: hashIp(clientIp(headers)),
        createdAt: Date.now(),
      });

      return { recorded: true };
    },

    /**
     * Panorama do período: totais, série diária e os rankings que respondem
     * "de onde veio essa gente e o que ela é".
     */
    async report({ days = 30 } = {}) {
      const window = Math.min(
        Math.max(Number.isFinite(Number(days)) ? Math.trunc(Number(days)) : 30, 1),
        MAX_REPORT_DAYS
      );
      const until = Date.now();
      const since = until - window * DAY_MS;

      /* Aproveita a visita do administrador para aplicar a retenção, no mesmo
         espírito da limpeza de sessões vencidas no login: é um DELETE indexado,
         acontece raramente e evita depender de um agendador que este projeto
         não tem. Falhar aqui não pode esconder o relatório. */
      try {
        await purge(until);
      } catch (error) {
        console.error('[analytics] limpeza de visitas antigas falhou:', error?.message);
      }

      const [totals, daily] = await Promise.all([
        ctx.analytics.totals({ since, until }),
        ctx.analytics.daily({ since, until }),
      ]);

      const rankings = {};
      for (const dimension of ANALYTICS_DIMENSIONS) {
        rankings[dimension] = await ctx.analytics.ranking(dimension, {
          since,
          until,
          limit: RANKING_LIMIT,
        });
      }

      return {
        window: { days: window, since, until },
        totals,
        daily,
        rankings,
      };
    },

    /**
     * Autoriza a leitura servidor-a-servidor. Só passa com a chave exata
     * configurada; sem `ANALYTICS_READ_KEY` definida a porta fica fechada, em
     * vez de aberta a todos.
     */
    assertReadKey(headers = {}) {
      const expected = config.analytics.readKey;
      const received = headers['x-analytics-key'];
      if (!expected || typeof received !== 'string' || !timingSafeEqual(received, expected)) {
        throw forbidden('Chave de leitura inválida.');
      }
    },

    purge,
  };
}

/* ------------------------------------------------------------- geografia */

/**
 * País, região e cidade que a borda já resolveu. Cada provedor usa cabeçalhos
 * próprios, então os três formatos conhecidos são tentados em ordem; o que
 * não vier fica nulo, e não adivinhado.
 */
export function readGeo(headers = {}) {
  const cloudflare = {
    country: cleanTag(headers['cf-ipcountry'], 2),
    region: cleanTag(headers['cf-region'], 80),
    city: cleanTag(headers['cf-ipcity'], 120),
    timezone: cleanTag(headers['cf-timezone'], 60),
    /* O sufixo do CF-Ray é o datacenter que atendeu (…-GRU = São Paulo).
       Serve como pista grosseira de região quando cf-ipcity não vem. */
    colo: coloOf(headers['cf-ray']),
  };
  if (cloudflare.country) return cloudflare;

  const netlify = readNetlifyGeo(headers['x-nf-geo']);
  if (netlify?.country) return { ...netlify, colo: null };

  const vercelCountry = cleanTag(headers['x-vercel-ip-country'], 2);
  if (vercelCountry) {
    return {
      country: vercelCountry,
      region: cleanTag(headers['x-vercel-ip-country-region'], 80),
      city: decodeMaybe(cleanTag(headers['x-vercel-ip-city'], 120)),
      timezone: cleanTag(headers['x-vercel-ip-timezone'], 60),
      colo: null,
    };
  }

  return { country: null, region: null, city: null, timezone: null, colo: null };
}

/** O Netlify entrega a geolocalização como JSON em base64. */
function readNetlifyGeo(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return {
      country: cleanTag(parsed?.country?.code, 2),
      region: cleanTag(parsed?.subdivision?.name ?? parsed?.subdivision?.code, 80),
      city: cleanTag(parsed?.city, 120),
      timezone: cleanTag(parsed?.timezone, 60),
    };
  } catch {
    /* Cabeçalho malformado não pode derrubar o registro da visita. */
    return null;
  }
}

/** "7d1b2c3a4e5f6789-GRU" → "GRU". */
function coloOf(ray) {
  if (typeof ray !== 'string') return null;
  const separator = ray.lastIndexOf('-');
  if (separator < 0) return null;
  return cleanTag(ray.slice(separator + 1), 10);
}

/**
 * IP de quem chamou, na ordem em que os provedores o entregam. Usado apenas
 * para gerar o resumo — o valor em si não sai desta função.
 */
export function clientIp(headers = {}) {
  const direct =
    headers['cf-connecting-ip'] ??
    headers['x-nf-client-connection-ip'] ??
    headers['x-real-ip'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return null;
}

/* ---------------------------------------------------------- navegador */

/**
 * Aparelho, navegador e sistema a partir do User-Agent. Leitura deliberadamente
 * simples: serve para separar celular de computador num relatório, não para
 * identificar ninguém.
 */
export function parseUserAgent(userAgent) {
  const value = typeof userAgent === 'string' ? userAgent : '';
  const lower = value.toLowerCase();

  const device = /ipad|tablet|playbook|silk|kindle/.test(lower)
    ? 'tablet'
    : /mobi|iphone|ipod|windows phone|android.*mobile/.test(lower)
      ? 'celular'
      : lower === ''
        ? null
        : 'computador';

  const browser = lower.includes('edg/')
    ? 'Edge'
    : lower.includes('opr/') || lower.includes('opera')
      ? 'Opera'
      : lower.includes('firefox')
        ? 'Firefox'
        : lower.includes('chrome') || lower.includes('crios')
          ? 'Chrome'
          : lower.includes('safari')
            ? 'Safari'
            : null;

  const os = lower.includes('windows')
    ? 'Windows'
    : lower.includes('android')
      ? 'Android'
      : /iphone|ipad|ipod/.test(lower)
        ? 'iOS'
        : lower.includes('mac os')
          ? 'macOS'
          : lower.includes('linux')
            ? 'Linux'
            : null;

  return { device, browser, os };
}

function languageOf(acceptLanguage) {
  if (typeof acceptLanguage !== 'string') return null;
  const first = acceptLanguage.split(',')[0]?.split(';')[0];
  return cleanTag(first, 20);
}

/* ----------------------------------------------------------- saneamento */

/** Caminho da página, sem host, sem querystring e com tamanho limitado. */
function cleanPath(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  return withoutQuery.slice(0, 500) || '/';
}

function cleanUrl(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.slice(0, 500);
}

function hostOf(url) {
  if (!url) return null;
  try {
    return new URL(url).host.slice(0, 190) || null;
  } catch {
    return null;
  }
}

/** Texto curto de catálogo (país, campanha, navegador). */
function cleanTag(raw, max = 120) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'XX' || trimmed === 'T1') return null;
  return trimmed.slice(0, max);
}

/** Cidade do Vercel vem percent-encoded ("S%C3%A3o%20Paulo"). */
function decodeMaybe(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function clampNumber(raw, min, max) {
  const number = Number(raw);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

/* --------------------------------------------------------------- resumos */

/**
 * Resumo do identificador sorteado no navegador. Ele já é anônimo; o resumo
 * garante que nem esse valor fica guardado como veio, então recuperar o que
 * está no navegador de alguém a partir do banco não é possível.
 */
function hashOpaque(value, scope) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 100) return null;
  return createHash('sha256')
    .update(`${scope}:${salt()}:${trimmed}`)
    .digest('hex');
}

function hashIp(ip) {
  if (!ip) return null;
  return createHash('sha256').update(`ip:${salt()}:${ip}`).digest('hex');
}

/* Sem sal configurado o resumo continua sendo feito, só que sem segredo:
   é melhor do que gravar o endereço, e a configuração de produção define
   ANALYTICS_IP_SALT (ou ao menos SESSION_SECRET). */
function salt() {
  return config.analytics.ipSalt ?? 'oliver-analytics';
}

/**
 * Comparação de tamanho constante para a chave de leitura, para o tempo de
 * resposta não entregar quantos caracteres iniciais estavam certos.
 */
function timingSafeEqual(received, expected) {
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < received.length; index += 1) {
    diff |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}
