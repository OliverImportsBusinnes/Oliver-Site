/**
 * Etiqueta que marca uma arte como ilustrativa.
 * Estava repetida em três lugares com duas classes CSS diferentes.
 *
 * Some sozinha quando o projeto passa a ter print real (`isMockup: false`).
 */
export default function MockupTag({ short = false }) {
  return (
    <span className="mockup-tag">{short ? 'Mockup' : 'Mockup ilustrativo'}</span>
  );
}
