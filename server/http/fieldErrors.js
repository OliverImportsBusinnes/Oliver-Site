/**
 * Erros por campo vindos da API de licenciamento, filtrados antes de irem ao
 * navegador: só chaves conhecidas do formulário e só mensagens em texto
 * (ou lista delas). O resto — chaves inventadas, objetos,
 * texto enorme — é descartado, para a API central não virar um canal de
 * conteúdo arbitrário para a tela.
 */
const MESSAGE_MAX = 200;

export function safeFieldErrors(errors, fields) {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null;

  const known = new Set(fields.map((field) => field.toLowerCase()));
  const clip = (text) => text.trim().slice(0, MESSAGE_MAX);
  const safe = {};
  for (const [key, value] of Object.entries(errors)) {
    if (!known.has(String(key).toLowerCase())) continue;

    if (typeof value === 'string' && value.trim()) {
      safe[key] = clip(value);
    } else if (Array.isArray(value)) {
      const messages = value.filter((m) => typeof m === 'string' && m.trim()).slice(0, 3).map(clip);
      if (messages.length) safe[key] = messages;
    }
  }
  return Object.keys(safe).length ? safe : null;
}
