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
  `/obrigado`, `/baixar`, `/termos` e `/privacidade` (ver `docs/LOJA_E_COMPRA.md`). Faltam a área do cliente com a licença
  e os downloads (P-009) e a prova da compra de ponta a ponta com o Mercado Pago (P-005 e `docs/COMPRA_AUTOMATICA.md`).

- **P-002** · 2026-10-19 · **A fonte Inter nunca carrega.** O motivo está em dois arquivos:
  - `src/styles/tokens.css` declara `"Inter"`, mas não há `@font-face` nem arquivo de fonte no projeto;
  - o CSP de `server.js` só permite `font-src 'self'`.

  Resultado: o site sempre mostra a fonte do sistema.
- **P-003** · 2026-10-19 · **A home ignora os projetos cadastrados no admin.** A seção `Projects` lê o arquivo
  estático `src/data/projects.js`, e nenhum código do front chama `GET /api/projects`. Projeto criado em
  `/admin/projetos` não aparece na home, ao contrário do que diz o passo 6 do README.
- **P-004** · 2026-10-19 · **O README e um script de desenvolvimento estão desatualizados.**
  - A seção Vercel do README diz que a integração com a API de licenças "ainda não está no GitHub", mas ela está no
    commit `29b5732`.
  - `scripts/dev-api.mjs` ainda afirma que a produção usa a Netlify Function, mas a produção está no Render.
- **P-005** · 2026-10-19 · **O formulário de orçamento nunca foi provado de ponta a ponta.** O teste completo é:
  pedido enviado pelo site → `201` da API de licenças → pedido visível na tela Orçamentos do painel. Esse teste é a
  fase 1 de `Panel-Desktop/docs/CRONOGRAMA.md` e não tem registro de execução.

- **P-006** · 2026-10-19 · **Termos e privacidade sem revisão jurídica e sem dados da empresa.** `/termos` e `/privacidade` foram
  escritos a partir do que o sistema faz, mas faltam razão social, CNPJ e endereço, o foro, a regra do período já pago em
  caso de cancelamento (hoje o texto só diz que o cancelamento interrompe as próximas cobranças) e o prazo de guarda de
  dados. Um advogado precisa revisar antes do lançamento.
- **P-007** · 2026-10-19 · **O mockup da home mostra "MySQL" e dados de exemplo.** `src/components/AppMockup.jsx` é decorativo e
  cita MySQL, enquanto as lojas novas rodam em PostgreSQL. Trocar por capturas reais do sistema (dependem da F5, redesenho).
- **P-008** · 2026-10-19 · **Todas as páginas têm o mesmo título e a mesma descrição.** `index.html` fixa o `<title>` do portfólio;
  `/comprar`, `/baixar`, `/termos` e `/privacidade` deveriam ter título próprio, e o texto de SEO da home ainda fala de
  desenvolvimento de software sob medida.
- **P-009** · 2026-10-19 · **Falta a área do cliente comprador.** Depois da compra o cliente não vê licença, computadores
  ativados, próximo vencimento nem baixa o instalador por uma área logada; hoje só recebe o e-mail. Depende de a API expor
  esses dados ao site.

## Resolvidas

Nenhuma ainda.
