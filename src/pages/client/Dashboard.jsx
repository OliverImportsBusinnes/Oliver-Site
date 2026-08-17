import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../app/AuthContext.jsx';

const primeiroNome = (nome = '') => nome.trim().split(' ')[0];

export default function ClientDashboard() {
  const { user } = useAuth();

  const resumo = useApi(() => api.get('/me/summary'));
  const projetos = useApi(() => api.get('/me/projects'));
  const solicitacoes = useApi(() => api.get('/me/requests'));

  const carregando = resumo.loading || projetos.loading || solicitacoes.loading;

  if (carregando) {
    return <p className="panel-loading">Carregando seus dados…</p>;
  }

  const numeros = resumo.data?.summary ?? {
    projects: 0,
    requests: 0,
    unreadMessages: 0,
  };
  const listaProjetos = projetos.data?.projects ?? [];
  const listaSolicitacoes = solicitacoes.data?.requests ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Olá, {primeiroNome(user?.name)}.</h1>
          <p className="page-subtitle">
            Aqui você acompanha seus projetos e solicitações.
          </p>
        </div>

        <Link className="btn btn--primary btn--sm" to="/cliente/solicitacoes">
          <Icon name="bolt" size={16} />
          Nova solicitação
        </Link>
      </header>

      {/* Números reais — sem dado de exemplo. */}
      <ul className="stats">
        <li className="stat">
          <span className="stat__label">Projetos</span>
          <span className="stat__value">{numeros.projects}</span>
        </li>
        <li className="stat">
          <span className="stat__label">Solicitações</span>
          <span className="stat__value">{numeros.requests}</span>
        </li>
        <li className={`stat${numeros.unreadMessages > 0 ? ' stat--accent' : ''}`}>
          <span className="stat__label">Mensagens não lidas</span>
          <span className="stat__value">{numeros.unreadMessages}</span>
        </li>
      </ul>

      <section className="block">
        <h2 className="block__title">Seus projetos</h2>

        {listaProjetos.length === 0 ? (
          <EmptyState
            icon="layers"
            title="Você ainda não possui projetos vinculados."
            text="Assim que um projeto for iniciado, ele aparece aqui com o andamento."
          />
        ) : (
          <ul className="cards">
            {listaProjetos.map((projeto) => (
              <li key={projeto.id} className="mini-card">
                <div className="mini-card__head">
                  <span className="mini-card__category">{projeto.category}</span>
                  <StatusBadge status={projeto.status} />
                </div>
                <h3 className="mini-card__title">{projeto.title}</h3>
                {projeto.tagline ? (
                  <p className="mini-card__text">{projeto.tagline}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <div className="block__head">
          <h2 className="block__title">Últimas solicitações</h2>
          {listaSolicitacoes.length > 0 ? (
            <Link className="block__link" to="/cliente/solicitacoes">
              Ver todas
              <Icon name="arrowRight" size={14} />
            </Link>
          ) : null}
        </div>

        {listaSolicitacoes.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Nenhuma solicitação por enquanto."
            text="Conte o que você precisa desenvolver e retornamos por aqui."
            action={
              <Link className="btn btn--primary btn--sm" to="/cliente/solicitacoes">
                Abrir solicitação
              </Link>
            }
          />
        ) : (
          <ul className="rows">
            {listaSolicitacoes.slice(0, 4).map((item) => (
              <li key={item.id}>
                <Link className="row" to={`/cliente/solicitacoes/${item.id}`}>
                  <span className="row__main">
                    <span className="row__title">{item.type}</span>
                    <span className="row__text">{item.description}</span>
                  </span>
                  <StatusBadge status={item.status} />
                  <Icon name="arrowRight" size={16} className="row__arrow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
