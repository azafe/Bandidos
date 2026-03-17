// src/components/dashboard/decision/TabGastosFijos.jsx
const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

const PALETTE = [
  "#3b82f6", "#a855f7", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e",
];

export default function TabGastosFijos({ kpis, fixedBreakdown, onBreakdownChange }) {
  const { income, dailyExpenseTotal, groomerCommissions, fixedExpenseTotal } = kpis;
  const commissionRate = kpis.servicesIncome > 0 ? groomerCommissions / kpis.servicesIncome : 0.40;

  const total = fixedBreakdown.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const diff  = total - fixedExpenseTotal;

  // Punto de equilibrio: ingreso mínimo para cubrir todos los costos (margen = 0)
  // fixed / (1 - (daily + commissions%) )
  // commissions% = commissionRate * (servicesIncome / income) ≈ commissionRate (approx for variable part)
  const variableRate = income > 0 ? (dailyExpenseTotal + groomerCommissions) / income : 0;
  const breakEven = variableRate < 1 ? total / (1 - variableRate) : null;

  // Insight: cuánto bajar fijos para llegar al 30%
  // target: income * 0.30 = income - comisiones - diarios - fijos_target
  // fijos_target = income * (1 - 0.30) - comisiones - diarios
  const targetFixed = income * (1 - 0.30) - groomerCommissions - dailyExpenseTotal;
  const fixedGap = total - targetFixed;

  // Mayor gasto
  const biggest = fixedBreakdown.length > 0
    ? fixedBreakdown.reduce((a, b) => ((Number(b.value) || 0) > (Number(a.value) || 0) ? b : a), fixedBreakdown[0])
    : null;

  function updateItem(id, field, value) {
    onBreakdownChange(
      fixedBreakdown.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(id) {
    onBreakdownChange(fixedBreakdown.filter((item) => item.id !== id));
  }

  function addItem() {
    const newId = Date.now();
    onBreakdownChange([...fixedBreakdown, { id: newId, label: "Nuevo ítem", value: 0 }]);
  }

  const diffClass =
    diff === 0 ? "cd-fe-sidebar__diff--green"
    : Math.abs(diff) < 100 ? "cd-fe-sidebar__diff--orange"
    : "cd-fe-sidebar__diff--red";

  return (
    <div className="cd-fe-layout">
      {/* Lista editable */}
      <div>
        <div className="cd-fe-list">
          {fixedBreakdown.map((item, idx) => (
            <div className="cd-fe-item" key={item.id}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: PALETTE[idx % PALETTE.length],
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, "label", e.target.value)}
              />
              <input
                type="number"
                min="0"
                value={item.value}
                onChange={(e) => updateItem(item.id, "value", Number(e.target.value) || 0)}
              />
              <button
                type="button"
                className="cd-fe-item__delete"
                onClick={() => removeItem(item.id)}
                title="Eliminar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="cd-fe-add" onClick={addItem}>
          + Agregar ítem
        </button>
      </div>

      {/* Sidebar */}
      <div className="cd-fe-sidebar">
        {/* Distribución visual */}
        {total > 0 && (
          <div className="cd-fe-sidebar__card">
            <div className="cd-fe-sidebar__label">Distribución</div>
            <div className="cd-dist-bar">
              {fixedBreakdown.map((item, idx) => {
                const v = Number(item.value) || 0;
                if (!v) return null;
                return (
                  <div
                    key={item.id}
                    className="cd-dist-bar__seg"
                    style={{ flex: v / total, background: PALETTE[idx % PALETTE.length] }}
                    title={`${item.label}: ${fmt(v)}`}
                  />
                );
              })}
            </div>
            <div className="cd-dist-legend">
              {fixedBreakdown.map((item, idx) => {
                const v = Number(item.value) || 0;
                if (!v) return null;
                return (
                  <div className="cd-dist-legend__item" key={item.id}>
                    <div className="cd-dist-legend__dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                    <span className="cd-dist-legend__label">{item.label}</span>
                    <span className="cd-dist-legend__val">{pct(v / total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="cd-fe-sidebar__card">
          <div className="cd-fe-sidebar__label">Total gastos fijos</div>
          <div className="cd-fe-sidebar__value">{fmt(total)}</div>
          {income > 0 && (
            <div className="cd-fe-sidebar__sub">{pct(total / income)} de ingresos</div>
          )}
          {diff !== 0 && (
            <div className={`cd-fe-sidebar__diff ${diffClass}`}>
              {diff > 0 ? `+${fmt(diff)}` : fmt(diff)} vs registrado ({fmt(fixedExpenseTotal)})
            </div>
          )}
          {diff === 0 && (
            <div className="cd-fe-sidebar__diff cd-fe-sidebar__diff--green">
              Coincide con los registros
            </div>
          )}
        </div>

        {/* Punto de equilibrio */}
        {breakEven != null && (
          <div className="cd-fe-sidebar__card">
            <div className="cd-fe-sidebar__label">Punto de equilibrio</div>
            <div className="cd-fe-sidebar__value">{fmt(breakEven)}</div>
            <div className="cd-fe-sidebar__sub">Ingresos mínimos para no perder</div>
          </div>
        )}

        {/* Insight */}
        {biggest && (
          <div className="cd-fe-insight">
            Tu mayor gasto es <strong>{biggest.label}</strong> ({fmt(Number(biggest.value) || 0)}).
            {fixedGap > 0
              ? ` Para llegar al 30% de margen, los fijos deberían bajar ${fmt(fixedGap)}.`
              : " ¡Los fijos ya están en rango para un margen del 30%!"}
          </div>
        )}
      </div>
    </div>
  );
}
