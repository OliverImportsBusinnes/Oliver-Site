import { useEffect, useRef, useState } from 'react';

/**
 * Revela o conteúdo quando ele entra na viewport (fade + slide-up).
 * O observer é descartado após a primeira exibição — nada fica escutando scroll.
 * Quem prefere menos movimento recebe o conteúdo já visível (ver components.css).
 */
export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  onReveal,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  /* Mantido em ref para não reiniciar o observer quando o callback muda. */
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    /* Rede de segurança: um observer saudável entrega uma primeira entrada
       imediatamente (mesmo sem interseção). Se nada chegar, o ambiente não
       está entregando callbacks — mostramos o conteúdo em vez de deixá-lo
       invisível para sempre. */
    let gotEntry = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        gotEntry = true;
        if (entry.isIntersecting) {
          setVisible(true);
          onRevealRef.current?.();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);

    const fallback = setTimeout(() => {
      if (!gotEntry) setVisible(true);
    }, 1200);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${
        className ? ` ${className}` : ''
      }`}
      style={delay ? { ...style, '--reveal-delay': `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
