/* =========================================================================
   Limite de tentativas em memória (janela deslizante por chave).

   Em memória de propósito: não há tabela para isso e o serviço roda numa
   instância. Reiniciar zera a contagem, e com várias instâncias cada uma teria
   a sua — aceitável para conter spam de formulário e força bruta barata,
   insuficiente para ataque distribuído (problema da camada de rede).

   O mapa tem teto (`maxKeys`): sem ele, quem forja chaves novas a cada pedido
   (documentos diferentes, por exemplo) faria a memória crescer sem limite.
   ========================================================================= */

export function createRateLimiter({ max, windowMs, maxKeys = 10_000 }) {
  /** chave -> instantes dos pedidos aceitos dentro da janela. */
  const recent = new Map();

  function sweep(now) {
    const cutoff = now - windowMs;
    for (const [key, timestamps] of recent) {
      const fresh = timestamps.filter((instant) => instant > cutoff);
      if (fresh.length === 0) recent.delete(key);
      else recent.set(key, fresh);
    }
  }

  /** Registra uma tentativa. Devolve false quando a chave estourou o limite. */
  function hit(key) {
    const now = Date.now();
    sweep(now);

    const timestamps = recent.get(key) ?? [];
    if (timestamps.length >= max) return false;

    /* Teto atingido com chave nova: descarta a mais antiga (a primeira
       inserida no Map). Quem está perto do limite é reinserido a cada hit. */
    if (!recent.has(key)) {
      while (recent.size >= maxKeys) {
        recent.delete(recent.keys().next().value);
      }
    }
    recent.delete(key);
    recent.set(key, [...timestamps, now]);
    return true;
  }

  return { hit, size: () => recent.size };
}
