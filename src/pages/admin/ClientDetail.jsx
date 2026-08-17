import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import ConfirmDialog from '../../components/panel/ConfirmDialog.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api/client.js';

const formatarData = (ms) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(Number(ms)));

/** Ficha do cliente: dados, projetos vinculados e solicitações. */
export default function AdminClientDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(
    () => api.get(`/admin/clients/${id}`),
    [id]
  );

  const [selecionado, setSelecionado] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [erro, setErro] = useState(null);
  const [paraRemover, setParaRemover] = useState(null);

  const vincular = async (event) => {
    event.preventDefault();
    if (!selecionado) return;

    setErro(null);
    setVinculando(true);
    try {
      await api.post(`/admin/clients/${id}/projects`, { projectId: Number(selecionado) });
      setSelecionado('');
      reload();
    } catch (problema) {
      setErro(problema.message);
    } finally {
      setVinculando(false);
    }
  };

  const remover = async () => {
    const alvo = paraRemover;
    setParaRemover(null);
    setErro(null);
    try {
      await api.delete(`/admin/clients/${id}/projects/${alvo.id}`);
      reload();
    } catch (problema) {
      setErro(problema.message);
    }
  };

  if (loading) return <p className="panel-loading">Carregando ficha…</p>;

  if (error) {
    return (
      <EmptyState
        icon="close"
        title="Cliente não encontrado."
        action={
          <Link className="btn btn--ghost btn--sm" to="/admin/clientes">
            Voltar
          </Link>
        }
      />
    );
  }

  const { client, linkedProjects, availableProjects, requests } = data;

  return (
    <>
      <Link className="back-link" to="/admin/clientes">
        <Icon name="arrowRight" size={15} className="back-link__icon" />
        Voltar para clientes
      </Link>

      <header className="page-head">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle">
            {client.company ? `${client.company} · ` : ''}
            Cliente desde {formatarData(client.created_at)}
          </p>
        </div>
      </header>

      {/* ---- Contato ---- */}
      <section className="block">
        <h2 className="block__title">Contato</h2>
        <ul className="contact-chips">
          <li>
            <a className="contact-chip" href={`mailto:${client.email}`}>
              <Icon name="mail" size={15} />
              {client.email}
            </a>
          </li>
          {client.phone ? (
            <li>
              <span className="contact-chip">
                <Icon name="chat" size={15} />
                {client.phone}
              </span>
            </li>
          ) : null}
        </ul>
      </section>

      {erro ? (
        <div className="alert alert--error" role="alert">
          <Icon name="close" size={16} />
          {erro}
        </div>
      ) : null}

      {/* ---- Vínculo de projetos ---- */}
      <section className="block">
        <h2 className="block__title">Projetos vinculados</h2>
        <p className="block__hint">
          O que estiver vinculado aqui aparece no painel deste cliente.
        </p>

        {availableProjects.length > 0 ? (
          <form className="link-form" onSubmit={vincular}>
            <label className="sr-only" htmlFor="projeto">
              Escolher projeto para vincular
            </label>
            <select
              id="projeto"
              className="field__control"
              value={selecionado}
              onChange={(event) => setSelecionado(event.target.value)}
            >
              <option value="">Escolher projeto…</option>
              {availableProjects.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.title}
                  {projeto.category ? ` — ${projeto.category}` : ''}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={!selecionado || vinculando}
            >
              {vinculando ? 'Vinculando…' : 'Vincular'}
            </button>
          </form>
        ) : (
          <p className="block__hint">
            {linkedProjects.length > 0
              ? 'Todos os projetos já estão vinculados a este cliente.'
              : 'Nenhum projeto cadastrado ainda — crie um em Projetos.'}
          </p>
        )}

        {linkedProjects.length === 0 ? (
          <EmptyState
            icon="layers"
            title="Nenhum projeto vinculado."
            text="Vincule um projeto acima para ele aparecer no painel do cliente."
          />
        ) : (
          <ul className="rows">
            {linkedProjects.map((projeto) => (
              <li key={projeto.id}>
                <div className="row row--static">
                  <span className="row__main">
                    <span className="row__title">{projeto.title}</span>
                    <span className="row__text">
                      {projeto.category ?? 'sem categoria'}
                    </span>
                  </span>
                  <StatusBadge status={projeto.status} />
                  <button
                    type="button"
                    className="btn btn--danger-soft btn--xs"
                    onClick={() => setParaRemover(projeto)}
                  >
                    Desvincular
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Solicitações ---- */}
      <section className="block">
        <h2 className="block__title">Solicitações deste cliente</h2>

        {requests.length === 0 ? (
          <EmptyState icon="chat" title="Nenhuma solicitação aberta." />
        ) : (
          <ul className="rows">
            {requests.map((item) => (
              <li key={item.id}>
                <Link className="row" to={`/admin/solicitacoes/${item.id}`}>
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

      <ConfirmDialog
        open={Boolean(paraRemover)}
        title="Desvincular projeto?"
        message={
          paraRemover
            ? `"${paraRemover.title}" deixa de aparecer no painel de ${client.name}. O projeto em si não é excluído.`
            : ''
        }
        confirmLabel="Desvincular"
        onConfirm={remover}
        onCancel={() => setParaRemover(null)}
      />
    </>
  );
}
