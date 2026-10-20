# Pendências do Oliver-Site

Registro único de tudo o que ficou para depois neste projeto. Uma pendência resolvida não é apagada: ela vai para
`Resolvidas`, com a data e o que foi feito. Os identificadores nunca são reaproveitados.

## Abertas

- **P-001** · 2026-10-19 · **O site não vende o produto.** A home é um portfólio de agência. Faltam:
  - preço e planos;
  - checkout;
  - download do instalador;
  - área do cliente com licença.

  O usuário decidiu:
  - produto em primeiro lugar e serviços depois;
  - compra automática pelo Mercado Pago;
  - hospedagem numa VPS da Hostinger.

  O plano completo está em `Panel-Desktop/docs/PLANO_LANCAMENTO.html`, nas fases F3, F4 e F5.

  **Andamento (19/10/2026):** o servidor tem o checkout e a interface existe: início do produto, preço, `/comprar`,
  `/obrigado`, `/baixar`, `/termos` e `/privacidade` (ver `docs/LOJA_E_COMPRA.md`). A área do comprador também existe
  (`/minha-licenca`, P-009). Falta a prova da compra de ponta a ponta com o Mercado Pago (P-005 e `docs/COMPRA_AUTOMATICA.md`).

- **P-002** · 2026-10-19 · **A fonte Inter nunca carrega.** O motivo está em dois arquivos:
  - `src/styles/tokens.css` declara `"Inter"`, mas não há `@font-face` nem arquivo de fonte no projeto;
  - o CSP de `server.js` só permite `font-src 'self'`.

  Resultado: o site sempre mostra a fonte do sistema.
- **P-005** · 2026-10-19 · **O formulário de orçamento nunca foi provado de ponta a ponta.** O teste completo é:
  pedido enviado pelo site → `201` da API de licenças → pedido visível na tela Orçamentos do painel. Esse teste é a
  fase 1 de `Panel-Desktop/docs/CRONOGRAMA.md` e não tem registro de execução.

- **P-008** · 2026-10-19 · **Todas as páginas têm o mesmo título e a mesma descrição.** `index.html` fixa o `<title>` do portfólio;
  `/comprar`, `/baixar`, `/termos` e `/privacidade` deveriam ter título próprio, e o texto de SEO da home ainda fala de
  desenvolvimento de software sob medida.
  **Recomendação (19/10/2026):** um título e uma descrição por rota, definidos num só lugar (`src/data/seo.js`) e
  aplicados por um componente pequeno que troca `document.title`, a `meta description` e o `canonical` quando a rota
  muda. O `index.html` passa a vender o produto. Para o Google enxergar o título certo sem rodar JavaScript, o
  servidor Node pode trocar o `<title>` do HTML por rota antes de enviar (custo baixo, sem mudar de framework).

## Resolvidas

- **P-004** · aberta em 2026-10-19 · resolvida em 2026-10-20 · README e `scripts/dev-api.mjs` desatualizados → README
  com as rotas da loja, o produto como conteúdo principal, o portfólio vindo do admin e o aviso do destino na VPS; a nota
  de que a integração "não está no GitHub" saiu; o script não fala mais da Netlify Function.
- **P-003** · aberta em 2026-10-19 · resolvida em 2026-10-20 · A home ignorava os projetos do admin → a seção
  `Projects` lê `GET /api/projects` e usa `src/data/projects.js` só como reserva (carregando, API fora ou nenhum projeto
  público). Conversão em `src/utils/publicProjects.js` com 3 testes. Conferido no navegador: sem projeto público aparecem
  os 3 do arquivo; com um projeto público criado no banco de desenvolvimento, ele vira o destaque.
- **P-006** · aberta em 2026-10-19 · resolvida em 2026-10-19 · Termos e privacidade sem revisão jurídica e sem dados
  da empresa → o dono decidiu não usar advogado por enquanto e aprovou os textos. A razão social vem de `LEGAL_NAME`
  em `src/data/company.js` (hoje igual ao nome da empresa, até o dono informar a razão social); CNPJ e endereço
  ainda não existem e entram no mesmo arquivo quando existirem. Comentários de "revisão pendente" removidos.
- **P-007** · aberta em 2026-10-19 · resolvida em 2026-10-19 · O site citava MySQL → mockup da home, tecnologias,
  projeto em destaque e dica do admin passaram a dizer PostgreSQL (`grep MySQL src` vazio; build ok).
- **P-009** · aberta em 2026-10-19 · resolvida em 2026-10-19 · Faltava a área do cliente comprador → página
  `/minha-licenca` com link de acesso por e-mail (30 min) e resumo da licença, rotas `/api/account/*` no site e
  `/api/v1/site/account/*` na API. Testes: 7 no site, 15 na API (token adulterado, vencido, de outra chave). Conferida
  no navegador com API falsa. A prova com API, banco e e-mail reais fica no P-016 do painel.

Nenhuma ainda.
