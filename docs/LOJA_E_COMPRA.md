# Loja do Oliver Inventory no site

O site deixou de ser só portfólio: a home vende o sistema e existem páginas para
comprar, receber e entender o produto. Este documento descreve o que existe, de
onde vem cada informação e o que ainda falta.

## Páginas

| Rota | Arquivo | O que faz |
| --- | --- | --- |
| `/` | `src/pages/Home.jsx` | Início do produto (`Hero`), o sistema (`Product`), preço (`Pricing`) e, abaixo, os serviços sob medida |
| `/comprar` | `src/pages/Buy.jsx` | Formulário de compra; manda os dados ao servidor e leva o cliente ao Mercado Pago |
| `/obrigado` | `src/pages/ThankYou.jsx` | Para onde o Mercado Pago devolve o cliente; só explica o que vem a seguir |
| `/baixar` | `src/pages/Download.jsx` | Download e instruções de instalação |
| `/termos` | `src/pages/Terms.jsx` | Termos de uso |
| `/privacidade` | `src/pages/Privacy.jsx` | Política de privacidade (LGPD) |

As quatro últimas usam `src/components/SiteShell.jsx` (cabeçalho e rodapé simples);
a home mantém o cabeçalho próprio com as âncoras de seção.

## Fluxo da compra

1. `/comprar` valida no navegador (CPF/CNPJ pelo mesmo `shared/taxId.js` do servidor)
   e envia `POST /api/checkout` com `companyName`, `contactName`, `taxId`, `email`,
   `phone`, `devices` e `acceptTerms`.
2. O servidor (`server/services/checkout.js`) valida de novo, limita a 5 pedidos
   por 10 minutos e chama a API de licenciamento. Resposta: `{ checkoutUrl }`.
3. A página só segue para `checkoutUrl` se for `https:`. Erros 400 viram mensagem
   por campo; 409 (documento já cadastrado), 429 e 503 viram um aviso no topo.
4. Pago o plano, o Mercado Pago devolve o cliente em `/obrigado`. **Quem libera a
   licença e manda o e-mail é a API** (webhook + entrega automática), nunca o site.

## De onde vêm os dados

- **Preço e limites:** `shared/plan.js` (`PLAN`). O valor cobrado é o que a API
  calcula; o do site é só estimativa na tela.
- **Textos do produto:** `src/data/product.js`. Só pode citar o que o sistema faz
  hoje (ver `Sistema-Gerenciamento-Estoque/docs/FUNCIONALIDADES.md`). NFC-e fica de
  fora até ser provada em produção.
- **Link do instalador:** variável `VITE_INSTALLER_URL`, lida no build. Em branco, a
  página `/baixar` diz que o link chega por e-mail.
- **Contato e marca:** `src/data/company.js`.

## Visual

O site é só tema escuro (preto com verde só em ação e estado), como já era. As
telas novas usam os mesmos tokens de `src/styles/tokens.css` e ficam em
`src/styles/store.css`. Conferido no navegador em 1024 px e 375 px: sem rolagem
horizontal em nenhuma rota.

## Textos legais

`/termos` e `/privacidade` descrevem só o que o sistema e o contrato fazem hoje,
mas **não foram revistos por advogado** e faltam dados da empresa (ver
`PENDENCIAS.md`). Não divulgue o site antes dessa revisão.
