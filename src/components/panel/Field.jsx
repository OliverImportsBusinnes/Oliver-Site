/**
 * Campo de formulário com rótulo, erro e acessibilidade ligada:
 * o erro é anunciado por leitor de tela e apontado por `aria-describedby`.
 */
export default function Field({
  id,
  label,
  error,
  hint,
  as = 'input',
  children,
  ...props
}) {
  const Tag = as;
  const errorId = error ? `${id}-erro` : undefined;
  const hintId = hint ? `${id}-dica` : undefined;

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      {children ?? (
        <Tag
          id={id}
          className="field__control"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
      )}

      {hint && !error ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
