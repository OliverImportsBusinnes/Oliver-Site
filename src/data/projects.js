/* =========================================================================
   PROJETOS — o conteúdo central do site.
   -------------------------------------------------------------------------
   COMO TROCAR PELAS IMAGENS REAIS DOS SEUS SISTEMAS:

   1. Coloque o print em `public/projects/` (ex.: erp-dashboard.png).
   2. Aponte `image` para ele: image: '/projects/erp-dashboard.png'.
   3. Mude `isMockup` para `false` — isso remove a etiqueta "Mockup
      ilustrativo" que aparece sobre a imagem.
   4. Opcional: adicione mais prints em `gallery` para aparecerem no detalhe.

   Enquanto `isMockup: true`, o site deixa explícito que a arte é ilustrativa,
   para não passar um sistema fictício como se fosse um produto entregue.

   Campos: id, title, tagline, category, status, technologies, image, imageAlt,
   isMockup, featured, gallery, problem, solution, features, link.
   `link: null` esconde o botão "Abrir projeto" em vez de gerar link morto.
   ========================================================================= */

export const projects = [
  {
    id: 'erp',
    title: 'Sistema de Gestão Empresarial',
    tagline: 'Estoque, vendas, PDV e comandas em um sistema só.',
    category: 'Sistema Desktop',
    status: 'Em desenvolvimento',
    technologies: ['C#', 'MySQL', 'PDV', 'Estoque', 'Comandas'],
    image: '/projects/erp.svg',
    imageAlt:
      'Tela de sistema de gestão com painel de vendas, estoque, comandas e relatórios',
    isMockup: true,
    featured: true,
    gallery: [],
    problem:
      'Venda, estoque e comandas viviam em fluxos separados, obrigando a repetir a mesma informação em mais de um lugar e dificultando enxergar a operação como um todo.',
    solution:
      'Um sistema integrado onde o mesmo cadastro alimenta o PDV, o controle de estoque e o fechamento de comandas, com os dados centralizados em um banco MySQL.',
    features: [
      'Controle de estoque',
      'Registro de vendas',
      'PDV',
      'Comandas',
      'Banco de dados MySQL',
      'Relatórios operacionais',
    ],
    link: null,
  },
  {
    id: 'site-institucional',
    title: 'Site Institucional',
    tagline: 'Presença digital responsiva e rápida.',
    category: 'Web',
    status: 'Entregue',
    technologies: ['HTML', 'CSS', 'JavaScript', 'Netlify'],
    image: '/projects/site.svg',
    imageAlt:
      'Layout de site institucional responsivo exibido em navegador e celular',
    isMockup: true,
    featured: false,
    gallery: [],
    problem:
      'A empresa não tinha uma presença digital que correspondesse ao nível do trabalho que entrega.',
    solution:
      'Site institucional moderno e responsivo, construído para carregar rápido e funcionar bem em qualquer tela, publicado com deploy contínuo.',
    features: [
      'Layout responsivo',
      'Performance otimizada',
      'Estrutura para SEO',
      'Deploy contínuo',
    ],
    link: null,
  },
  {
    id: 'automacao',
    title: 'Automação de Processos',
    tagline: 'Menos trabalho manual, menos erro de digitação.',
    category: 'Automação',
    status: 'Entregue',
    technologies: ['Python', 'APIs', 'Integrações'],
    image: '/projects/automacao.svg',
    imageAlt:
      'Diagrama de fluxo de automação conectando etapas de um processo por APIs',
    isMockup: true,
    featured: false,
    gallery: [],
    problem:
      'Tarefas repetitivas consumiam tempo da equipe e abriam espaço para erro humano a cada repetição.',
    solution:
      'Rotinas automatizadas em Python que integram os sistemas envolvidos por API e executam o processo sem intervenção manual.',
    features: [
      'Rotinas automatizadas',
      'Integração entre sistemas',
      'Consumo de APIs',
      'Tratamento de erros',
    ],
    link: null,
  },
];

export const featuredProject = projects.find((p) => p.featured) ?? projects[0];
export const otherProjects = projects.filter((p) => p.id !== featuredProject.id);
