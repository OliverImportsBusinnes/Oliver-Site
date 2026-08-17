import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import Icon from '../../components/Icon.jsx';
import UnreadBadge from '../../components/panel/UnreadBadge.jsx';
import { useAuth } from '../../app/AuthContext.jsx';

const LINKS = [
  { to: '/cliente', label: 'Painel', icon: 'dashboard', end: true },
  { to: '/cliente/solicitacoes', label: 'Solicitações', icon: 'layers' },
  { to: '/cliente/mensagens', label: 'Mensagens', icon: 'chat', badge: true },
];

/** Moldura da área do cliente: navegação lateral + conteúdo da rota. */
export default function ClientLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const sair = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const inicial = (user?.name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div className="panel">
      <aside className={`panel__side${menuOpen ? ' is-open' : ''}`}>
        <Link className="panel__brand" to="/">
          <Logo size={28} />
        </Link>

        <nav className="panel__nav" aria-label="Navegação da área do cliente">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `panel__link${isActive ? ' is-active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={link.icon} size={17} />
              {link.label}
              {link.badge ? <UnreadBadge /> : null}
            </NavLink>
          ))}

          {isAdmin ? (
            <NavLink className="panel__link" to="/admin" onClick={() => setMenuOpen(false)}>
              <Icon name="cpu" size={17} />
              Painel admin
            </NavLink>
          ) : null}
        </nav>

        <div className="panel__side-foot">
          <a
            className="panel__link panel__link--muted"
            href="/"
          >
            <Icon name="arrowRight" size={16} className="panel__link-back" />
            Voltar ao site
          </a>
        </div>
      </aside>

      <div className="panel__main">
        <header className="panel__top">
          <button
            type="button"
            className="btn btn--soft btn--icon panel__burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>

          <div className="panel__user">
            <span className="panel__avatar" aria-hidden="true">
              {inicial}
            </span>
            <span className="panel__user-info">
              <span className="panel__user-name">{user?.name}</span>
              {user?.company ? (
                <span className="panel__user-company">{user.company}</span>
              ) : null}
            </span>
          </div>

          <button type="button" className="btn btn--soft btn--xs" onClick={sair}>
            <Icon name="arrowUpRight" size={15} />
            Sair
          </button>
        </header>

        <main className="panel__content">
          <Outlet />
        </main>
      </div>

      {menuOpen ? (
        <div
          className="panel__scrim"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
