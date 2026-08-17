/* =========================================================================
   Aplicação HTTP: rotas, autenticação, autorização e tratamento de erro.

   Princípio central: NADA é autorizado no front-end. Toda rota protegida
   declara `auth: true` (exige sessão) e/ou `role: ADMIN`. Esconder um botão
   é cosmético — quem barra é este arquivo.
   ========================================================================= */

import { AUDIT_ACTIONS, ROLES, SECURITY } from './config.js';
import { createContext } from './context.js';
import { createRouter } from './http/router.js';
import {
  parseCookies,
  serializeClearedSessionCookie,
  serializeSessionCookie,
} from './http/cookies.js';
import { AppError, badRequest, forbidden, notFound, unauthorized } from './http/errors.js';
import { parsePagination, pick, toId } from './http/validation.js';
import { authService } from './services/auth.js';
import { projectsService } from './services/projects.js';
import { requestsService } from './services/requests.js';
import { clientsService } from './services/clients.js';
import { messagesService } from './services/messages.js';
import { attachmentsService } from './services/attachments.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

/** Métodos que alteram estado — só eles precisam de checagem de origem. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createApp(db, { allowedOrigins = [] } = {}) {
  const ctx = createContext(db);
  const auth = authService(ctx);
  const projects = projectsService(ctx);
  const requests = requestsService(ctx);
  const attachments = attachmentsService(ctx, requests);
  const messages = messagesService(ctx, requests, attachments);
  const clients = clientsService(ctx);

  const router = createRouter();

  /* ------------------------------------------------------------ público */

  router.get('/api/projects', async () => ({
    status: 200,
    body: { projects: await projects.listPublic() },
  }));

  router.get('/api/health', async () => ({ status: 200, body: { ok: true } }));

  /* --------------------------------------------------------- autenticação */

  router.post('/api/auth/register', async ({ body }) => {
    /* Só estes campos são lidos: enviar `role` junto não tem efeito. */
    const input = pick(body, ['name', 'company', 'email', 'phone', 'password']);
    const user = await auth.register(input);
    return { status: 201, body: { user } };
  });

  router.post('/api/auth/login', async ({ body }) => {
    const input = pick(body, ['email', 'password']);
    const { user, token, expiresAt } = await auth.login(input);

    return {
      status: 200,
      body: { user, expiresAt },
      cookies: [serializeSessionCookie(token, { maxAgeMs: SECURITY.SESSION_TTL_MS })],
    };
  });

  router.post(
    '/api/auth/logout',
    async ({ token, user }) => {
      await auth.logout(token, user?.id);
      return { status: 200, body: { ok: true }, cookies: [serializeClearedSessionCookie()] };
    },
    { auth: true }
  );

  /* `sessionId` é uso interno (logout, auditoria) e não deve sair na resposta:
     identificador de sessão não é informação de perfil. */
  router.get(
    '/api/auth/me',
    async ({ user }) => {
      const { sessionId, ...publicUser } = user;
      return { status: 200, body: { user: publicUser } };
    },
    { auth: true }
  );

  /* ------------------------------------------------------------ cliente */

  router.get(
    '/api/me/projects',
    async ({ user }) => ({ status: 200, body: { projects: await projects.listForUser(user.id) } }),
    { auth: true }
  );

  router.get(
    '/api/me/requests',
    async ({ user, query }) => ({
      status: 200,
      body: { requests: await requests.listMine(user, parsePagination(query)) },
    }),
    { auth: true }
  );

  router.post(
    '/api/me/requests',
    async ({ user, body }) => {
      const input = pick(body, ['type', 'description', 'budget', 'deadline']);
      return { status: 201, body: { request: await requests.create(user, input) } };
    },
    { auth: true }
  );

  router.get(
    '/api/me/summary',
    async ({ user }) => ({
      status: 200,
      body: {
        summary: {
          projects: (await projects.listForUser(user.id)).length,
          requests: (await requests.listMine(user, { limit: 100, offset: 0 })).length,
          unreadMessages: await ctx.messages.countUnreadForUser(user.id),
        },
      },
    }),
    { auth: true }
  );

  /* Caixa de mensagens — a mesma rota serve cliente e admin; o serviço
     decide o recorte pelo papel de quem está logado. */
  router.get(
    '/api/conversations',
    async ({ user, query }) => ({
      status: 200,
      body: {
        conversations: await messages.listConversations(user, parsePagination(query)),
      },
    }),
    { auth: true }
  );

  /* Só o número, para o indicador do menu não precisar baixar as conversas. */
  router.get(
    '/api/conversations/unread',
    async ({ user }) => ({
      status: 200,
      body: {
        unread: await ctx.messages.countUnreadForViewer({
          viewerId: user.id,
          isAdmin: user.role === ROLES.ADMIN,
        }),
      },
    }),
    { auth: true }
  );

  /* --------------------- solicitação: cliente dono OU admin (regra única) */

  router.get(
    '/api/requests/:id',
    async ({ user, params }) => {
      const id = requireId(params.id);
      return { status: 200, body: { request: await requests.getForViewer(user, id) } };
    },
    { auth: true }
  );

  router.get(
    '/api/requests/:id/messages',
    async ({ user, params, query }) => {
      const id = requireId(params.id);
      return {
        status: 200,
        body: {
          messages: await messages.listForRequest(user, id, parsePagination(query)),
        },
      };
    },
    { auth: true }
  );

  router.post(
    '/api/requests/:id/messages',
    async ({ user, params, body }) => {
      const id = requireId(params.id);
      const { body: text, image } = pick(body, ['body', 'image']);

      /* Só os campos previstos da imagem são lidos. */
      const imagem = image
        ? pick(image, ['dataBase64', 'filename'])
        : null;

      return {
        status: 201,
        body: { message: await messages.send(user, id, text, imagem) },
      };
    },
    { auth: true }
  );

  /* Download da imagem. Responde bytes, não JSON — e sempre com o tipo
     detectado no servidor, nunca com o que o navegador declarou no envio. */
  router.get(
    '/api/attachments/:id',
    async ({ user, params }) => {
      const id = requireId(params.id);
      const arquivo = await attachments.baixar(user, id);

      return {
        status: 200,
        raw: {
          buffer: arquivo.buffer,
          contentType: arquivo.mime,
          filename: arquivo.filename,
        },
      };
    },
    { auth: true }
  );

  /* -------------------------------------------------------------- admin */

  const adminOnly = { auth: true, role: ROLES.ADMIN };

  router.get(
    '/api/admin/summary',
    async () => ({
      status: 200,
      body: {
        summary: {
          clients: await ctx.users.countClients(),
          projects: await ctx.projects.countAll(),
          requests: await ctx.requests.countAll(),
          pendingRequests: await ctx.requests.countByStatus('NOVO'),
          messages: await ctx.messages.countAll(),
        },
      },
    }),
    adminOnly
  );

  router.get(
    '/api/admin/clients',
    async ({ query }) => ({
      status: 200,
      body: {
        clients: await ctx.users.list({
          search: typeof query.search === 'string' ? query.search.trim() : null,
          ...parsePagination(query),
        }),
      },
    }),
    adminOnly
  );

  /* ---- Ficha do cliente + vínculo com projetos ---- */

  router.get(
    '/api/admin/clients/:id',
    async ({ params, query }) => {
      const id = requireId(params.id);
      return { status: 200, body: await clients.getDetail(id, parsePagination(query)) };
    },
    adminOnly
  );

  router.post(
    '/api/admin/clients/:id/projects',
    async ({ user, params, body }) => {
      const clientId = requireId(params.id);
      const { projectId } = pick(body, ['projectId']);
      return {
        status: 200,
        body: await clients.linkProject(user, clientId, requireId(projectId)),
      };
    },
    adminOnly
  );

  router.delete(
    '/api/admin/clients/:id/projects/:projectId',
    async ({ user, params }) => {
      const clientId = requireId(params.id);
      const projectId = requireId(params.projectId);
      return { status: 200, body: await clients.unlinkProject(user, clientId, projectId) };
    },
    adminOnly
  );

  router.get(
    '/api/admin/requests',
    async ({ query }) => ({
      status: 200,
      body: {
        requests: await requests.listAll(
          parsePagination(query),
          typeof query.status === 'string' ? query.status : null
        ),
      },
    }),
    adminOnly
  );

  router.patch(
    '/api/admin/requests/:id/status',
    async ({ user, params, body }) => {
      const id = requireId(params.id);
      const { status } = pick(body, ['status']);
      return { status: 200, body: { request: await requests.updateStatus(user, id, status) } };
    },
    adminOnly
  );

  router.get(
    '/api/admin/projects',
    async ({ query }) => ({
      status: 200,
      body: { projects: await projects.listAll(parsePagination(query)) },
    }),
    adminOnly
  );

  router.post(
    '/api/admin/projects',
    async ({ user, body }) => ({
      status: 201,
      body: { project: await projects.create(user, body) },
    }),
    adminOnly
  );

  router.put(
    '/api/admin/projects/:id',
    async ({ user, params, body }) => {
      const id = requireId(params.id);
      return { status: 200, body: { project: await projects.update(user, id, body) } };
    },
    adminOnly
  );

  router.delete(
    '/api/admin/projects/:id',
    async ({ user, params }) => {
      const id = requireId(params.id);
      return { status: 200, body: await projects.remove(user, id) };
    },
    adminOnly
  );

  router.get(
    '/api/admin/audit',
    async ({ query }) => ({
      status: 200,
      body: { logs: await ctx.audit.list(parsePagination(query)) },
    }),
    adminOnly
  );

  /* ------------------------------------------------------------ execução */

  /**
   * `request`: { method, path, query, headers, body }
   * devolve   { status, headers, body }
   */
  async function handle(request) {
    try {
      const method = String(request.method ?? 'GET').toUpperCase();
      const path = String(request.path ?? '');

      const found = router.match(method, path);
      if (!found) throw notFound('Rota não encontrada.');
      if (found.methodMismatch) {
        throw new AppError(405, 'METODO_NAO_PERMITIDO', 'Método não permitido.');
      }

      const { route, params } = found;
      const headers = normalizeHeaders(request.headers);

      /* CSRF: requisição que altera estado precisa vir da própria origem.
         Combinado com SameSite=Lax, cobre o cenário clássico de CSRF. */
      if (MUTATING_METHODS.has(method) && allowedOrigins.length) {
        const origin = headers.origin;
        if (origin && !allowedOrigins.includes(origin)) {
          throw forbidden('Origem não autorizada.');
        }
      }

      const token = parseCookies(headers.cookie)[SECURITY.SESSION_COOKIE] ?? null;
      const user = route.options.auth ? await auth.resolveSession(token) : null;

      if (route.options.auth && !user) {
        throw unauthorized();
      }

      /* Autorização por papel — no servidor, sempre. */
      if (route.options.role && user.role !== route.options.role) {
        await ctx.audit.log({
          userId: user.id,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          resourceType: 'authz',
          details: { rota: path, papel: user.role },
        });
        throw forbidden();
      }

      const result = await route.handler({
        user,
        token,
        params,
        query: request.query ?? {},
        body: request.body ?? {},
        headers,
      });

      if (result.raw) return respondRaw(result.status ?? 200, result.raw);

      return respond(result.status ?? 200, result.body, result.cookies);
    } catch (error) {
      return toErrorResponse(error);
    }
  }

  return { handle, ctx, services: { auth, projects, requests, messages } };
}

