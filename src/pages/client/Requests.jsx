import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import Field from '../../components/panel/Field.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api/client.js';

/** Os mesmos tipos aceitos pelo servidor (validados lá também). */
const TIPOS = [
  'Sistema / ERP',
  'Site',
  'Aplicação Web',
  'Automação',
  'Integração',
  'Banco de Dados',
  'Outro',
];

const VAZIO = { type: '', description: '', budget: '', deadline: '' };

export default function ClientRequests() {
  const { data, loading, reload } = useApi(() => api.get('/me/requests'));

  const [form, setForm] = useState(VAZIO);
  const [errors, setErrors] = useState({});
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const update = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const enviar = async (event) => {
    event.preventDefault();
    setErro(null);
    setErrors({});
    setSucesso(false);
    setEnviando(true);

    try {
      await api.post('/me/requests', form);
      setForm(VAZIO);
      setSucesso(true);
      reload();
    } catch (problema) {
      setErrors(problema.details ?? {});
      setErro(problema.details ? null : problema.message);
    } finally {
      setEnviando(false);
    }
  };

  const lista = data?.requests ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Solicitações</h1>
          <p className="page-subtitle">
            Conte o que precisa desenvolver — a conversa continua dentro de cada
            solicitação.
          </p>
        </div>
      </header>

      <section className="block">
        <h2 className="block__title">Nova solicitação</h2>

        {sucesso ? (
          <div className="alert alert--success" role="status">
            <Icon name="check" size={16} />
            Solicitação enviada. Vamos responder por aqui.
          </div>
        ) : null}

        {erro ? (
          <div className="alert alert--error" role="alert">
            <Icon name="close" size={16} />
            {erro}
          </div>
        ) : null}

        <form className="form-card" onSubmit={enviar} noValidate>
          <Field id="type" label="Tipo de projeto" error={errors.type}>
            <select
              id="type"
              className="field__control"
              value={form.type}
              onChange={update('type')}
              required
            >
              <option value="">Selecione…</option>
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="description"
            label="O que você precisa"
            as="textarea"
            rows={4}
            value={form.description}
            onChange={update('description')}
            error={errors.description}
            hint="Ao menos 10 caracteres. Quanto mais contexto, melhor a resposta."
            required
          />

          <div className="form-card__row">
            <Field
              id="budget"
              label="Orçamento estimado"
              value={form.budget}
              onChange={update('budget')}
              error={errors.budget}
              hint="Opcional"
            />
            <Field
              id="deadline"
              label="Prazo desejado"
              value={form.deadline}
              onChange={update('deadline')}
              error={errors.deadline}
              hint="Opcional"
            />
          </div>

          <button type="submit" className="btn btn--primary" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitação'}
            <Icon name="arrowRight" size={16} className="btn__icon" />
          </button>
        </form>
      </section>

      <section className="block">
        <h2 className="block__title">Suas solicitações</h2>

        {loading ? (
          <p className="panel-loading">Carregando…</p>
        ) : lista.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Nenhuma solicitação ainda."
            text="Use o formulário acima para abrir a primeira."
          />
        ) : (
          <ul className="rows">
            {lista.map((item) => (
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
