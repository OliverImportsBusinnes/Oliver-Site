import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Field from '../components/panel/Field.jsx';
import { useAuth } from '../app/AuthContext.jsx';

export default function Login() {
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
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
    setSending(true);

    try {
      const logged = await login(form.email, form.password);
      const destino = location.state?.from ?? (logged.role === 'ADMIN' ? '/admin' : '/cliente');
      navigate(destino, { replace: true });
    } catch (problem) {
      setError(problem.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth__panel">
        <Link className="auth__brand" to="/">
          <Logo size={30} />
        </Link>

        <h1 className="auth__title">Entrar na sua conta</h1>
        <p className="auth__text">
          Acompanhe seus projetos e converse sobre o desenvolvimento.
        </p>

        {error ? (
          <div className="alert alert--error" role="alert">
            <Icon name="close" size={16} />
            {error}
          </div>
        ) : null}

        <form className="auth__form" onSubmit={submit} noValidate>
          <Field
            id="email"
            label="E-mail"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={update('email')}
            required
          />

          <Field
            id="password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            required
          />

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={sending}
          >
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="auth__foot">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>

        <Link className="auth__back" to="/">
          <Icon name="arrowRight" size={14} className="auth__back-icon" />
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
