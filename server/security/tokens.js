/* =========================================================================
   Tokens de sessão.
   -------------------------------------------------------------------------
   O token vai no cookie do cliente; no banco guardamos apenas o SHA-256 dele.
   Se o banco vazar, os tokens não podem ser reutilizados — mesma lógica de
   nunca guardar senha em texto puro.
   ========================================================================= */

import { createHash, randomBytes } from 'node:crypto';
import { SECURITY } from '../config.js';

/** Token novo, aleatório e seguro para uso em URL/cookie. */
export function createSessionToken() {
  return randomBytes(SECURITY.SESSION_ID_BYTES).toString('base64url');
}

/** Identificador guardado no banco (nunca o token cru). */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
