/* Aplica o tema escolhido antes de a página pintar, para não piscar o tema
   errado. Arquivo separado (e não <script> inline) porque a CSP do site só
   aceita script de arquivo próprio. A lógica completa está em src/app/theme.js;
   a chave do localStorage precisa ser a mesma. */
(function () {
  try {
    var choice = localStorage.getItem('oliver-theme');
    if (choice === 'light' || choice === 'dark') {
      document.documentElement.setAttribute('data-theme', choice);
    }
  } catch (e) {
    /* Sem armazenamento (aba anônima, bloqueio): segue o tema do sistema. */
  }
})();
