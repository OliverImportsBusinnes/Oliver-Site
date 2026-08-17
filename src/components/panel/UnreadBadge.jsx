import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

/* Confere de tempos em tempos para o menu não ficar desatualizado. */
const INTERVALO = 60_000;

/**
 * Bolinha com o número de mensagens não lidas no item "Mensagens" do menu.
 * Busca só o número (`/conversations/unread`), não a lista inteira.
 */
export default function UnreadBadge() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ativo = true;

    const buscar = async () => {
      try {
        const { unread } = await api.get('/conversations/unread');
        if (ativo) setTotal(unread);
      } catch {
        /* Falha aqui é irrelevante: o indicador some, o menu continua. */
      }
    };

    buscar();
    const timer = setInterval(buscar, INTERVALO);

    /* Ao enviar/ler mensagem, a conversa avisa e o número atualiza na hora. */
    window.addEventListener('mensagens:mudou', buscar);

    return () => {
      ativo = false;
      clearInterval(timer);
      window.removeEventListener('mensagens:mudou', buscar);
    };
  }, []);

  if (!total) return null;

  return (
    <span className="nav-badge" aria-label={`${total} não lidas`}>
      {total > 99 ? '99+' : total}
    </span>
  );
}
