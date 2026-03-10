// src/components/dashboard/KpiGrid.jsx

function fmt(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function fmtPct(ratio) {
  const sign = ratio >= 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(1)}%`;
}

function Delta({ value }) {
  if (value === null || value === undefined) return null;
  // Suprimimos deltas disparatados (>500%) — son ruido cuando el período anterior era ~0
  if (Math.abs(value) > 5) return null;
  const positive = value >= 0;
  return (
    <span className={`kpi-delta ${positive ? "kpi-delta--up" : "kpi-delta--down"}`}>
      {fmtPct(value)} vs período anterior
    </span>
  );
}

function SecondaryKpi({ label, value, delta, note }) {
  return (
    <div className="kpi-secondary-card">
      <span className="kpi-secondary-card__label">{label}</span>
      <span className="kpi-secondary-card__value">{value}</span>
      {note && <span className="kpi-secondary-card__note">{note}</span>}
      <Delta value={delta} />
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  const deltas = kpis.deltas || {};
  const profit = kpis.profit || 0;
  const isPositive = profit >= 0;
  const margin = kpis.margin || 0;
  const totalCosts = kpis.totalCosts || 0;

  // Barras de desglose de costos (proporción visual)
  const expensePct = totalCosts > 0 ? (kpis.expenses / totalCosts) * 100 : 0;
  const commissionPct = totalCosts > 0 ? (kpis.groomerCommissions / totalCosts) * 100 : 0;

  return (
    <section className="kpi-section">

      {/* ── Fila superior: Hero + P&L ────────────────────────────────── */}
      <div className="kpi-top">

        {/* Hero: Ganancia Neta */}
        <div className={`kpi-hero${isPositive ? " kpi-hero--positive" : " kpi-hero--negative"}`}>
          <span className="kpi-hero__eyebrow">Resultado del período</span>
          <div className="kpi-hero__value">{fmt(profit)}</div>
          <div className="kpi-hero__margin">
            Margen: <strong>{(margin * 100).toFixed(1)}%</strong>
          </div>
          <Delta value={deltas.profit} />
          <div className={`kpi-hero__pill ${isPositive ? "kpi-hero__pill--ok" : "kpi-hero__pill--loss"}`}>
            {isPositive ? "En ganancia" : "En pérdida"}
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="kpi-pnl card">
          <h3 className="kpi-pnl__title">Cómo se compone la ganancia</h3>

          <div className="kpi-pnl__rows">
            {/* Ingresos */}
            <div className="kpi-pnl__row kpi-pnl__row--income">
              <div className="kpi-pnl__row-left">
                <span className="kpi-pnl__dot kpi-pnl__dot--income" />
                <span>Ingresos totales</span>
              </div>
              <span className="kpi-pnl__amount">{fmt(kpis.income)}</span>
            </div>
            <div className="kpi-pnl__subrow">
              <span>Servicios de grooming</span>
              <span>{fmt(kpis.servicesIncome)}</span>
            </div>
            {kpis.petshopIncome > 0 && (
              <div className="kpi-pnl__subrow">
                <span>PetShop</span>
                <span>{fmt(kpis.petshopIncome)}</span>
              </div>
            )}

            {/* Gastos operativos */}
            <div className="kpi-pnl__row kpi-pnl__row--expense">
              <div className="kpi-pnl__row-left">
                <span className="kpi-pnl__dot kpi-pnl__dot--expense" />
                <span>− Gastos operativos</span>
              </div>
              <span className="kpi-pnl__amount">{fmt(kpis.expenses)}</span>
            </div>

            {/* Comisiones */}
            <div className="kpi-pnl__row kpi-pnl__row--commission">
              <div className="kpi-pnl__row-left">
                <span className="kpi-pnl__dot kpi-pnl__dot--commission" />
                <div>
                  <span>− Comisiones groomers</span>
                  <span className="kpi-pnl__tag">40% de servicios</span>
                </div>
              </div>
              <span className="kpi-pnl__amount">{fmt(kpis.groomerCommissions)}</span>
            </div>

            {/* Barra visual de composición de costos */}
            {totalCosts > 0 && (
              <div className="kpi-pnl__bar-track">
                <div
                  className="kpi-pnl__bar-segment kpi-pnl__bar-segment--expense"
                  style={{ width: `${expensePct}%` }}
                  title={`Gastos: ${expensePct.toFixed(0)}%`}
                />
                <div
                  className="kpi-pnl__bar-segment kpi-pnl__bar-segment--commission"
                  style={{ width: `${commissionPct}%` }}
                  title={`Comisiones: ${commissionPct.toFixed(0)}%`}
                />
              </div>
            )}

            {/* Resultado */}
            <div className={`kpi-pnl__row kpi-pnl__row--result${isPositive ? " kpi-pnl__row--positive" : " kpi-pnl__row--negative"}`}>
              <div className="kpi-pnl__row-left">
                <span>= Ganancia neta</span>
              </div>
              <span className="kpi-pnl__amount kpi-pnl__amount--result">{fmt(profit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fila secundaria: métricas de operación ────────────────────── */}
      <div className="kpi-secondary">
        <SecondaryKpi
          label="Servicios realizados"
          value={kpis.servicesCount}
          delta={deltas.servicesCount}
        />
        <SecondaryKpi
          label="Ticket promedio"
          value={fmt(kpis.avgTicket)}
          delta={deltas.avgTicket}
        />
        <SecondaryKpi
          label="Ingresos servicios"
          value={fmt(kpis.servicesIncome)}
          delta={deltas.servicesIncome}
        />
        <SecondaryKpi
          label="Ingresos PetShop"
          value={fmt(kpis.petshopIncome)}
          delta={deltas.petshopIncome}
        />
      </div>

    </section>
  );
}
