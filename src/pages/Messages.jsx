import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Chat from '../components/chat/Chat.jsx';
import StatusBadge from '../components/panel/StatusBadge.jsx';
import EmptyState from '../components/panel/EmptyState.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { useAuth } from '../app/AuthContext.jsx';

/** "14:32" se for hoje, senão "11/08". */
function quando(ms) {
  if (!ms) return '';
  const data = new Date(Number(ms));
  const hoje = new Date();
  const mesmoDia =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear();

  return new Intl.DateTimeFormat(
    'pt-BR',
    mesmoDia
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit' }
  ).format(data);
}

const inicial = (nome = '?') => nome.trim().charAt(0).toUpperCase();

/**
 * Caixa de mensagens: lista de conversas à esquerda, conversa aberta à
 * direita. No celular vira uma tela de cada vez.
 *
 * A URL guarda a conversa aberta (/mensagens/:id), então recarregar a página
 * ou compartilhar o link mantém o lugar.
 */
export default function Messages({ basePath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const { data, loading, reload } = useApi(() => api.get('/conversations'));
  const conversas = data?.conversations ?? [];

  /* Quem dispara o recarregamento é a própria conversa, ao carregar ou enviar
     mensagem (`onSent`) — recarregar aqui na troca de id fazia a lista piscar. */
  const aberta = conversas.find((c) => String(c.requestId) === String(id));
  const naoLidasTotal = conversas.reduce((soma, c) => soma + c.unread, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Mensagens</h1>
          <p className="page-subtitle">
            {naoLidasTotal > 0
              ? `Você tem ${naoLidasTotal} mensagem${naoLidasTotal > 1 ? 's' : ''} não lida${naoLidasTotal > 1 ? 's' : ''}.`
              : 'Todas as conversas em um lugar só.'}
          </p>
        </div>
      </header>

      {loading && conversas.length === 0 ? (
        <p className="panel-loading">Carregando conversas…</p>
      ) : conversas.length === 0 ? (
        <EmptyState
          icon="chat"
          title="Nenhuma conversa ainda."
          text={
            isAdmin
              ? 'Quando um cliente abrir uma solicitação, a conversa aparece aqui.'
              : 'Abra uma solicitação e a conversa começa por aqui.'
          }
        />
      ) : (
        <div className={`inbox${id ? ' inbox--open' : ''}`}>
          {/* ---- Lista de conversas ---- */}
          <aside className="inbox__list" aria-label="Conversas">
            {conversas.map((conversa) => {
              const ativa = String(conversa.requestId) === String(id);
              const nome = isAdmin ? conversa.client.name : conversa.type;

              return (
                <button
                  type="button"
                  key={conversa.requestId}
                  className={`thread${ativa ? ' is-active' : ''}${
                    conversa.unread > 0 ? ' has-unread' : ''
                  }`}
                  onClick={() => navigate(`${basePath}/${conversa.requestId}`)}
                  aria-current={ativa ? 'true' : undefined}
                >
                  <span className="thread__avatar" aria-hidden="true">
                    {inicial(nome)}
                  </span>

                  <span className="thread__body">
                    <span className="thread__top">
                      <span className="thread__name">{nome}</span>
                      <span className="thread__time">
                        {quando(conversa.lastMessage?.at ?? conversa.createdAt)}
                      </span>
                    </span>

                    <span className="thread__preview">
                      {conversa.lastMessage ? (
                        <>
                          {conversa.lastMessage.mine ? (
                            <span className="thread__you">Você: </span>
                          ) : null}
                          {conversa.lastMessage.body}
                        </>
                      ) : (
                        <span className="thread__empty">
                          Nenhuma mensagem ainda
                        </span>
                      )}
                    </span>

                    <span className="thread__meta">
                      {isAdmin ? (
                        <span className="thread__tag">{conversa.type}</span>
                      ) : null}
                      <StatusBadge status={conversa.status} />
                    </span>
                  </span>

                  {conversa.unread > 0 ? (
                    <span className="thread__badge" aria-label={`${conversa.unread} não lidas`}>
                      {conversa.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </aside>

          {/* ---- Conversa aberta ---- */}
          <section className="inbox__panel">
            {!id ? (
              <div className="inbox__placeholder">
                <span className="inbox__placeholder-icon">
                  <Icon name="chat" size={26} />
                </span>
                <h2>Escolha uma conversa</h2>
                <p>Selecione ao lado para abrir as mensagens.</p>
              </div>
            ) : !aberta ? (
              <EmptyState
                icon="close"
                title="Conversa não encontrada."
                text="Ela pode ter sido removida ou não pertence à sua conta."
              />
            ) : (
              <>
                <header className="inbox__head">
                  <button
                    type="button"
                    className="btn btn--soft btn--xs inbox__back"
                    onClick={() => navigate(basePath)}
                  >
                    <Icon name="arrowRight" size={14} className="back-link__icon" />
                    Conversas
                  </button>

                  <div className="inbox__who">
                    <span className="inbox__title">
                      {isAdmin ? aberta.client.name : aberta.type}
                    </span>
                    <span className="inbox__sub">
                      {isAdmin
                        ? `${aberta.type}${aberta.client.company ? ` · ${aberta.client.company}` : ''}`
                        : 'Solicitação'}
                    </span>
                  </div>

                  <div className="inbox__actions">
                    <StatusBadge status={aberta.status} />
                    <button
                      type="button"
                      className="btn btn--soft btn--xs"
                      onClick={() =>
                        navigate(
                          isAdmin
                            ? `/admin/solicitacoes/${aberta.requestId}`
                            : `/cliente/solicitacoes/${aberta.requestId}`
                        )
                      }
                    >
                      Ver solicitação
                      <Icon name="arrowUpRight" size={13} />
                    </button>
                  </div>
                </header>

                <Chat
                  requestId={aberta.requestId}
                  currentUser={user}
                  onSent={reload}
                  variant="inbox"
                />
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
