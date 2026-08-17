import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import StatusBadge, { statusLabel } from '../../components/panel/StatusBadge.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, withQuery } from '../../api/client.js';

const STATUS = [
  'NOVO',
  'EM_ANALISE',
  'ORCAMENTO',
  'EM_DESENVOLVIMENTO',
  'CONCLUIDO',
  'CANCELADO',
];

export default function AdminRequests() {
  const [filtro, setFiltro] = useState('');
  const { data, loading, reload } = useApi(
    () => api.get(withQuery('/admin/requests', { status: filtro, limit: 50 })),
    [filtro]
  );

  const [alterando, setAlterando] = useState(null);
  const [erro, setErro] = useState(null);

  const mudarStatus = async (id, status) => {
    setErro(null);
    setAlterando(id);
    try {
      await api.patch(`/admin/requests/${id}/status`, { status });
      reload();
    } catch (problema) {
      setErro(problema.message);
    } finally {
      setAlterando(null);
    }
  };

  const lista = data?.requests ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Solicitações</h1>
          <p className="page-subtitle">Acompanhe e atualize o andamento de cada pedido.</p>
        </div>
      </header>

      <div className="filters" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          className={`chip${filtro === '' ? ' is-active' : ''}`}
          onClick={() => setFiltro('')}
        >
          Todas
        </button>
        {STATUS.map((status) => (
          <button
            key={status}
            type="button"
            className={`chip${filtro === status ? ' is-active' : ''}`}
            onClick={() => setFiltro(status)}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>

      {erro ? (
        <div className="alert alert--error" role="alert">
          <Icon name="close" size={16} />
          {erro}
        </div>
      ) : null}

      {loading ? (
        <p className="panel-loading">Carregando…</p>
      ) : lista.length === 0 ? (
        <EmptyState
          icon="chat"
          title={filtro ? 'Nenhuma solicitação com este status.' : 'Nenhuma solicitação ainda.'}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Alterar para</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item.id}>
                  <td data-label="Tipo">
                    <strong>{item.type}</strong>
                  </td>
                  <td data-label="Cliente">
                    <span className="table__stack">
                      <span>{item.user_name}</span>
                      <span className="table__muted">{item.user_email}</span>
                    </span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={item.status} />
                  </td>
                  <td data-label="Alterar para">
                    <label className="sr-only" htmlFor={`status-${item.id}`}>
                      Novo status da solicitação {item.id}
                    </label>
                    <select
                      id={`status-${item.id}`}
                      className="field__control field__control--sm"
                      value={item.status}
                      disabled={alterando === item.id}
                      onChange={(event) => mudarStatus(item.id, event.target.value)}
                    >
                      {STATUS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="">
                    <Link className="btn btn--soft btn--xs" to={`/admin/solicitacoes/${item.id}`}>
                      Abrir
                      <Icon name="arrowRight" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
