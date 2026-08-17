import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import Icon from '../../components/Icon.jsx';
import UnreadBadge from '../../components/panel/UnreadBadge.jsx';
import { useAuth } from '../../app/AuthContext.jsx';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/projetos', label: 'Projetos', icon: 'layers' },
  { to: '/admin/clientes', label: 'Clientes', icon: 'users' },
  { to: '/admin/solicitacoes', label: 'Solicitações', icon: 'bolt' },
  { to: '/admin/mensagens', label: 'Mensagens', icon: 'chat', badge: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const sair = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="panel">
      <aside className={`panel__side${menuOpen ? ' is-open' : ''}`}>
        <Link className="panel__brand" to="/">
          <Logo size={28} />
        </Link>

        <span className="panel__badge">Administração</span>

        <nav className="panel__nav" aria-label="Navegação administrativa">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `panel__link${isActive ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={link.icon} size={17} />
              {link.label}
              {link.badge ? <UnreadBadge /> : null}
            </NavLink>
          ))}
        </nav>

        <div className="panel__side-foot">
          <a className="panel__link panel__link--muted" href="/">
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
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </span>
            <span className="panel__user-info">
              <span className="panel__user-name">{user?.name}</span>
              <span className="panel__user-company">Administrador</span>
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
        <div className="panel__scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      ) : null}
    </div>
  );
}
