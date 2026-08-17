import { useEffect } from 'react';

/**
 * Trava a rolagem do fundo enquanto uma camada sobreposta está aberta,
 * compensando a largura da barra de rolagem para o conteúdo não "pular".
 *
 * Estava duplicado no menu mobile e no modal de projeto — agora é um só.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;

    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [active]);
}
