import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { COMPANY_NAME, WHATSAPP_MESSAGES } from '../data/company.js';
import { createWhatsAppLink, whatsappLinkProps } from '../utils/contact.js';

/**
 * Casca das páginas internas da loja (comprar, obrigado, baixar, termos,
 * privacidade). A home tem o cabeçalho próprio, com âncoras de seção; estas
 * páginas só precisam de marca, atalho para comprar e links legais.
 */
export default function SiteShell({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="shell__header">
        <div className="container shell__bar">
          <Link to="/" aria-label={`${COMPANY_NAME}: voltar ao início`}>
            <Logo />
          </Link>

          <nav className="shell__links" aria-label="Navegação">
            <Link className="shell__link" to="/baixar">
              Baixar
            </Link>
            <Link className="shell__link" to="/login">
              Entrar
            </Link>
            <Link className="btn btn--primary btn--sm" to="/comprar">
              Comprar
            </Link>
          </nav>
        </div>
      </header>

      <main className="shell__main container" id="conteudo">
        {children}
      </main>

      <footer className="shell__footer">
        <div className="container shell__footer-inner">
          <p>
            © {year} {COMPANY_NAME}
          </p>
          <nav className="shell__footer-links" aria-label="Rodapé">
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Privacidade</Link>
            <a
              href={createWhatsAppLink(WHATSAPP_MESSAGES.contact)}
              {...whatsappLinkProps}
            >
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
