import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { seoFor } from '../../shared/seo.js';

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
    const seo = seoFor(pathname);
    document.title = seo.title;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.head.querySelector(selector)?.setAttribute('content', seo.description);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.head.querySelector(selector)?.setAttribute('content', seo.title);
    }

    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) {
      const base = new URL(canonical.getAttribute('href') || '/', window.location.origin).origin;
      canonical.setAttribute('href', `${base}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`);
    }

    const robots = headTag('meta[name="robots"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      return meta;
    });
    robots.setAttribute('content', seo.noindex ? 'noindex' : 'index, follow');
  }, [pathname]);

  return null;
}
