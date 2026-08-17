import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Field from '../../components/panel/Field.jsx';
import StatusBadge from '../../components/panel/StatusBadge.jsx';
import EmptyState from '../../components/panel/EmptyState.jsx';
import ConfirmDialog from '../../components/panel/ConfirmDialog.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, withQuery } from '../../api/client.js';

const STATUS = ['RASCUNHO', 'EM_DESENVOLVIMENTO', 'ENTREGUE'];

const VAZIO = {
  title: '',
  tagline: '',
  category: '',
  problem: '',
  solution: '',
  features: '',
  technologies: '',
  image: '',
  link: '',
  status: 'RASCUNHO',
  featured: false,
  isMockup: true,
  isPublic: true,
};

/** Converte "a, b, c" ↔ ['a','b','c'] (o servidor guarda como lista). */
const paraLista = (texto) =>
  texto.split(',').map((item) => item.trim()).filter(Boolean);
const paraTexto = (lista) => (Array.isArray(lista) ? lista.join(', ') : '');

export default function AdminProjects() {
  const { data, loading, reload } = useApi(() =>
    api.get(withQuery('/admin/projects', { limit: 50 }))
  );

  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [errors, setErrors] = useState({});
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState(null);

  const update = (campo) => (event) => {
    const valor =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const novo = () => {
    setForm(VAZIO);
    setEditandoId(null);
    setErrors({});
    setErro(null);
    setAberto(true);
  };

  const editar = (projeto) => {
    setForm({
      title: projeto.title ?? '',
      tagline: projeto.tagline ?? '',
      category: projeto.category ?? '',
      problem: projeto.problem ?? '',
      solution: projeto.solution ?? '',
      features: paraTexto(projeto.features),
      technologies: paraTexto(projeto.technologies),
      image: projeto.image ?? '',
      link: projeto.link ?? '',
      status: projeto.status ?? 'RASCUNHO',
      featured: Boolean(projeto.featured),
      isMockup: Boolean(projeto.isMockup),
      isPublic: Boolean(projeto.isPublic),
    });
    setEditandoId(projeto.id);
    setErrors({});
    setErro(null);
    setAberto(true);
  };

  const salvar = async (event) => {
    event.preventDefault();
    setErrors({});
    setErro(null);
    setSalvando(true);

    const payload = {
      ...form,
      features: paraLista(form.features),
      technologies: paraLista(form.technologies),
    };

    try {
      if (editandoId) {
        await api.put(`/admin/projects/${editandoId}`, payload);
      } else {
        await api.post('/admin/projects', payload);
      }
      setAberto(false);
      reload();
    } catch (problema) {
      setErrors(problema.details ?? {});
      setErro(problema.details ? null : problema.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    const alvo = paraExcluir;
    setParaExcluir(null);
    try {
      await api.delete(`/admin/projects/${alvo.id}`);
      reload();
    } catch (problema) {
      setErro(problema.message);
    }
  };

  const lista = data?.projects ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">
            O que estiver publicado aparece no site — sem precisar mexer no código.
          </p>
        </div>

        <button type="button" className="btn btn--primary btn--sm" onClick={novo}>
          <Icon name="bolt" size={16} />
          Novo projeto
        </button>
      </header>

      {erro ? (
        <div className="alert alert--error" role="alert">
          <Icon name="close" size={16} />
          {erro}
        </div>
      ) : null}

      {aberto ? (
        <section className="block">
          <h2 className="block__title">
            {editandoId ? 'Editar projeto' : 'Novo projeto'}
          </h2>

          <form className="form-card" onSubmit={salvar} noValidate>
            <div className="form-card__row">
              <Field
                id="title"
                label="Título"
                value={form.title}
                onChange={update('title')}
                error={errors.title}
                required
              />
              <Field
                id="category"
                label="Categoria"
                value={form.category}
                onChange={update('category')}
                error={errors.category}
                hint="Ex.: Sistema Desktop, Web, Automação"
              />
            </div>

            <Field
              id="tagline"
              label="Resumo"
              value={form.tagline}
              onChange={update('tagline')}
              error={errors.tagline}
              hint="Uma linha que aparece no card do site."
            />

            <div className="form-card__row">
              <Field
                id="problem"
                label="Problema"
                as="textarea"
                rows={3}
                value={form.problem}
                onChange={update('problem')}
                error={errors.problem}
              />
              <Field
                id="solution"
                label="Solução"
                as="textarea"
                rows={3}
                value={form.solution}
                onChange={update('solution')}
                error={errors.solution}
              />
            </div>

            <div className="form-card__row">
              <Field
                id="features"
                label="Funcionalidades"
                value={form.features}
                onChange={update('features')}
                hint="Separe por vírgula: Estoque, PDV, Comandas"
              />
              <Field
                id="technologies"
                label="Tecnologias"
                value={form.technologies}
                onChange={update('technologies')}
                hint="Separe por vírgula: C#, MySQL"
              />
            </div>

            <div className="form-card__row">
              <Field
                id="image"
                label="Imagem"
                value={form.image}
                onChange={update('image')}
                error={errors.image}
                hint="Caminho em /public, ex.: /projects/erp.svg"
              />
              <Field
                id="link"
                label="Link do projeto"
                value={form.link}
                onChange={update('link')}
                hint="Só http:// ou https:// — outros são descartados."
              />
            </div>

            <Field id="status" label="Status" error={errors.status}>
              <select
                id="status"
                className="field__control"
                value={form.status}
                onChange={update('status')}
              >
                {STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'RASCUNHO'
                      ? 'Rascunho'
                      : status === 'ENTREGUE'
                        ? 'Entregue'
                        : 'Em desenvolvimento'}
                  </option>
                ))}
              </select>
            </Field>

            <div className="switches">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={update('isPublic')}
                />
                <span>Publicado no site</span>
              </label>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={update('featured')}
                />
                <span>Projeto em destaque</span>
              </label>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.isMockup}
                  onChange={update('isMockup')}
                />
                <span>A imagem é mockup ilustrativo</span>
              </label>
            </div>

            <div className="form-card__actions">
              <button type="submit" className="btn btn--primary" disabled={salvando}>
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar projeto'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <p className="panel-loading">Carregando…</p>
      ) : lista.length === 0 ? (
        <EmptyState
          icon="layers"
          title="Nenhum projeto cadastrado."
          text="Crie o primeiro para ele aparecer no site."
          action={
            <button type="button" className="btn btn--primary btn--sm" onClick={novo}>
              Novo projeto
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Status</th>
                <th>No site</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((projeto) => (
                <tr key={projeto.id}>
                  <td data-label="Projeto">
                    <span className="table__stack">
                      <strong>{projeto.title}</strong>
                      <span className="table__muted">
                        {projeto.category ?? 'sem categoria'}
                        {projeto.featured ? ' · destaque' : ''}
                      </span>
                    </span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={projeto.status} />
                  </td>
                  <td data-label="No site">
                    {projeto.isPublic ? (
                      <span className="table__yes">
                        <Icon name="check" size={14} /> Publicado
                      </span>
                    ) : (
                      <span className="table__muted">Oculto</span>
                    )}
                  </td>
                  <td data-label="Ações">
                    <div className="table__actions">
                      <button
                        type="button"
                        className="btn btn--soft btn--xs"
                        onClick={() => editar(projeto)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-soft btn--xs"
                        onClick={() => setParaExcluir(projeto)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(paraExcluir)}
        title="Excluir projeto?"
        message={
          paraExcluir
            ? `"${paraExcluir.title}" será removido do site e do painel. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={excluir}
        onCancel={() => setParaExcluir(null)}
      />
    </>
  );
}
