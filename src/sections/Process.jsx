import Reveal from '../components/Reveal.jsx';
import { processSteps } from '../data/process.js';

export default function Process() {
  return (
    <section className="section" aria-labelledby="processo-title">
      <div className="container">
        <Reveal className="section-head section-head--row">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Processo
            </span>
            <h2 className="section-head__title" id="processo-title">
              Como trabalhamos.
            </h2>
          </div>
        </Reveal>

        <ol className="process">
          {processSteps.map((step, index) => (
            <Reveal as="li" key={step.number} delay={index * 55} className="step">
              <span className="step__number">{step.number}</span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
