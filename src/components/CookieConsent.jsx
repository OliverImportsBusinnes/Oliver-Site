import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT, readConsent, sendVisit, writeConsent } from '../utils/consent.js';

/** Evento que reabre a escolha (o rodapé dispara). */
const REOPEN_EVENT = 'oi:cookie-preferences';

/** Reabre o aviso para quem quiser rever a escolha. */
export function openCookiePreferences() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
  }
}

/**
 * Aviso de cookies no rodapé da tela.
 *
 * Enquanto não houver escolha, nada é enviado ao servidor — nem uma visita.
 * Aceitar liga o registro de origem (país, cidade, de onde veio o clique e
 * tipo de aparelho); recusar mantém tudo desligado e apaga o identificador
 * guardado no navegador.
 */
export default function CookieConsent() {
  const location = useLocation();
  const [status, setStatus] = useState(() => readConsent());
  const [open, setOpen] = useState(() => readConsent() === null);
  const [details, setDetails] = useState(false);

  /* O botão flutuante do WhatsApp também mora no canto inferior direito.
     Sem isso, em telas estreitas o balão fica em cima do botão "Aceitar" —
     visível e clicável por engano no lugar errado. */
  useEffect(() => {
    document.body.classList.toggle('cookie-consent-open', open);
    return () => document.body.classList.remove('cookie-consent-open');
  }, [open]);

  /* Cada troca de página conta como uma visita, mas só depois do "Aceitar". */
  useEffect(() => {
    if (status !== CONSENT.GRANTED) return;
    sendVisit(location.pathname);
  }, [status, location.pathname]);

  useEffect(() => {
    const reopen = () => {
      setDetails(false);
      setOpen(true);
    };
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const decide = useCallback((choice) => {
    writeConsent(choice);
    setStatus(choice);
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
    >
      <div className="cookie-consent__box">
        <div className="cookie-consent__text">
          <strong className="cookie-consent__title">Este site usa cookies</strong>
          <p>
            Usamos cookies para entender de onde vêm nossas visitas e melhorar o
            que oferecemos. Você pode recusar — o site continua funcionando
            igual.
          </p>

          <button
            type="button"
            className="cookie-consent__link"
            aria-expanded={details}
            onClick={() => setDetails((value) => !value)}
          >
            {details ? 'Ocultar detalhes' : 'O que é coletado?'}
          </button>

          {details && (
            <ul className="cookie-consent__list">
              <li>País, região e cidade aproximados, a partir da conexão.</li>
              <li>De onde você veio (link, busca ou campanha).</li>
              <li>Páginas abertas, idioma e tipo de aparelho.</li>
              <li>
                Um número sorteado, guardado neste navegador, só para não
                contar a mesma pessoa duas vezes.
              </li>
              <li>
                <strong>Não</strong> guardamos seu endereço IP, nome nem
                e-mail nessa contagem.
              </li>
            </ul>
          )}
        </div>

        <div className="cookie-consent__actions">
          <button
            type="button"
            className="btn btn--ghost cookie-consent__button"
            onClick={() => decide(CONSENT.DENIED)}
          >
            Recusar
          </button>
          <button
            type="button"
            className="btn btn--primary cookie-consent__button"
            onClick={() => decide(CONSENT.GRANTED)}
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
