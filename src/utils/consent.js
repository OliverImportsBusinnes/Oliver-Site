/* =========================================================================
   Consentimento de cookies e envio da visita.
   -------------------------------------------------------------------------
   A escolha da pessoa fica no próprio navegador; nenhum cookie de rastreio é
   criado. Enquanto ela não escolher, nada é enviado — e "Recusar" continua
   valendo nas próximas visitas até que ela mude de ideia no rodapé.

   O identificador do visitante é um número sorteado aqui, sem relação com
   nome, e-mail ou sessão da área do cliente. O servidor guarda só o resumo
   dele (ver server/services/analytics.js).
   ========================================================================= */

const STORAGE_KEY = 'oi_cookie_consent';
const VISITOR_KEY = 'oi_visitor_id';
const SESSION_KEY = 'oi_visit_session';

export const CONSENT = Object.freeze({
  GRANTED: 'granted',
  DENIED: 'denied',
});

/** Versão do aviso: subir este número faz o banner voltar a aparecer. */
export const CONSENT_VERSION = 1;

/* Todo acesso a storage é protegido: navegação anônima, cookies bloqueados e
   iframes com storage particionado lançam ao ler ou escrever, e uma exceção
   aqui derrubaria a página inteira. */
function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** `null` enquanto a pessoa não escolheu. */
export function readConsent() {
  if (typeof window === 'undefined') return null;

  const raw = readStorage(window.localStorage, STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed.status === CONSENT.GRANTED || parsed.status === CONSENT.DENIED
      ? parsed.status
      : null;
  } catch {
    return null;
  }
}

export function writeConsent(status) {
  if (typeof window === 'undefined') return;
  writeStorage(
    window.localStorage,
    STORAGE_KEY,
    JSON.stringify({ status, version: CONSENT_VERSION, decidedAt: Date.now() })
  );

  /* Recusou depois de ter aceitado: o identificador guardado some junto, para
     não sobrar rastro de quem pediu para não ser acompanhado. */
  if (status === CONSENT.DENIED) {
    try {
      window.localStorage.removeItem(VISITOR_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Storage indisponível: não havia o que apagar. */
    }
  }
}

function randomId() {
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Identificador do navegador, criado na primeira visita consentida. */
function visitorId() {
  const existing = readStorage(window.localStorage, VISITOR_KEY);
  if (existing && existing.length >= 8) return existing;

  const created = randomId();
  /* Storage bloqueado: o valor sorteado ainda serve para esta visita; ela
     apenas contará como um visitante novo da próxima vez. */
  writeStorage(window.localStorage, VISITOR_KEY, created);
  return created;
}

/** Identificador da aba: some quando o navegador fecha. */
function sessionId() {
  const existing = readStorage(window.sessionStorage, SESSION_KEY);
  if (existing && existing.length >= 8) return existing;

  const created = randomId();
  writeStorage(window.sessionStorage, SESSION_KEY, created);
  return created;
}

function utmFrom(search) {
  const params = new URLSearchParams(search);
  const read = (key) => {
    const value = params.get(key);
    return value ? value.slice(0, 120) : undefined;
  };
  return {
    utmSource: read('utm_source'),
    utmMedium: read('utm_medium'),
    utmCampaign: read('utm_campaign'),
    utmTerm: read('utm_term'),
    utmContent: read('utm_content'),
  };
}

/**
 * Envia uma página aberta. Chamada só quando há consentimento; falha de rede é
 * ignorada de propósito — estatística não pode atrapalhar quem está navegando.
 */
export async function sendVisit(path) {
  if (typeof window === 'undefined') return;
  if (readConsent() !== CONSENT.GRANTED) return;

  const payload = {
    consent: true,
    path: path || window.location.pathname,
    referrer: document.referrer || undefined,
    visitorId: visitorId(),
    sessionId: sessionId(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    ...utmFrom(window.location.search),
  };

  try {
    await fetch('/api/analytics/visit', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* Sem rede, sem estatística. A pessoa não precisa saber. */
  }
}
