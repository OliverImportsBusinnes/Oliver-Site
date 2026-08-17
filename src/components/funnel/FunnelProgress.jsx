import Icon from '../Icon.jsx';

/** Indicador de etapas. Só permite voltar/avançar para etapas já liberadas. */
export default function FunnelProgress({ steps, current, canReach, onGo }) {
  return (
    <ol className="funnel__progress">
      {steps.map((item, index) => {
        const state =
          index === current ? 'is-current' : index < current ? 'is-done' : 'is-upcoming';

        return (
          <li key={item.number} className={`funnel__progress-item ${state}`}>
            <button
              type="button"
              className="funnel__progress-btn"
              onClick={() => canReach(index) && onGo(index)}
              disabled={!canReach(index)}
              aria-current={index === current ? 'step' : undefined}
            >
              <span className="funnel__progress-number">
                {index < current ? <Icon name="check" size={12} /> : item.number}
              </span>
              <span className="funnel__progress-label">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
