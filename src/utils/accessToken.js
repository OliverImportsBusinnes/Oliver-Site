/**
 * Lê o token de "#acesso=..." (o que `location.hash` devolve). Percent-encoding
 * inválido não pode derrubar a página: token ilegível é o mesmo que sem token.
 */
export function readAccessHash(hash) {
  const match = String(hash ?? '').match(/acesso=([^&]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * O token guardado só deve ser descartado quando a API disser que ele não vale
 * (401/403). Erro de rede, 503 ou timeout não dizem nada sobre o token.
 */
export function shouldDiscardToken(failure) {
  return failure?.status === 401 || failure?.status === 403;
}
