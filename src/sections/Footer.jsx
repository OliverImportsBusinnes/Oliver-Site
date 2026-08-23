import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import AccountButton from '../components/AccountButton.jsx';
import { openCookiePreferences } from '../components/CookieConsent.jsx';
import {
  COMPANY_NAME,
  EMAIL,
  NAV_LINKS,
  WHATSAPP_MESSAGES,
} from '../data/company.js';
import {
  createMailtoLink,
  createWhatsAppLink,
  whatsappDisplay,
  whatsappLinkProps,
} from '../utils/contact.js';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo size={30} />
          <p className="footer__description">
            Software &amp; Digital Solutions — sistemas, web e automação sob
            medida.
          </p>
        </div>

        <nav className="footer__nav" aria-label="Navegação do rodapé">
          <AccountButton className="footer__account" />
          {NAV_LINKS.map((link) => (
            <a key={link.href} className="footer__link" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="footer__contacts">
          <a
            className="footer__link footer__link--icon"
            href={createWhatsAppLink(WHATSAPP_MESSAGES.default)}
            {...whatsappLinkProps}
          >
            <Icon name="whatsapp" size={15} />
            {whatsappDisplay}
          </a>

          <a
            className="footer__link footer__link--icon"
            href={createMailtoLink(WHATSAPP_MESSAGES.contact, 'Contato pelo site')}
          >
            <Icon name="mail" size={15} />
            {EMAIL}
          </a>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>
          © {year} {COMPANY_NAME}. Todos os direitos reservados.
        </p>
        {/* Quem já escolheu precisa poder mudar de ideia sem limpar o
            navegador — é a metade do consentimento que costuma faltar. */}
        <button
          type="button"
          className="footer__link footer__cookies"
          onClick={openCookiePreferences}
        >
          Preferências de cookies
        </button>
      </div>
    </footer>
  );
}
