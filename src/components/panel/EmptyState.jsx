import Icon from '../Icon.jsx';

/**
 * Estado vazio honesto: quando não há dado, dizemos que não há — em vez de
 * inventar número ou gráfico de exemplo.
 */
export default function EmptyState({ icon = 'layers', title, text, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {text ? <p className="empty__text">{text}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
