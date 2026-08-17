/* =========================================================================
   Roteador mínimo.

   Recebe uma requisição já normalizada e devolve uma resposta normalizada —
   sem depender de Express nem do formato do Netlify. É isso que permite os
   testes chamarem a API de verdade, sem subir servidor nem abrir porta.
   ========================================================================= */

export function createRouter() {
  const routes = [];

  const add = (method, pattern, handler, options = {}) => {
    /* "/api/requests/:id/messages" → regex com grupos nomeados. */
    const regex = new RegExp(
      `^${pattern.replace(/:[a-zA-Z]+/g, (match) => `(?<${match.slice(1)}>[^/]+)`)}$`
    );
    routes.push({ method, regex, handler, options });
  };

  return {
    get: (pattern, handler, options) => add('GET', pattern, handler, options),
    post: (pattern, handler, options) => add('POST', pattern, handler, options),
    put: (pattern, handler, options) => add('PUT', pattern, handler, options),
    patch: (pattern, handler, options) => add('PATCH', pattern, handler, options),
    delete: (pattern, handler, options) => add('DELETE', pattern, handler, options),

    /** Devolve a rota e os parâmetros da URL, ou null. */
    match(method, path) {
      let pathExists = false;

      for (const route of routes) {
        const match = route.regex.exec(path);
        if (!match) continue;

        pathExists = true;
        if (route.method === method) {
          return { route, params: match.groups ?? {} };
        }
      }

      /* Caminho existe mas o método não: 405 em vez de 404. */
      return pathExists ? { methodMismatch: true } : null;
    },
  };
}
