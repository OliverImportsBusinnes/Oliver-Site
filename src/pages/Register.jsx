import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Field from '../components/panel/Field.jsx';
import { useAuth } from '../app/AuthContext.jsx';

const EMPTY = { name: '', company: '', email: '', phone: '', password: '' };

export default function Register() {
  const { user, register, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  if (user) {
    return <Navigate to={isAdmin ? '/admin' : '/cliente'} replace />;
  }

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setErrors({});
    setSending(true);

    try {
      await register(form);
      navigate('/cliente', { replace: true });
    } catch (problem) {
      /* O servidor devolve erro por campo — aproveitamos para marcar cada um. */
      setErrors(problem.details ?? {});
      setError(problem.details ? null : problem.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth__panel auth__panel--wide">
        <Link className="auth__brand" to="/">
          <Logo size={30} />
        </Link>

        <h1 className="auth__title">Criar conta</h1>
        <p className="auth__text">
          Acompanhe o andamento do seu projeto em um só lugar.
        </p>

        {error ? (
          <div className="alert alert--error" role="alert">
            <Icon name="close" size={16} />
            {error}
          </div>
        ) : null}

        <form className="auth__form" onSubmit={submit} noValidate>
          <div className="auth__row">
            <Field
              id="name"
              label="Nome"
              value={form.name}
              onChange={update('name')}
              error={errors.name}
              autoComplete="name"
              required
            />
            <Field
              id="company"
              label="Empresa"
              value={form.company}
              onChange={update('company')}
              error={errors.company}
              autoComplete="organization"
            />
          </div>

          <div className="auth__row">
            <Field
              id="email"
              label="E-mail"
              type="email"
              value={form.email}
              onChange={update('email')}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Field
              id="phone"
              label="Telefone"
              value={form.phone}
              onChange={update('phone')}
              error={errors.phone}
              autoComplete="tel"
            />
          </div>

          <Field
            id="password"
            label="Senha"
            type="password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint="Ao menos 10 caracteres, misturando letras e números."
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={sending}
          >
            {sending ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="auth__foot">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>

        <Link className="auth__back" to="/">
          <Icon name="arrowRight" size={14} className="auth__back-icon" />
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
