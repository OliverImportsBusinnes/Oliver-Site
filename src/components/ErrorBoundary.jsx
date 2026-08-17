import { Component } from 'react';

/**
 * Checklist — "Erros: sem try-catch, crasha em produção".
 *
 * Sem isto, uma exceção em qualquer componente desmonta a árvore inteira e o
 * visitante vê uma página em branco. Aqui o erro é contido, registrado e o
 * visitante continua com um caminho de contato.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    /* Log sem dado pessoal — só o necessário para diagnosticar. */
    console.error('[erro]', error?.message, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fallback" role="alert">
        <h1 className="fallback__title">Algo saiu do ar por aqui.</h1>
        <p className="fallback__text">
          Tivemos um problema ao carregar esta parte do site. Tente recarregar
          a página — se continuar, fale com a gente pelo WhatsApp.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
