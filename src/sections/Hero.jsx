import Icon from '../components/Icon.jsx';
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
            Software criado para o jeito que{' '}
            <span className="hero__title-accent">seu negócio funciona</span>.
          </h1>

          <p className="hero__text">
            Sistemas de gestão, aplicações web e automações desenvolvidos sob
            medida — do primeiro levantamento até o sistema rodando.
          </p>

          <div className="hero__actions">
            <a
              className="btn btn--primary"
              href="#projetos"
              ref={ctaRef}
              onClick={() => track(EVENTS.HERO_CTA_CLICK, { cta: 'projetos' })}
            >
              Conhecer projetos
              <Icon name="arrowDown" size={17} className="btn__icon" />
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
              Falar conosco
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
