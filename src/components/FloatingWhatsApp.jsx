import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { WHATSAPP_MESSAGES } from '../data/company.js';
import { createWhatsAppLink, whatsappLinkProps } from '../utils/contact.js';
import { EVENTS, track } from '../utils/analytics.js';
import { FLOATING_WA_OFFSET } from '../config/constants.js';

/**
 * Botão flutuante de WhatsApp. Só aparece depois que a pessoa rola um pouco,
 * para não competir com os CTAs do hero logo na entrada.
 */
export default function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > FLOATING_WA_OFFSET);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      className={`floating-wa${visible ? ' is-visible' : ''}`}
      href={createWhatsAppLink(WHATSAPP_MESSAGES.floating)}
      onClick={() => track(EVENTS.WHATSAPP_CLICKED, { origin: 'flutuante' })}
      aria-label="Falar no WhatsApp"
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : 'true'}
      {...whatsappLinkProps}
    >
      <span className="floating-wa__pulse" aria-hidden="true" />
      <Icon name="whatsapp" size={26} />
      <span className="floating-wa__tooltip">Falar no WhatsApp</span>
    </a>
  );
}
