/* =========================================================================
   Normalização de parâmetros — usada pelos dois drivers.

   O SQLite nativo do Node só aceita null, number, bigint, string e
   Uint8Array: um `true` ou um `undefined` vindo de camada acima estoura.
   Padronizar aqui evita espalhar conversão por todos os repositórios.
   ========================================================================= */

export function normalizeParam(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return value;
}

export function normalizeParams(params = []) {
  return params.map(normalizeParam);
}

/** `lastInsertRowid` pode vir como BigInt; a aplicação trabalha com Number. */
export function toNumber(value) {
  return typeof value === 'bigint' ? Number(value) : value;
}
