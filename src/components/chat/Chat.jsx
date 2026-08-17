import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import ChatMessage from './ChatMessage.jsx';
import EmptyState from '../panel/EmptyState.jsx';
import { agruparPorDia } from './datas.js';
import { formatarTamanho, prepararImagem, TIPOS_ACEITOS } from './anexo.js';
import { api } from '../../api/client.js';

const LIMITE = 4000;

/* Enquanto a conversa está aberta, busca mensagens novas de tempos em tempos.
   30s é o suficiente para parecer vivo sem martelar o servidor. */
const INTERVALO_ATUALIZACAO = 30_000;

/**
 * Conversa de uma solicitação: lista, envio de texto e de imagem.
 * A aparência de cada mensagem fica em `ChatMessage`.
 */
export default function Chat({ requestId, currentUser, onSent, variant }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const fimDaLista = useRef(null);
  const primeiraCarga = useRef(true);
  const campoArquivo = useRef(null);

  /* Em ref para o callback do pai não reiniciar o efeito de polling. */
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;

  const carregar = async ({ silencioso = false } = {}) => {
    if (!silencioso) setCarregando(true);
    try {
      const { messages } = await api.get(`/requests/${requestId}/messages`);
      setMensagens(messages);
      setErro(null);
      /* A lista de conversas e o indicador do menu dependem disto. */
      onSentRef.current?.();
      window.dispatchEvent(new Event('mensagens:mudou'));
    } catch (problema) {
      /* Falha na atualização automática não pode apagar a conversa da tela. */
      if (!silencioso) setErro(problema.message);
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  useEffect(() => {
    primeiraCarga.current = true;
    carregar();

    const timer = setInterval(() => carregar({ silencioso: true }), INTERVALO_ATUALIZACAO);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  /* Rola para a última mensagem: sem animação na abertura, suave depois. */
  useEffect(() => {
    if (!mensagens.length) return;
    fimDaLista.current?.scrollIntoView({
      behavior: primeiraCarga.current ? 'auto' : 'smooth',
      block: 'nearest',
    });
    primeiraCarga.current = false;
  }, [mensagens]);

  const grupos = useMemo(() => agruparPorDia(mensagens), [mensagens]);

  const escolherArquivo = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = ''; // permite reescolher o mesmo arquivo
    if (!arquivo) return;

    setErro(null);
    try {
      setImagem(await prepararImagem(arquivo));
    } catch (problema) {
      setErro(problema.message);
    }
  };

  const enviar = async (event) => {
    event?.preventDefault();
    const corpo = texto.trim();
    /* Com imagem, texto é opcional — o servidor aceita os dois casos. */
    if ((!corpo && !imagem) || enviando) return;

    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/requests/${requestId}/messages`, {
        body: corpo,
        ...(imagem
          ? { image: { dataBase64: imagem.dataBase64, filename: imagem.filename } }
          : {}),
      });
      setTexto('');
      setImagem(null);
      await carregar({ silencioso: true });
    } catch (problema) {
      setErro(problema.message);
    } finally {
      setEnviando(false);
    }
  };

  /* Enter envia, Shift+Enter quebra linha — comportamento esperado num chat. */
  const aoTeclar = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      enviar();
    }
  };

  const restantes = LIMITE - texto.length;
  const podeEnviar = Boolean(texto.trim() || imagem);

  return (
    <div className={`chat${variant === 'inbox' ? ' chat--inbox' : ''}`}>
      <div className="chat__stream" role="log" aria-live="polite" aria-label="Conversa">
        {carregando ? (
          <p className="panel-loading">Carregando mensagens…</p>
        ) : mensagens.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Nenhuma mensagem ainda."
            text="Escreva abaixo ou envie uma imagem para começar."
          />
        ) : (
          grupos.map((grupo) => (
            <section className="chat__day" key={grupo.chave}>
              <div className="chat__day-label">
                <span>{grupo.rotulo}</span>
              </div>

              {grupo.mensagens.map((mensagem, indice) => (
                <ChatMessage
                  key={mensagem.id}
                  mensagem={mensagem}
                  minha={mensagem.author_id === currentUser?.id}
                  /* Mensagens seguidas do mesmo autor não repetem o cabeçalho. */
                  agrupada={
                    indice > 0 &&
                    grupo.mensagens[indice - 1].author_id === mensagem.author_id
                  }
                />
              ))}
            </section>
          ))
        )}

        <div ref={fimDaLista} aria-hidden="true" />
      </div>

      {erro ? (
        <div className="alert alert--error" role="alert">
          <Icon name="close" size={16} />
          {erro}
        </div>
      ) : null}

      <form className="chat-form" onSubmit={enviar}>
        {/* Prévia da imagem escolhida, antes de enviar */}
        {imagem ? (
          <div className="chat-anexo">
            <img className="chat-anexo__thumb" src={imagem.previewUrl} alt="" />
            <span className="chat-anexo__info">
              <span className="chat-anexo__nome">{imagem.filename}</span>
              <span className="chat-anexo__tam">{formatarTamanho(imagem.size)}</span>
            </span>
            <button
              type="button"
              className="btn btn--soft btn--icon btn--xs"
              onClick={() => setImagem(null)}
              aria-label="Remover imagem"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : null}

        <label className="sr-only" htmlFor="mensagem">
          Escreva uma mensagem
        </label>

        <div className="chat-form__box">
          <input
            ref={campoArquivo}
            type="file"
            className="sr-only"
            accept={TIPOS_ACEITOS.join(',')}
            onChange={escolherArquivo}
            tabIndex={-1}
          />

          <button
            type="button"
            className="chat-form__anexar"
            onClick={() => campoArquivo.current?.click()}
            aria-label="Anexar imagem"
            title="Anexar imagem (PNG, JPG, GIF ou WEBP)"
          >
            <Icon name="image" size={18} />
          </button>

          <textarea
            id="mensagem"
            className="chat-form__input"
            rows={2}
            value={texto}
            maxLength={LIMITE}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={aoTeclar}
            placeholder={imagem ? 'Escreva algo junto (opcional)…' : 'Escreva uma mensagem…'}
          />

          <button
            type="submit"
            className="chat-form__send"
            disabled={enviando || !podeEnviar}
            aria-label="Enviar mensagem"
          >
            {enviando ? (
              <span className="chat-form__spinner" aria-hidden="true" />
            ) : (
              <Icon name="arrowRight" size={18} />
            )}
          </button>
        </div>

        <div className="chat-form__foot">
          <span>Enter envia · Shift+Enter quebra linha</span>
          {restantes < 500 ? (
            <span className={restantes < 50 ? 'is-warn' : undefined}>
              {restantes} caracteres restantes
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
