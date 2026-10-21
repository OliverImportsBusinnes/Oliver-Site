/**
 * Endereço do visitante, para contar pedidos por pessoa e não por servidor.
 *
 * Usa o ÚLTIMO item de `x-forwarded-for`: é o que o proxy de borda acrescentou
 * (na VPS o Caddy põe só o IP real; no Render ele é acrescentado no fim). O
 * primeiro item é o que o cliente mandou e por isso é forjável. Sem o
 * cabeçalho (acesso direto ao processo), vale o IP do socket.
 *
 * Não serve para autorizar nada: aqui ele só reparte uma cota.
 */
export function clientAddress(headers, remoteAddress) {
  const forwarded = headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const items = forwarded.split(',').map((item) => item.trim()).filter(Boolean);
    if (items.length) return items[items.length - 1];
  }
  return typeof remoteAddress === 'string' && remoteAddress ? remoteAddress : 'desconhecido';
}