/* ------------------------------------------------------------- helpers */

function requireId(raw) {
  const id = toId(raw);
  if (!id) throw badRequest('Identificador inválido.');
  return id;
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

/**
 * Resposta com bytes (imagem).
 * `nosniff` impede o navegador de adivinhar outro tipo, e `inline` com nome
 * fixo evita download com nome manipulado. Cache privado: a imagem pertence
 * a uma conversa, não pode ficar em cache compartilhado.
 */
function respondRaw(status, { buffer, contentType, filename }) {
  return {
    status,
    isRaw: true,
    buffer,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  };
}

function respond(status, body, cookies) {
  const headers = { ...JSON_HEADERS };
  if (cookies?.length) headers['Set-Cookie'] = cookies;
  return { status, headers, body };
}

/**
 * Converte exceção em resposta.
 * Erro previsto vira mensagem útil; erro inesperado é registrado no servidor
 * e devolve texto genérico — detalhe interno não vai para o cliente.
 */
function toErrorResponse(error) {
  if (error instanceof AppError) {
    return respond(error.status, {
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  console.error('[api] erro inesperado:', error?.message, error?.stack);

  return respond(500, {
    error: 'ERRO_INTERNO',
    message: 'Algo deu errado. Tente novamente em instantes.',
  });
}
