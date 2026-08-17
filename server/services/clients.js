/* =========================================================================
   Gestão de clientes pelo administrador, incluindo o vínculo com projetos.

   Regras que valem aqui:
   · Só ADMIN chega neste serviço (garantido pelo router).
   · Vincular exige que cliente E projeto existam — id inventado devolve 404,
     e não um erro de chave estrangeira vazando do banco.
   · Vincular duas vezes não é erro: a operação é idempotente. Sem isso, um
     duplo clique viraria 500 por violação de chave primária.
   ========================================================================= */

import { AUDIT_ACTIONS, ROLES } from '../config.js';
import { notFound } from '../http/errors.js';

export function clientsService(ctx) {
  /** Confere que o id é de um CLIENTE (não de outro admin). */
  const carregarCliente = async (clientId) => {
    const cliente = await ctx.users.findById(clientId);
    if (!cliente || cliente.role !== ROLES.CLIENT) {
      throw notFound('Cliente não encontrado.');
    }
    return cliente;
  };

  return {
    /**
     * Ficha completa do cliente em uma chamada: dados, projetos vinculados,
     * projetos disponíveis e solicitações. Evita a tela fazer 4 requisições.
     */
    async getDetail(clientId, pagination) {
      const cliente = await carregarCliente(clientId);

      const [vinculados, disponiveis, solicitacoes] = await Promise.all([
        ctx.projects.listForUser(clientId),
        ctx.projects.listAvailableForUser(clientId),
        ctx.requests.listForUser(clientId, pagination),
      ]);

      return {
        client: cliente,
        linkedProjects: vinculados,
        availableProjects: disponiveis,
        requests: solicitacoes,
      };
    },

    async linkProject(admin, clientId, projectId) {
      const cliente = await carregarCliente(clientId);

      const projeto = await ctx.projects.findById(projectId);
      if (!projeto) throw notFound('Projeto não encontrado.');

      /* Idempotente: já vinculado não vira erro nem duplica. */
      if (await ctx.projects.isLinked(clientId, projectId)) {
        return { linked: true, alreadyLinked: true };
      }

      await ctx.projects.linkToUser(clientId, projectId);

      await ctx.audit.log({
        userId: admin.id,
        action: AUDIT_ACTIONS.PROJECT_LINKED,
        resourceType: 'client_project',
        resourceId: `${clientId}:${projectId}`,
        details: { cliente: cliente.email, projeto: projeto.title },
      });

      return { linked: true, alreadyLinked: false };
    },

    async unlinkProject(admin, clientId, projectId) {
      const cliente = await carregarCliente(clientId);

      const removido = await ctx.projects.unlinkFromUser(clientId, projectId);
      if (!removido) throw notFound('Este projeto não está vinculado a este cliente.');

      await ctx.audit.log({
        userId: admin.id,
        action: AUDIT_ACTIONS.PROJECT_UNLINKED,
        resourceType: 'client_project',
        resourceId: `${clientId}:${projectId}`,
        details: { cliente: cliente.email, projetoId: projectId },
      });

      return { unlinked: true };
    },
  };
}
