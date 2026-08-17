/* =========================================================================
   Reúne os repositórios sobre uma conexão.
   Serviços recebem este objeto — nunca importam o banco direto. Isso é o que
   permite os testes rodarem contra um banco em memória sem gambiarra.
   ========================================================================= */

import { usersRepository } from './repositories/users.js';
import { sessionsRepository } from './repositories/sessions.js';
import { projectsRepository } from './repositories/projects.js';
import { requestsRepository } from './repositories/requests.js';
import { messagesRepository } from './repositories/messages.js';
import { attachmentsRepository } from './repositories/attachments.js';
import { auditRepository, loginAttemptsRepository } from './repositories/audit.js';

export function createContext(db) {
  return {
    db,
    users: usersRepository(db),
    sessions: sessionsRepository(db),
    projects: projectsRepository(db),
    requests: requestsRepository(db),
    messages: messagesRepository(db),
    attachments: attachmentsRepository(db),
    audit: auditRepository(db),
    loginAttempts: loginAttemptsRepository(db),
  };
}
