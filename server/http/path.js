/* =========================================================================
   Normalização do caminho recebido pela função serverless.

   No Netlify a requisição pode chegar de duas formas:
     · /api/auth/login                        (chamada direta)
     · /.netlify/functions/api/auth/login     (via redirect do netlify.toml)

   As rotas são declaradas como /api/... , então tudo é normalizado para essa
   forma antes de rotear. Está isolado aqui porque é lógica crítica de deploy
   que precisa ser testável sem subir o Netlify.
   ========================================================================= */

const FUNCTION_PREFIX = '/.netlify/functions/api';

export function normalizeApiPath(pathname) {
  if (typeof pathname !== 'string' || !pathname) return '/';

  if (pathname === FUNCTION_PREFIX) return '/api';

  if (pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
    return `/api${pathname.slice(FUNCTION_PREFIX.length)}`;
  }

  return pathname;
}
