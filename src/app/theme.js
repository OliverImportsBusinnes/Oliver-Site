/* =========================================================================
   Tema claro / escuro.
   -------------------------------------------------------------------------
   Três estados: "system" (padrão, segue o Windows/celular), "light" e "dark".
   A escolha vira o atributo data-theme no <html>, que é o que o CSS lê
   (src/styles/tokens.css). Sem escolha não há atributo, e vale a media query
   prefers-color-scheme. public/theme-init.js aplica a escolha antes da
   primeira pintura; este módulo cuida das trocas depois disso.
   ========================================================================= */

export const THEME_KEY = 'oliver-theme';
export const THEMES = ['system', 'light', 'dark'];

export function readTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice, root = document.documentElement) {
  if (choice === 'light' || choice === 'dark') {
    root.setAttribute('data-theme', choice);
  } else {
    root.removeAttribute('data-theme');
  }
}

export function saveTheme(choice) {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* Sem armazenamento: a escolha vale só até recarregar a página. */
  }
}

/** Próximo estado do botão: sistema → claro → escuro → sistema. */
export function nextTheme(choice) {
  const index = THEMES.indexOf(choice);
  return THEMES[(index + 1) % THEMES.length];
}

export const THEME_LABELS = {
  system: 'Tema do sistema',
  light: 'Tema claro',
  dark: 'Tema escuro',
};
