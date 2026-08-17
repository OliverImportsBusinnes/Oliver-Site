import { useCallback, useEffect, useState } from 'react';

/**
 * Carrega dados da API cuidando dos três estados que sempre existem:
 * carregando, erro e resultado. Evita repetir o mesmo try/catch em cada tela.
 *
 * `deps` controla o recarregamento; `reload()` força de novo.
 */
export function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    /* Numa recarga, mantém o conteúdo anterior na tela: trocar tudo por
       "carregando" faria a lista piscar a cada atualização. */
    setLoading((atual) => atual || data === null);
    setError(null);

    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((problem) => {
        if (!cancelled) setError(problem);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `data` de propósito fora das dependências: entra só como valor inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload };
}
