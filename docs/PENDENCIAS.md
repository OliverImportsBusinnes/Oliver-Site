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

  **Andamento (19/10/2026):** o servidor já tem o checkout (`POST /api/checkout`, plano e CPF/CNPJ validados, 147 testes).
  Falta toda a interface: início do produto, `/comprar`, `/obrigado`, `/baixar`, `/termos`, `/privacidade` e a área do
  cliente. Depende da permissão do usuário para rodar `npm ci` (o projeto não tem `node_modules`) e dos textos legais
  serem revistos pelo dono.
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

## Resolvidas

Nenhuma ainda.
