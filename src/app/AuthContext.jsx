import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

/* =========================================================================
   Estado de autenticação no navegador.

   Isto é conveniência de interface — NÃO é segurança. Quem autoriza é o
   servidor: mesmo que alguém force `user.role = 'ADMIN'` aqui pelo console,
   a API continua devolvendo 403.
   ========================================================================= */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Ao abrir a página, pergunta ao servidor quem está logado (via cookie). */
  useEffect(() => {
    let cancelled = false;

    api
      .get('/auth/me')
      .then(({ user: current }) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null); // 401 é o esperado para visitante
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: logged } = await api.post('/auth/login', { email, password });
    setUser(logged);
    return logged;
  }, []);

  const register = useCallback(async (data) => {
    await api.post('/auth/register', data);
    return login(data.email, data.password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      /* Mesmo se a chamada falhar, o estado local é limpo. */
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN' }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
