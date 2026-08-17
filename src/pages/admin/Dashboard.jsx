import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, withQuery } from '../../api/client.js';

/** Todos os números vêm do banco — nada é inventado. */
export default function AdminDashboard() {
  const resumo = useApi(() => api.get('/admin/summary'));
  const recentes = useApi(() => api.get(withQuery('/admin/requests', { limit: 5 })));

  if (resumo.loading) return <p className="panel-loading">Carregando…</p>;

  const numeros = resumo.data?.summary ?? {};
  const lista = recentes.data?.requests ?? [];

  const cartoes = [
    { label: 'Clientes cadastrados', valor: numeros.clients, to: '/admin/clientes' },
    { label: 'Projetos', valor: numeros.projects, to: '/admin/projetos' },
    { label: 'Solicitações', valor: numeros.requests, to: '/admin/solicitacoes' },
    {
      label: 'Solicitações novas',
      valor: numeros.pendingRequests,
      to: '/admin/solicitacoes',
      destaque: numeros.pendingRequests > 0,
    },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral da operação.</p>
        </div>
      </header>

      <ul className="stats">
        {cartoes.map((cartao) => (
          <li key={cartao.label} className={`stat${cartao.destaque ? ' stat--accent' : ''}`}>
            <Link to={cartao.to} className="stat__link">
              <span className="stat__label">{cartao.label}</span>
              <span className="stat__value">{cartao.valor ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="block">
        <div className="block__head">
          <h2 className="block__title">Solicitações recentes</h2>
          <Link className="block__link" to="/admin/solicitacoes">
            Ver todas
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {recentes.loading ? (
          <p className="panel-loading">Carregando…</p>
        ) : lista.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Nenhuma solicitação recebida ainda."
            text="Quando um cliente abrir uma solicitação, ela aparece aqui."
          />
        ) : (
          <ul className="rows">
            {lista.map((item) => (
              <li key={item.id}>
                <Link className="row" to={`/admin/solicitacoes/${item.id}`}>
                  <span className="row__main">
                    <span className="row__title">{item.type}</span>
                    <span className="row__text">
                      {item.user_name} · {item.user_email}
                    </span>
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
