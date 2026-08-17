import Reveal from '../components/Reveal.jsx';
import { stack } from '../data/stack.js';

/** Tecnologias sem barra de percentual inventada — cada uma com seu papel. */
export default function Stack() {
  return (
    <section className="section section--stack" aria-labelledby="stack-title">
      <div className="container">
        <Reveal className="section-head section-head--row">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Tecnologias
            </span>
            <h2 className="section-head__title" id="stack-title">
              Com o que construímos.
            </h2>
          </div>
        </Reveal>

        <Reveal as="ul" className="stack">
          {stack.map((item) => (
            <li key={item.id} className="stack__item">
              <span className="stack__label">{item.label}</span>
              <span className="stack__role">{item.role}</span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
