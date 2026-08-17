import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../app/AuthContext.jsx';

/* Verifica de tempos em tempos. 45s é frequente o bastante para parecer
   instantâneo sem transformar o site num gerador de requisições. */
const INTERVALO = 45_000;

/**
 * Avisa que chegou mensagem nova, em qualquer página do site — inclusive na
 * home, fora do painel.
 *
 * Só compara o total de não lidas: quando SOBE, é porque chegou algo. Não
 * dispara na primeira carga (senão avisaria de mensagens antigas toda vez que
 * a pessoa abrisse o site).
 */
export default function MessageNotifier() {
  const { user, isAdmin } = useAuth();
  const [aviso, setAviso] = useState(null);
  const anterior = useRef(null);

  useEffect(() => {
    if (!user) {
      anterior.current = null;
      setAviso(null);
      return undefined;
    }

    let ativo = true;

    const verificar = async () => {
      try {
        const { unread } = await api.get('/conversations/unread');
        if (!ativo) return;

        const antes = anterior.current;
        anterior.current = unread;

        /* Primeira leitura só estabelece a base. */
        if (antes === null) return;

        if (unread > antes) {
          setAviso({ total: unread, novas: unread - antes });
        } else if (unread === 0) {
          setAviso(null); // leu tudo: o aviso perde sentido
        }
      } catch {
        /* Sessão expirada ou rede fora: silencioso, não é função crítica. */
      }
    };

    verificar();
    const timer = setInterval(verificar, INTERVALO);
    window.addEventListener('mensagens:mudou', verificar);

    return () => {
      ativo = false;
      clearInterval(timer);
      window.removeEventListener('mensagens:mudou', verificar);
    };
  }, [user]);

  if (!aviso) return null;

  const destino = isAdmin ? '/admin/mensagens' : '/cliente/mensagens';

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__icon">
        <Icon name="chat" size={18} />
      </span>

      <div className="toast__body">
        <strong className="toast__title">
          {aviso.novas === 1 ? 'Nova mensagem' : `${aviso.novas} novas mensagens`}
        </strong>
        <span className="toast__text">
          {aviso.total} não lida{aviso.total > 1 ? 's' : ''} no total.
        </span>
      </div>

      <Link className="btn btn--primary btn--xs" to={destino} onClick={() => setAviso(null)}>
        Abrir
      </Link>

      <button
        type="button"
        className="toast__close"
        onClick={() => setAviso(null)}
        aria-label="Dispensar aviso"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
