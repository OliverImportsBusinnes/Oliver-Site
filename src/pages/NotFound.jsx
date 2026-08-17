import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function NotFound() {
  return (
    <main className="auth">
      <div className="auth__panel">
        <Link className="auth__brand" to="/">
          <Logo size={30} />
        </Link>

        <h1 className="auth__title">Página não encontrada</h1>
        <p className="auth__text">
          O endereço que você abriu não existe ou foi movido.
        </p>

        <Link className="btn btn--primary btn--block" to="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
