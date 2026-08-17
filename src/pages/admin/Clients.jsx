import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, withQuery } from '../../api/client.js';

const formatarData = (ms) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(Number(ms)));

const inicial = (nome = '?') => nome.trim().charAt(0).toUpperCase();

/** "1 projeto" / "2 projetos" — plural correto em vez de "1 projeto(s)". */
const plural = (quantidade, singular, plural_) =>
  `${quantidade} ${quantidade === 1 ? singular : plural_}`;

/**
 * Lista de clientes em cards.
 * A tabela anterior espremia contato, empresa e data em colunas estreitas;
 * o card mostra o que importa (quem é, como falar, o que já tem) e leva
 * direto para a ficha.
 */
export default function AdminClients() {
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');

  const { data, loading } = useApi(
    () => api.get(withQuery('/admin/clients', { search: termo, limit: 50 })),
    [termo]
  );

  const buscar = (event) => {
    event.preventDefault();
    setTermo(busca.trim());
  };

  const limpar = () => {
    setBusca('');
    setTermo('');
  };

  const lista = data?.clients ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            Quem tem conta na área do cliente. Clique em um card para vincular
            projetos e ver as solicitações.
          </p>
        </div>
      </header>

      <form className="search" onSubmit={buscar} role="search">
        <label className="sr-only" htmlFor="busca">
          Buscar cliente
        </label>
        <div className="search__field">
          <Icon name="chat" size={16} />
          <input
            id="busca"
            className="field__control"
            type="search"
            placeholder="Buscar por nome, e-mail ou empresa…"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--ghost btn--sm">
          Buscar
        </button>
        {termo ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={limpar}>
            Limpar
          </button>
        ) : null}
      </form>

      {termo && !loading ? (
        <p className="search__result">
          {plural(lista.length, 'resultado', 'resultados')} para “{termo}”
        </p>
      ) : null}

      {loading ? (
        <p className="panel-loading">Carregando…</p>
      ) : lista.length === 0 ? (
        <EmptyState
          icon="chat"
          title={termo ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          text={
            termo
              ? 'Tente outro nome, e-mail ou empresa.'
              : 'Assim que alguém criar uma conta pelo site, aparece aqui.'
          }
        />
      ) : (
        <ul className="client-cards">
          {lista.map((cliente) => (
            <li key={cliente.id}>
              <Link className="client-card" to={`/admin/clientes/${cliente.id}`}>
                <span className="client-card__top">
                  <span className="client-card__avatar" aria-hidden="true">
                    {inicial(cliente.name)}
                  </span>

                  <span className="client-card__id">
                    <span className="client-card__name">{cliente.name}</span>
                    <span className="client-card__company">
                      {cliente.company || 'Sem empresa informada'}
                    </span>
                  </span>

                  <Icon name="arrowRight" size={16} className="client-card__arrow" />
                </span>

                <span className="client-card__contact">
                  <span className="client-card__line">
                    <Icon name="mail" size={13} />
                    {cliente.email}
                  </span>
                  {cliente.phone ? (
                    <span className="client-card__line">
                      <Icon name="chat" size={13} />
                      {cliente.phone}
                    </span>
                  ) : null}
                </span>

                <span className="client-card__stats">
                  <span
                    className={`client-pill${
                      cliente.projects_count > 0 ? ' is-on' : ''
                    }`}
                  >
                    <Icon name="layers" size={13} />
                    {plural(cliente.projects_count ?? 0, 'projeto', 'projetos')}
                  </span>

                  <span
                    className={`client-pill${
                      cliente.requests_count > 0 ? ' is-on' : ''
                    }`}
                  >
                    <Icon name="bolt" size={13} />
                    {plural(cliente.requests_count ?? 0, 'solicitação', 'solicitações')}
                  </span>

                  <span className="client-card__since">
                    desde {formatarData(cliente.created_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
