import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { FEATURES, PRODUCT, STEPS } from '../data/product.js';

/** O que o sistema faz e como começar a usar. */
export default function Product() {
  return (
    <section className="section" id="sistema" aria-labelledby="sistema-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            O sistema
          </span>
          <h2 className="section-head__title" id="sistema-title">
            {PRODUCT.name}: a sua loja num só lugar.
          </h2>
          <p className="section-head__text">{PRODUCT.tagline}</p>
        </div>

        <Reveal className="features">
          {FEATURES.map((feature) => (
            <article className="feature" key={feature.title}>
              <span className="feature__icon">
                <Icon name={feature.icon} size={20} />
              </span>
              <h3 className="feature__title">{feature.title}</h3>
              <p className="feature__text">{feature.text}</p>
            </article>
          ))}
        </Reveal>

        <ol className="steps" aria-label="Como começar">
          {STEPS.map((step) => (
            <li className="steps__item" key={step.title}>
              <p className="steps__title">{step.title}</p>
              <p className="steps__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
