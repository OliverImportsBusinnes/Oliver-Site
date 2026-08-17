import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Esconde rotas de quem não deveria vê-las.
 *
 * ⚠️ Isto é experiência de uso, não proteção. A API valida sessão e papel em
 * toda requisição — remover este componente não daria acesso a dado nenhum.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="panel-loading" role="status" aria-live="polite">
        <span className="panel-loading__dot" />
        Carregando…
      </div>
    );
  }

  if (!user) {
    /* Guarda de onde veio para voltar ao destino depois do login. */
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/cliente" replace />;
  }

  return children;
}
