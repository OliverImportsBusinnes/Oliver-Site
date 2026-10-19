import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { PLAN, formatBRL, monthlyPrice } from '../../shared/plan.js';

/** Preço e calculadora de computadores. O valor cobrado é o do servidor. */
export default function Pricing() {
  const [devices, setDevices] = useState(PLAN.includedDevices);

  return (
    <section className="section section--stack" id="preco" aria-labelledby="preco-title">
      <div className="container">
        <Reveal className="pricing">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Preço
            </span>
            <h2 className="section-head__title" id="preco-title">
              Um preço simples, por computador.
            </h2>
            <p className="section-head__text">
              A mensalidade inclui o primeiro computador. Cada computador a mais
              custa {formatBRL(PLAN.extraDevicePrice)} por mês.
            </p>
            <ul className="pricing__list">
              <li>
                <Icon name="check" size={16} />
                Estoque, comandas, caixa e relatórios inclusos
              </li>
              <li>
                <Icon name="check" size={16} />
                Atualizações do sistema inclusas
              </li>
              <li>
                <Icon name="check" size={16} />
                Cobrança mensal no cartão, cancele quando quiser
              </li>
              <li>
                <Icon name="check" size={16} />
                Suporte por WhatsApp
              </li>
            </ul>
          </div>

          <div className="pricing__card">
            <p className="buy__plan">{PLAN.name}</p>
            <p className="buy__price">
              <strong>{formatBRL(monthlyPrice(devices))}</strong>
              <span>por mês</span>
            </p>

            <div className="field pricing__devices">
              <label className="field__label" htmlFor="preco-computadores">
                Quantos computadores?
              </label>
              <select
                id="preco-computadores"
                className="field__control"
                value={devices}
                onChange={(event) => setDevices(Number(event.target.value))}
              >
                {Array.from({ length: PLAN.maxDevices }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'computador' : 'computadores'}
                  </option>
                ))}
              </select>
            </div>

            <Link
              className="btn btn--primary btn--block btn--lg"
              to="/comprar"
              style={{ marginTop: '1.25rem' }}
            >
              Comprar agora
              <Icon name="arrowRight" size={17} />
            </Link>
            <p className="buy__legal">
              Mais de {PLAN.maxDevices} computadores? Fale com a gente.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
