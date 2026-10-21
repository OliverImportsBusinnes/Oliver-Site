/** Hosts onde o checkout pode acontecer: o Mercado Pago e seus subdomínios. */
const HOSTS = ['mercadopago.com.br', 'mercadopago.com'];

/**
 * Só segue para um endereço https do Mercado Pago: a API devolve o link do
 * pagamento, e um link estranho não deve levar o cliente a lugar nenhum.
 */
export function safeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const permitido = HOSTS.some((base) => host === base || host.endsWith(`.${base}`));
    return permitido ? url.toString() : null;
  } catch {
    return null;
  }
}
