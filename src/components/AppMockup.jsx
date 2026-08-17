/* =========================================================================
   Composição de produto do hero: janela de aplicação com barra de título,
   navegação lateral, indicadores e uma tabela — a cara de um sistema de
   gestão, não de uma ilustração abstrata de código.

   É construída com elementos reais (não uma imagem), então acompanha o tema
   e fica nítida em qualquer resolução.
   ========================================================================= */

import Icon from './Icon.jsx';

const NAV = [
  { icon: 'dashboard', label: 'Painel', active: true },
  { icon: 'browser', label: 'Vendas' },
  { icon: 'layers', label: 'Estoque' },
  { icon: 'database', label: 'Dados' },
];

const ROWS = [
  { code: '#1042', tag: 'PDV', value: 'R$ —', state: 'ok' },
  { code: '#1041', tag: 'Comanda', value: 'R$ —', state: 'ok' },
  { code: '#1040', tag: 'Estoque', value: '—', state: 'wait' },
  { code: '#1039', tag: 'PDV', value: 'R$ —', state: 'ok' },
];

export default function AppMockup() {
  return (
    <div className="mockup" aria-hidden="true">
      <div className="mockup__window">
        {/* Barra da janela */}
        <div className="mockup__bar">
          <span className="mockup__dot" />
          <span className="mockup__dot" />
          <span className="mockup__dot" />
          <span className="mockup__bar-title">Sistema de Gestão</span>
        </div>

        <div className="mockup__body">
          {/* Navegação lateral */}
          <nav className="mockup__nav">
            {NAV.map((item) => (
              <span
                key={item.label}
                className={`mockup__nav-item${item.active ? ' is-active' : ''}`}
              >
                <Icon name={item.icon} size={15} />
                <span className="mockup__nav-label">{item.label}</span>
              </span>
            ))}
          </nav>

          {/* Conteúdo */}
          <div className="mockup__content">
            <div className="mockup__stats">
              {['Vendas', 'Comandas', 'Estoque'].map((label, index) => (
                <div
                  key={label}
                  className={`mockup__stat${index === 0 ? ' is-accent' : ''}`}
                >
                  <span className="mockup__stat-label">{label}</span>
                  <span className="mockup__stat-bar">
                    <span
                      className="mockup__stat-fill"
                      style={{ '--w': ['72%', '48%', '61%'][index] }}
                    />
                  </span>
                </div>
              ))}
            </div>

            <div className="mockup__chart">
              {[38, 62, 45, 78, 56, 88, 67].map((h, index) => (
                <span
                  key={index}
                  className="mockup__chart-bar"
                  style={{ '--h': `${h}%`, '--i': index }}
                />
              ))}
            </div>

            <div className="mockup__table">
              {ROWS.map((row) => (
                <div key={row.code} className="mockup__row">
                  <span className="mockup__row-code">{row.code}</span>
                  <span className="mockup__row-tag">{row.tag}</span>
                  <span className="mockup__row-value">{row.value}</span>
                  <span className={`mockup__row-state is-${row.state}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cartão sobreposto: dá profundidade sem virar enfeite solto */}
      <div className="mockup__float">
        <span className="mockup__float-icon">
          <Icon name="database" size={15} />
        </span>
        <span>
          <span className="mockup__float-title">MySQL</span>
          <span className="mockup__float-sub">dados integrados</span>
        </span>
      </div>
    </div>
  );
}
