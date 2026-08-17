import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import Chat from '../../components/chat/Chat.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../app/AuthContext.jsx';

const formatarData = (ms) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Number(ms)));

/**
 * Detalhe da solicitação + conversa. A mesma tela serve para o cliente e para
 * o admin — quem decide o que cada um pode ver é a API.
 */
export default function RequestDetail({ basePath = '/cliente/solicitacoes' }) {
  const { id } = useParams();
  const { user } = useAuth();

  const solicitacao = useApi(() => api.get(`/requests/${id}`), [id]);

  if (solicitacao.loading) {
    return <p className="panel-loading">Carregando…</p>;
  }

  /* A API devolve 404 tanto para inexistente quanto para "não é sua". */
  if (solicitacao.error) {
    return (
      <EmptyState
        icon="close"
        title="Solicitação não encontrada."
        text="Ela pode ter sido removida ou não pertence à sua conta."
        action={
          <Link className="btn btn--ghost btn--sm" to={basePath}>
            Voltar
          </Link>
        }
      />
    );
  }

  const item = solicitacao.data.request;

  return (
    <>
      <Link className="back-link" to={basePath}>
        <Icon name="arrowRight" size={15} className="back-link__icon" />
        Voltar
      </Link>

      <header className="page-head">
        <div>
          <h1 className="page-title">{item.type}</h1>
          <p className="page-subtitle">
            Aberta em {formatarData(item.created_at)}
            {item.user_name ? ` · ${item.user_name}` : ''}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </header>

      <section className="block">
        <h2 className="block__title">Descrição</h2>
        <div className="detail-card">
          <p className="detail-card__text">{item.description}</p>

          {item.budget || item.deadline ? (
            <dl className="detail-card__meta">
              {item.budget ? (
                <div>
                  <dt>Orçamento</dt>
                  <dd>{item.budget}</dd>
                </div>
              ) : null}
              {item.deadline ? (
                <div>
                  <dt>Prazo</dt>
                  <dd>{item.deadline}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>

      <section className="block">
        <h2 className="block__title">Conversa</h2>
        <Chat requestId={id} currentUser={user} />
      </section>
    </>
  );
}
