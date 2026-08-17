/* =========================================================================
   Autenticação: cadastro, login, logout e leitura da sessão.

   Decisões de segurança tomadas aqui:
   · A resposta de login é IGUAL para e-mail inexistente e senha errada —
     senão a tela vira um verificador de quem tem conta (user enumeration).
   · Mesmo quando o e-mail não existe, uma verificação de senha falsa é
     executada, para o tempo de resposta não denunciar a diferença.
   · O papel do usuário NUNCA vem do cliente: cadastro sempre cria CLIENT.
   · O token de sessão só existe no cookie; no banco fica o hash dele.
   ========================================================================= */

import { AUDIT_ACTIONS, LIMITS, ROLES, SECURITY } from '../config.js';
import { hashPassword, needsRehash, verifyPassword } from '../security/password.js';
import { createSessionToken, hashToken } from '../security/tokens.js';
import { conflict, tooManyRequests, unauthorized } from '../http/errors.js';
import {
  cleanText,
  createValidator,
  normalizeEmail,
} from '../http/validation.js';

/* Hash descartável usado para gastar tempo quando o e-mail não existe. */
const DUMMY_HASH =
  'scrypt$32768$8$1$YWFhYWFhYWFhYWFhYWFhYQ==$' +
  'ZmFrZWhhc2hmYWtlaGFzaGZha2VoYXNoZmFrZWhhc2hmYWtlaGFzaGZha2VoYXNoZmFrZQ==';

export function authService(ctx) {
  return {
    /** Cria uma conta de CLIENTE. */
    async register(input) {
      const validator = createValidator();
      validator.text('name', input.name, { max: LIMITS.NAME_MAX, label: 'o nome' });
      validator.optionalText('company', input.company, {
        max: LIMITS.COMPANY_MAX,
        label: 'a empresa',
      });
      validator.email('email', input.email);
      validator.optionalText('phone', input.phone, {
        max: LIMITS.PHONE_MAX,
        label: 'o telefone',
      });
      validator.password('password', input.password);
      validator.assert();

      const email = normalizeEmail(input.email);

      if (await ctx.users.existsByEmail(email)) {
        throw conflict('Já existe uma conta com este e-mail.');
      }

      const userId = await ctx.users.create({
        name: cleanText(input.name),
        company: cleanText(input.company),
        email,
        phone: cleanText(input.phone),
        passwordHash: await hashPassword(input.password),
        role: ROLES.CLIENT, // sempre CLIENT: papel não vem da requisição
      });

      await ctx.audit.log({
        userId,
        action: AUDIT_ACTIONS.USER_REGISTERED,
        resourceType: 'user',
        resourceId: userId,
      });

      return ctx.users.findById(userId);
    },

    /** Autentica e devolve `{ user, token, expiresAt }`. */
    async login(input) {
      const email = normalizeEmail(input.email);
      const password = typeof input.password === 'string' ? input.password : '';

      if (!email || !password) {
        throw unauthorized('E-mail ou senha incorretos.');
      }

      const attempts = await ctx.loginAttempts.countRecent(email);
      if (attempts >= SECURITY.LOGIN_MAX_ATTEMPTS) {
        throw tooManyRequests(
          'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
        );
      }

      const account = await ctx.users.findByEmailWithHash(email);

      /* Sem conta: ainda assim gasta o tempo de um hash, para não dar pista. */
      const passwordOk = account
        ? await verifyPassword(password, account.password_hash)
        : await verifyPassword(password, DUMMY_HASH);

      if (!account || !passwordOk) {
        await ctx.loginAttempts.register(email);
        await ctx.audit.log({
          userId: account?.id ?? null,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          resourceType: 'auth',
          details: { email },
        });
        throw unauthorized('E-mail ou senha incorretos.');
      }

      await ctx.loginAttempts.clear(email);

      /* Parâmetros de hash endurecidos depois do cadastro? Atualiza agora. */
      if (needsRehash(account.password_hash)) {
        await ctx.users.updatePasswordHash(account.id, await hashPassword(password));
      }

      await ctx.sessions.deleteExpired();

      const token = createSessionToken();
      const expiresAt = Date.now() + SECURITY.SESSION_TTL_MS;

      await ctx.sessions.create({
        id: hashToken(token),
        userId: account.id,
        expiresAt,
      });

      await ctx.audit.log({
        userId: account.id,
        action: AUDIT_ACTIONS.LOGIN,
        resourceType: 'auth',
      });

      return {
        user: await ctx.users.findById(account.id),
        token,
        expiresAt,
      };
    },

    /** Resolve o usuário a partir do token do cookie. */
    async resolveSession(token) {
      if (typeof token !== 'string' || !token) return null;

      const session = await ctx.sessions.findValidWithUser(hashToken(token));
      if (!session) return null;

      return {
        id: session.user_id,
        name: session.name,
        company: session.company,
        email: session.email,
        role: session.role,
        sessionId: session.session_id,
      };
    },

    async logout(token, userId = null) {
      if (typeof token !== 'string' || !token) return;

      await ctx.sessions.delete(hashToken(token));

      if (userId) {
        await ctx.audit.log({
          userId,
          action: AUDIT_ACTIONS.LOGOUT,
          resourceType: 'auth',
        });
      }
    },
  };
}
