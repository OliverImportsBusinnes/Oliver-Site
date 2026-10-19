import { Link } from 'react-router-dom';
import SiteShell from '../components/SiteShell.jsx';
import Icon from '../components/Icon.jsx';
import { createWhatsAppLink, whatsappLinkProps } from '../utils/contact.js';
import { WHATSAPP_MESSAGES } from '../data/company.js';
import { PRODUCT } from '../data/product.js';

/**
 * Para onde o Mercado Pago devolve o cliente depois de pagar. A página não
 * confirma pagamento nenhum (quem confirma é o webhook): ela só diz o que vai
 * acontecer, porque o cliente chega aqui antes de o e-mail existir.
 */
export default function ThankYou() {
  return (
    <SiteShell>
      <div className="store-card">
        <span className="store-badge">
          <Icon name="check" size={22} />
        </span>
        <h1 className="store-card__title">Recebemos o seu pedido.</h1>
        <p className="store-card__text">
          Assim que o Mercado Pago confirmar o pagamento, enviamos um e-mail
          com o <strong>código de ativação</strong> e o link para baixar o{' '}
          {PRODUCT.name}. Isso costuma levar poucos minutos.
        </p>

        <ol className="steps" aria-label="O que acontece agora">
          <li className="steps__item">
            <p className="steps__title">Confira o e-mail</p>
            <p className="steps__text">
              Olhe também a caixa de spam e a de promoções.
            </p>
          </li>
          <li className="steps__item">
            <p className="steps__title">Instale no computador da loja</p>
            <p className="steps__text">
              Use o link do e-mail ou a página de download.
            </p>
          </li>
          <li className="steps__item">
            <p className="steps__title">Digite o código de ativação</p>
            <p className="steps__text">O sistema abre pronto para vender.</p>
          </li>
        </ol>

        <p className="store-note">
          <strong>Passou de uma hora e o e-mail não chegou?</strong> Fale com a
          gente pelo WhatsApp informando o CPF ou CNPJ da compra.
        </p>

        <div className="store-card__actions">
          <Link className="btn btn--primary" to="/baixar">
            Ir para o download
          </Link>
          <a
            className="btn btn--ghost"
            href={createWhatsAppLink(WHATSAPP_MESSAGES.contact)}
            {...whatsappLinkProps}
          >
            <Icon name="whatsapp" size={17} />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
