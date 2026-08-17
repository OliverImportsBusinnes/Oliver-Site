import Icon from '../Icon.jsx';

/**
 * Lista de opções do funil. As duas perguntas usam o mesmo componente —
 * antes o markup estava duplicado, mudando só o layout.
 *
 * `layout="grid"` → cartões lado a lado (necessidade)
 * `layout="row"`  → uma opção por linha (estágio)
 */
export default function FunnelOptions({
  options,
  selected,
  onSelect,
  layout = 'row',
}) {
  return (
    <ul className={`funnel__options${layout === 'grid' ? ' funnel__options--grid' : ''}`}>
      {options.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`funnel__option${layout === 'row' ? ' funnel__option--row' : ''}${
              selected === item.id ? ' is-selected' : ''
            }`}
            onClick={() => onSelect(item)}
            aria-pressed={selected === item.id}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
