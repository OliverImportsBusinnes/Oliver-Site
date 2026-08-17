/* =========================================================================
   Preparo do arquivo escolhido no navegador.
   A validação de verdade é no servidor — isto aqui é só para dar retorno
   imediato e não gastar upload com arquivo que seria recusado.
   ========================================================================= */

export const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const LIMITE_BYTES = 3 * 1024 * 1024; // igual ao servidor

export const formatarTamanho = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Lê o arquivo e devolve `{ dataBase64, filename, previewUrl, size }`.
 * Rejeita com mensagem pronta para exibir.
 */
export function prepararImagem(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      reject(new Error('Escolha uma imagem.'));
      return;
    }

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      reject(new Error('Formato não aceito. Envie PNG, JPG, GIF ou WEBP.'));
      return;
    }

    if (arquivo.size > LIMITE_BYTES) {
      reject(
        new Error(
          `A imagem tem ${formatarTamanho(arquivo.size)} e o limite é ${formatarTamanho(LIMITE_BYTES)}.`
        )
      );
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = String(leitor.result);
      resolve({
        dataBase64: resultado.slice(resultado.indexOf(',') + 1),
        previewUrl: resultado,
        filename: arquivo.name,
        size: arquivo.size,
      });
    };

    leitor.onerror = () => reject(new Error('Não consegui ler esse arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
