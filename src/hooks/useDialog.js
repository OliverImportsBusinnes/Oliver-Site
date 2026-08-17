import { useEffect, useRef } from 'react';
import { FOCUSABLE_SELECTOR } from '../config/constants.js';
import { useBodyScrollLock } from './useBodyScrollLock.js';

/**
 * Comportamento de diálogo modal, em um lugar só:
 *   · trava a rolagem do fundo;
 *   · move o foco para dentro ao abrir;
 *   · prende o foco (Tab / Shift+Tab dão a volta);
 *   · fecha no Esc;
 *   · devolve o foco a quem abriu.
 *
 * Devolve as refs para o contêiner do diálogo e para o elemento que deve
 * receber o foco inicial.
 */
export function useDialog(open, onClose) {
  const dialogRef = useRef(null);
  const initialFocusRef = useRef(null);
  const previouslyFocused = useRef(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    initialFocusRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return { dialogRef, initialFocusRef };
}
