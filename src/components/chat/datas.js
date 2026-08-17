/* =========================================================================
   Agrupamento de mensagens por dia.
   Fica fora do componente para poder ser testado sem renderizar React.
   ========================================================================= */

const formatadorDia = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

/** Chave estável do dia (AAAA-MM-DD) no fuso local. */
export function chaveDoDia(ms) {
  const data = new Date(Number(ms));
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** "Hoje" / "Ontem" / "12 de agosto de 2026" */
export function rotuloDoDia(ms, hoje = Date.now()) {
  const chaveMensagem = chaveDoDia(ms);

  if (chaveMensagem === chaveDoDia(hoje)) return 'Hoje';

  const ontem = new Date(Number(hoje));
  ontem.setDate(ontem.getDate() - 1);
  if (chaveMensagem === chaveDoDia(ontem.getTime())) return 'Ontem';

  return formatadorDia.format(new Date(Number(ms)));
}

export const horaDaMensagem = (ms) => formatadorHora.format(new Date(Number(ms)));

/**
 * Agrupa em blocos por dia, preservando a ordem cronológica.
 * Devolve [{ chave, rotulo, mensagens }].
 */
export function agruparPorDia(mensagens = [], hoje = Date.now()) {
  const grupos = [];

  for (const mensagem of mensagens) {
    const chave = chaveDoDia(mensagem.created_at);
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.chave === chave) {
      ultimo.mensagens.push(mensagem);
    } else {
      grupos.push({
        chave,
        rotulo: rotuloDoDia(mensagem.created_at, hoje),
        mensagens: [mensagem],
      });
    }
  }

  return grupos;
}
