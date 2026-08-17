import { useEffect, useState } from 'react';

/**
 * Devolve o id da seção mais visível na tela — usado para destacar o item
 * correspondente no menu. Recebe ids sem `#`.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const ratios = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let best = '';
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });

        if (best) setActive(best);
      },
      {
        threshold: [0.15, 0.35, 0.6],
        rootMargin: '-20% 0px -35% 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
