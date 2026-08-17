/* "O que desenvolvemos" — quatro frentes, apresentadas de forma compacta.
   `items` aparece sempre; `detail` é revelado na interação. */

export const capabilities = [
  {
    id: 'sistemas',
    icon: 'dashboard',
    title: 'Sistemas',
    items: ['ERP', 'PDV', 'Estoque', 'Comandas'],
    detail:
      'Sistemas de gestão feitos para a operação existente, com cadastro único alimentando venda, estoque e relatórios.',
  },
  {
    id: 'web',
    icon: 'browser',
    title: 'Web',
    items: ['Sites', 'Dashboards', 'Web Apps'],
    detail:
      'Interfaces responsivas e rápidas, do site institucional ao painel interno com login e regras de acesso.',
  },
  {
    id: 'automacao',
    icon: 'bolt',
    title: 'Automação',
    items: ['Processos', 'Integrações', 'APIs'],
    detail:
      'Rotinas que executam sozinhas o que hoje é feito na mão, conectando os sistemas que já estão em uso.',
  },
  {
    id: 'dados',
    icon: 'database',
    title: 'Dados',
    items: ['MySQL', 'APIs', 'Arquitetura'],
    detail:
      'Modelagem e organização do banco para os dados sustentarem a aplicação com integridade e consulta rápida.',
  },
];
