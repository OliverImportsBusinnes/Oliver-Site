/* =========================================================================
   Carrega o `.env` da raiz, quando existe.

   Importado pelos scripts que rodam na SUA máquina (migrate, seed, setup,
   dev-api). Em produção não entra: lá as variáveis vêm do painel do Render, e
   arquivo de senha nenhum sobe para o servidor.

   Precisa ser importado ANTES de `server/config.js`, que lê `process.env` no
   momento em que é carregado.
   ========================================================================= */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CAMINHO = resolve(import.meta.dirname, '..', '.env');

if (existsSync(CAMINHO)) {
  try {
    process.loadEnvFile(CAMINHO);
  } catch (error) {
    /* Arquivo malformado não pode derrubar o script sem explicar por quê. */
    console.warn(`[env] não consegui ler o .env: ${error.message}`);
  }
}
