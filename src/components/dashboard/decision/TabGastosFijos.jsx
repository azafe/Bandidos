// src/components/dashboard/decision/TabGastosFijos.jsx
const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

const PALETTE = [
  "#3b82f6", "#a855f7", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e",
];

export default function TabGastosFijos({ kpis, fixedBreakdown }) {
  const { income, dailyExpenseTotal, groomerCommissions, fixedExpenseTotal } = kpis;

  const total = fixedBreakdown.reduce((s, i) => s + (Number(i.value) || 0), 0) || fixedExpenseTotal;
  const items = fixedBreakdown.filter((i) => Number(i.value) > 0);

  // Punto de equilibrio
  const variableRate = income > 0 ? (dailyExpenseTotal + groomerCommissions) / income : 0;
  const breakEven = variableRate < 1 ? total / (1 - variableRate) : null;

  // Gap para 30%
  const targetFixed = income * (1 - 0.30) - groomerCommissions - dailyExpenseTotal;
  const fixedGap = total - targetFixed;

  // Mayor gasto
  const biggest = items.length > 0
    ? items.reduce((a, b) => (Number(b.value) > Number(a.value) ? b : a), items[0])
    : null;

  const fixedOverIncome = income > 0 ? total / income : 0;

  return (
    <div className="cd-fe-analytics">

      {/* Métricas superiores */}
      <div className="cd-fe-metrics">
        <div className="cd-fe-metric-card">
          <span className="cd-fe-metric-card__label">Total gastos fijos</span>
          <span className="cd-fe-metric-card__value" style={{ color: "#ef4444" }}>{fmt(total)}</span>
          {income > 0 && <span className="cd-fe-metric-card__sub">{pct(fixedOverIncome)} de los ingresos</span>}
        </div>
        {breakEven != null && (
          <div className="cd-fe-metric-card">
            <span className="cd-fe-metric-card__label">Punto de equilibrio</span>
            <span className="cd-fe-metric-card__value">{fmt(breakEven)}</span>
            <span className="cd-fe-metric-card__sub">Ingresos mínimos para no perder</span>
          </div>
        )}
        <div className="cd-fe-metric-card">
          <span className="cd-fe-metric-card__label">Para llegar al 30% de margen</span>
          <span
            className="cd-fe-metric-card__value"
            style={{ color: fixedGap > 0 ? "#ef4444" : "#16a34a" }}
          >
            {fixedGap > 0 ? `Bajar ${fmt(fixedGap)}` : "¡Ya en rango!"}
          </span>
          <span className="cd-fe-metric-card__sub">
            {fixedGap > 0
              ? `Fijos objetivo: ${fmt(Math.max(targetFixed, 0))}`
              : `Excedente: ${fmt(Math.abs(fixedGap))}`}
          </span>
        </div>
      </div>

      {/* Gráfico de distribución */}
      {items.length > 0 ? (
        <div className="cd-fe-chart">
          <div className="cd-fe-chart__title">Distribución de gastos fijos</div>

          {/* Barra apilada grande */}
          <div className="cd-fe-stacked">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="cd-fe-stacked__seg"
                style={{ flex: Number(item.value) / total, background: PALETTE[idx % PALETTE.length] }}
                title={`${item.label}: ${fmt(Number(item.value))}`}
              />
            ))}
          </div>

          {/* Barras por ítem */}
          <div className="cd-fe-bars">
            {items
              .slice()
              .sort((a, b) => Number(b.value) - Number(a.value))
              .map((item, idx) => {
                const val = Number(item.value);
                const originalIdx = fixedBreakdown.findIndex((i) => i.id === item.id);
                const color = PALETTE[originalIdx % PALETTE.length];
                return (
                  <div className="cd-fe-bar-row" key={item.id}>
                    <div className="cd-fe-bar-row__header">
                      <div className="cd-fe-bar-row__dot" style={{ background: color }} />
                      <span className="cd-fe-bar-row__label">{item.label}</span>
                      <span className="cd-fe-bar-row__amount">{fmt(val)}</span>
                      <span className="cd-fe-bar-row__pct">{pct(val / total)}</span>
                    </div>
                    <div className="cd-fe-bar-row__track">
                      <div
                        className="cd-fe-bar-row__fill"
                        style={{ width: `${(val / total) * 100}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="cd-fe-empty">
          No hay ítems de gastos fijos registrados para este período.
        </div>
      )}

      {/* Diagnóstico */}
      {biggest && (
        <div className="cd-diag" style={{ marginTop: 20 }}>
          <div className="cd-diag__title">Diagnóstico</div>

          <div className={`cd-diag__item cd-diag__item--${fixedOverIncome > 0.50 ? "red" : fixedOverIncome > 0.35 ? "orange" : "green"}`}>
            <strong>Peso de los fijos</strong>
            Los gastos fijos representan el {pct(fixedOverIncome)} de los ingresos.
            {fixedOverIncome > 0.50
              ? " Esto es crítico (>50%). Revisá contratos y alquileres urgente."
              : fixedOverIncome > 0.35
                ? " Está elevado (>35%). Buscá oportunidades de reducción."
                : " Bien posicionado."}
          </div>

          <div className={`cd-diag__item cd-diag__item--${fixedGap > 0 ? "orange" : "green"}`}>
            <strong>Mayor gasto: {biggest.label}</strong>
            Representa el {pct(Number(biggest.value) / total)} del total de fijos ({fmt(Number(biggest.value))}).
            {fixedGap > 0
              ? ` Para alcanzar el 30% de margen, los fijos deberían bajar ${fmt(fixedGap)} en total.`
              : " Los fijos están dentro del rango para un margen del 30%."}
          </div>
        </div>
      )}
    </div>
  );
}
