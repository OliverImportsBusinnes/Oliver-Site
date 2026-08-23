/* =========================================================================
   Configuração do servidor — checklist "Manutenção: configurações
   centralizadas". Nenhum outro arquivo lê `process.env` diretamente.

   ⚠️ Nada aqui tem prefixo VITE_: estes valores NUNCA podem ir para o
   navegador. Ver `.env.example`.
   ========================================================================= */

/** Papéis de usuário (checklist: "enums" no lugar de string solta). */
export const ROLES = Object.freeze({
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
});

/** Estados possíveis de uma solicitação. */
export const REQUEST_STATUS = Object.freeze({
  NEW: 'NOVO',
  REVIEW: 'EM_ANALISE',
  QUOTE: 'ORCAMENTO',
  IN_PROGRESS: 'EM_DESENVOLVIMENTO',
  DONE: 'CONCLUIDO',
  CANCELLED: 'CANCELADO',
});

export const REQUEST_STATUS_VALUES = Object.freeze(
  Object.values(REQUEST_STATUS)
);

/** Estados de um projeto exibido no site. */
export const PROJECT_STATUS = Object.freeze({
  DRAFT: 'RASCUNHO',
  IN_PROGRESS: 'EM_DESENVOLVIMENTO',
  DELIVERED: 'ENTREGUE',
});

export const PROJECT_STATUS_VALUES = Object.freeze(
  Object.values(PROJECT_STATUS)
);

/** Ações registradas em audit_logs. */
export const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FALHOU',
  LOGOUT: 'LOGOUT',
  USER_REGISTERED: 'USUARIO_CRIADO',
  PROJECT_CREATED: 'PROJETO_CRIADO',
  PROJECT_UPDATED: 'PROJETO_EDITADO',
  PROJECT_DELETED: 'PROJETO_EXCLUIDO',
  REQUEST_CREATED: 'SOLICITACAO_CRIADA',
  REQUEST_STATUS_CHANGED: 'SOLICITACAO_STATUS_ALTERADO',
  MESSAGE_SENT: 'MENSAGEM_ENVIADA',
  PROJECT_LINKED: 'PROJETO_VINCULADO',
  PROJECT_UNLINKED: 'PROJETO_DESVINCULADO',
});

/* ------------------------------------------------------------ segurança */

export const SECURITY = Object.freeze({
  /** Duração da sessão. */
  SESSION_TTL_MS: 1000 * 60 * 60 * 8, // 8 horas
  SESSION_COOKIE: 'oi_session',

  /** Tamanho em bytes do identificador de sessão sorteado. */
  SESSION_ID_BYTES: 32,

  /** Parâmetros do scrypt (custo de CPU/memória do hash de senha). */
  SCRYPT: Object.freeze({
    N: 2 ** 15, // custo
    r: 8,
    p: 1,
    keyLength: 64,
    saltBytes: 16,
    maxmem: 96 * 1024 * 1024,
  }),

  /** Bloqueio por tentativas de login. */
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 1000 * 60 * 15, // 15 minutos

  /** Regras de senha. */
  PASSWORD_MIN_LENGTH: 10,
  PASSWORD_MAX_LENGTH: 200,
});

/* ------------------------------------------------------------- limites */

export const LIMITS = Object.freeze({
  NAME_MAX: 120,
  COMPANY_MAX: 120,
  EMAIL_MAX: 190,
  PHONE_MAX: 30,
  TITLE_MAX: 160,
  DESCRIPTION_MAX: 4000,
  MESSAGE_MAX: 4000,
  URL_MAX: 500,
  PAGE_SIZE: 20,
  PAGE_SIZE_MAX: 100,

  /* Upload de imagem no chat. 3 MB cobre logo e print de tela com folga;
     acima disso o payload em base64 começa a pesar na função serverless. */
  UPLOAD_MAX_BYTES: 3 * 1024 * 1024,
  ATTACHMENT_NAME_MAX: 80,
});

/* --------------------------------------------------------- ambiente */

const readEnv = (key, fallback = undefined) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

export const config = Object.freeze({
  /** 'postgres' em produção (Neon), 'sqlite' para desenvolvimento e testes. */
  driver: readEnv('DATABASE_DRIVER', 'sqlite'),

  sqliteFile: readEnv('SQLITE_FILE', 'server/data/oliver.db'),

  postgres: Object.freeze({
    /** URI completa do Neon (a "pooled connection string"). */
    url: readEnv('DATABASE_URL'),

    /* TLS é obrigatório em qualquer banco hospedado. `DATABASE_SSL=disable`
       existe só para um Postgres rodando na própria máquina. */
    ssl: readEnv('DATABASE_SSL', 'require') !== 'disable',
  }),

  sessionSecret: readEnv('SESSION_SECRET'),
  isProduction: readEnv('NODE_ENV') === 'production',

  admin: Object.freeze({
    email: readEnv('ADMIN_EMAIL'),
    password: readEnv('ADMIN_INITIAL_PASSWORD'),
  }),

  analytics: Object.freeze({
    /* Sal do resumo do IP. Sem valor próprio cai no segredo de sessão: o
       importante é nunca gravar o endereço em claro. Trocar o sal reinicia a
       contagem de visitantes únicos, e é essa a saída caso ele vaze. */
    ipSalt: readEnv('ANALYTICS_IP_SALT') ?? readEnv('SESSION_SECRET'),

    /* Chave que o painel administrativo apresenta em X-Analytics-Key para ler
       o relatório sem sessão de navegador. Sem valor definido, a rota
       servidor-a-servidor fica desligada e só o admin logado enxerga. */
    readKey: readEnv('ANALYTICS_READ_KEY'),

    /* Quanto tempo uma visita permanece guardada. Passado isso, a limpeza
       apaga: dado de navegacao velho não serve para decidir nada e só aumenta
       o que existe para vazar. */
    retentionDays: Number(readEnv('ANALYTICS_RETENTION_DAYS', '400')),
  }),
});

/**
 * Falha cedo e com mensagem clara quando falta configuração em produção —
 * melhor do que quebrar numa query no meio de um request.
 */
export function assertProductionConfig() {
  const missing = [];

  if (config.driver === 'postgres' && !config.postgres.url) {
    missing.push('DATABASE_URL');
  }

  if (!config.sessionSecret) missing.push('SESSION_SECRET');

  if (missing.length) {
    throw new Error(
      `Configuração ausente: ${missing.join(', ')}. ` +
        'Defina essas variáveis de ambiente (ver .env.example).'
    );
  }
}
