import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PRODUCT } from '../data/product.js';
import AppMockup from '../components/AppMockup.jsx';
import { COMPANY_NAME, WHATSAPP_MESSAGES } from '../data/company.js';
import { createWhatsAppLink, whatsappLinkProps } from '../utils/contact.js';
import { useMagnetic, usePointerField } from '../hooks/usePointer.js';
import { EVENTS, track } from '../utils/analytics.js';

export default function Hero() {
  const heroRef = usePointerField();
  const ctaRef = useMagnetic(4);

  return (
    <section className="hero" id="inicio" ref={heroRef}>
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__grid" />
        <div className="hero__glow" />
        <div className="hero__spotlight" />
      </div>

      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__brand">
            {COMPANY_NAME}
            <span className="hero__brand-sep" aria-hidden="true" />
            <span className="hero__brand-sub">Software &amp; Digital Solutions</span>
          </p>

          <h1 className="hero__title">
            Estoque e caixa da sua loja{' '}
            <span className="hero__title-accent">sem complicação</span>.
          </h1>

          <p className="hero__text">
            O {PRODUCT.name} controla estoque, comandas, caixa e resultado da
            loja num só sistema para Windows. Compre pelo site e comece a
            vender no mesmo dia.
          </p>

          <div className="hero__actions">
            <Link
              className="btn btn--primary"
              to="/comprar"
              ref={ctaRef}
              onClick={() => track(EVENTS.HERO_CTA_CLICK, { cta: 'comprar' })}
            >
              Comprar agora
              <Icon name="arrowRight" size={17} className="btn__icon" />
            </Link>

            <a
              className="btn btn--ghost"
              href="#sistema"
              onClick={() => track(EVENTS.HERO_CTA_CLICK, { cta: 'sistema' })}
            >
              Conhecer o sistema
            </a>

            <a
              className="btn btn--ghost"
              href={createWhatsAppLink(WHATSAPP_MESSAGES.default)}
              onClick={() => {
                track(EVENTS.HERO_CTA_CLICK, { cta: 'whatsapp' });
                track(EVENTS.WHATSAPP_CLICKED, { origin: 'hero' });
              }}
              {...whatsappLinkProps}
            >
              <Icon name="whatsapp" size={17} />
              Tirar dúvidas
            </a>
          </div>
        </div>

        <div className="hero__visual">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}
