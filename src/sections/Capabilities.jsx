import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { capabilities } from '../data/capabilities.js';

/**
 * "O que desenvolvemos" — quatro colunas compactas. O detalhe aparece no
 * hover/foco, então a seção fica curta sem esconder informação de quem
 * navega por teclado ou toque (no toque o detalhe fica sempre visível).
 */
export default function Capabilities() {
  return (
    <section className="section" id="solucoes" aria-labelledby="solucoes-title">
      <div className="container">
        <Reveal className="section-head section-head--row">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Soluções
            </span>
            <h2 className="section-head__title" id="solucoes-title">
              O que desenvolvemos.
            </h2>
          </div>
        </Reveal>

        <ul className="caps">
          {capabilities.map((cap, index) => (
            <Reveal as="li" key={cap.id} delay={index * 60} className="cap" tabIndex={0}>
              <span className="cap__icon">
                <Icon name={cap.icon} size={19} />
              </span>

              <h3 className="cap__title">{cap.title}</h3>

              <p className="cap__items">
                {cap.items.map((item, i) => (
                  <span key={item}>
                    {i > 0 ? <span className="cap__sep"> • </span> : null}
                    {item}
                  </span>
                ))}
              </p>

              <p className="cap__detail">{cap.detail}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
