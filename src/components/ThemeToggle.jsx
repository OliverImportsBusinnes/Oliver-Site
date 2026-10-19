import { useState } from 'react';
import Icon from './Icon.jsx';
import {
  THEME_LABELS,
  applyTheme,
  nextTheme,
  readTheme,
  saveTheme,
} from '../app/theme.js';

const ICONS = { system: 'monitor', light: 'sun', dark: 'moon' };

/**
 * Botão de tema. Cada clique passa para o próximo estado (sistema, claro,
 * escuro) e o rótulo diz o estado atual e o próximo, para leitor de tela.
 */
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(readTheme);
  const next = nextTheme(theme);

  function handleClick() {
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={handleClick}
      aria-label={`${THEME_LABELS[theme]}. Mudar para ${THEME_LABELS[next].toLowerCase()}`}
      title={THEME_LABELS[theme]}
    >
      <Icon name={ICONS[theme]} size={18} />
    </button>
  );
}
