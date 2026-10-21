import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { seoHeadFor } from '../../shared/seo.js';

/** Acha (ou cria) uma <meta>/<link> do <head> pelo seletor e devolve o elemento. */
function headTag(selector, create) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = create();
    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * Troca título, descrição, canonical e Open Graph quando a rota muda (P-008). O servidor já entrega o index.html
 * com o título da rota pedida; este componente cuida da navegação dentro do site, que não recarrega a página.
 */
export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonical = document.head.querySelector('link[rel="canonical"]');
    const base = new URL(canonical?.getAttribute('href') || '/', window.location.origin).origin;
    const seo = seoHeadFor(pathname, base);
    document.title = seo.title;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.head.querySelector(selector)?.setAttribute('content', seo.description);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.head.querySelector(selector)?.setAttribute('content', seo.title);
    }

    canonical?.setAttribute('href', seo.url);
    document.head.querySelector('meta[property="og:url"]')?.setAttribute('content', seo.url);

    const robots = headTag('meta[name="robots"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      return meta;
    });
    robots.setAttribute('content', seo.robots);
  }, [pathname]);

  return null;
}
