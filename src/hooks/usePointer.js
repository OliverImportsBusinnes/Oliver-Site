import { useEffect, useRef } from 'react';

/**
 * Interações com o cursor só fazem sentido em ponteiro fino (mouse/trackpad)
 * e para quem não pediu menos movimento. No toque, tudo isso fica desligado.
 */
export function canUsePointerEffects() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Publica a posição do cursor dentro do elemento como variáveis CSS:
 *   --mx / --my  → posição absoluta em px (para o glow)
 *   --px / --py  → deslocamento de -1 a 1 a partir do centro (para parallax)
 * A escrita é agendada em rAF, então no máximo uma atualização por frame.
 */
export function usePointerField() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canUsePointerEffects()) return undefined;

    let frame = 0;
    let pending = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      const { x, y, px, py } = pending;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };

    const onMove = (event) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pending = {
        x,
        y,
        px: (x / rect.width - 0.5) * 2,
        py: (y / rect.height - 0.5) * 2,
      };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return ref;
}

/**
 * Efeito magnético: o elemento se desloca alguns pixels na direção do cursor
 * quando ele passa perto. Sutil de propósito — no máximo `strength` px.
 */
export function useMagnetic(strength = 6) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canUsePointerEffects()) return undefined;

    let frame = 0;

    const onMove = (event) => {
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        /* `translate` (e não `transform`) para somar ao lift do :hover
           em vez de sobrescrevê-lo. */
        el.style.translate = `${(dx * strength).toFixed(2)}px ${(
          dy * strength
        ).toFixed(2)}px`;
      });
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.translate = '';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.translate = '';
    };
  }, [strength]);

  return ref;
}
