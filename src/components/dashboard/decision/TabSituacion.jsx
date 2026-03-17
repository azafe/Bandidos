// src/components/dashboard/decision/TabSituacion.jsx
const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

function marginInfo(margin) {
  if (margin < 0)    return { color: "#ef4444", bg: "#ef4444", label: "EN PÉRDIDA" };
  if (margin < 0.10) return { color: "#f97316", bg: "#f97316", label: "MUY BAJO" };
  if (margin < 0.20) return { color: "#eab308", bg: "#eab308", label: "BAJO" };
  if (margin < 0.30) return { color: "#22c55e", bg: "#22c55e", label: "EN CRECIMIENTO" };
  return               { color: "#3b82f6", bg: "#3b82f6", label: "OBJETIVO ALCANZADO" };
}

export default function TabSituacion({ kpis }) {
  const {
    income, servicesIncome, petshopIncome,
    expenses, dailyExpenseTotal, fixedExpenseTotal,
    totalCosts, groomerCommissions, profit, margin,
    servicesCount, avgTicket,
  } = kpis;

  const commissionRate = servicesIncome > 0 ? groomerCommissions / servicesIncome : 0.40;
  const info = marginInfo(margin);
  const progressPct = Math.min(margin / 0.30, 1) * 100;

  // Barra apilada: % sobre income
  const netPct    = income > 0 ? Math.max(profit, 0) / income : 0;
  const commPct   = income > 0 ? groomerCommissions / income : 0;
  const fixedPct  = income > 0 ? fixedExpenseTotal / income : 0;
  const dailyPct  = income > 0 ? dailyExpenseTotal / income : 0;

  // Diagnóstico
  const fixedRatio = income > 0 ? fixedExpenseTotal / income : 0;
  const diagFixed = fixedRatio > 0.50
    ? { tone: "red", title: "Gastos fijos elevados", msg: `Los gastos fijos representan el ${pct(fixedRatio)} de tus ingresos (> 50%). Revisá contratos y alquileres.` }
    : { tone: "green", title: "Gastos fijos bajo control", msg: `Los gastos fijos son el ${pct(fixedRatio)} de tus ingresos. Bien posicionado.` };

  const savingPerPp = servicesIncome * 0.01;
  const diagComision = commissionRate > 0.35
    ? { tone: "orange", title: "Comisión sobre el objetivo", msg: `Comisión actual: ${pct(commissionRate)}. Cada punto porcentual de reducción ahorra ${fmt(savingPerPp)}/mes.` }
    : { tone: "green", title: "Comisión en objetivo", msg: `Comisión actual: ${pct(commissionRate)} — dentro del rango objetivo (≤35%).` };

  const ticketImpact = servicesCount * avgTicket * 0.10 * (1 - commissionRate);
  const diagTicket = {
    tone: "blue",
    title: "Impacto de subir precios 10%",
    msg: `Si subís el precio promedio un 10%, generás ${fmt(ticketImpact)} adicionales de ganancia neta.`,
  };

  return (
    <div>
      {/* KPIs */}
      <div className="cd-kpi-row">
        <div className="cd-kpi-box">
          <span className="cd-kpi-box__label">Ingresos totales</span>
          <span className={`cd-kpi-box__value cd-kpi-box__value--income`}>{fmt(income)}</span>
        </div>
        <div className="cd-kpi-box">
          <span className="cd-kpi-box__label">Costos totales</span>
          <span className="cd-kpi-box__value cd-kpi-box__value--costs">{fmt(totalCosts)}</span>
        </div>
        <div className="cd-kpi-box">
          <span className="cd-kpi-box__label">Ganancia neta</span>
          <span className={`cd-kpi-box__value cd-kpi-box__value--profit${profit < 0 ? " negative" : ""}`}>{fmt(profit)}</span>
        </div>
      </div>

      {/* Split: margen + desglose */}
      <div className="cd-split">
        {/* Columna izquierda */}
        <div>
          <div className="cd-margin-hero">
            <span className="cd-margin-hero__number" style={{ color: info.color }}>
              {(margin * 100).toFixed(1)}%
            </span>
            <span className="cd-margin-hero__badge" style={{ background: info.bg }}>
              {info.label}
            </span>
          </div>

          <div className="cd-progress">
            <div className="cd-progress__label">
              <span>Margen actual</span>
              <span>Objetivo: 30%</span>
            </div>
            <div className="cd-progress__track">
              <div
                className="cd-progress__fill"
                style={{ width: `${progressPct}%`, background: info.color }}
              />
            </div>
          </div>

          {/* Barra apilada */}
          {income > 0 && (
            <>
              <div className="cd-stack-bar">
                {netPct  > 0 && <div className="cd-stack-bar__seg" style={{ flex: netPct,   background: "#3b82f6" }} />}
                {commPct > 0 && <div className="cd-stack-bar__seg" style={{ flex: commPct,  background: "#a855f7" }} />}
                {fixedPct > 0 && <div className="cd-stack-bar__seg" style={{ flex: fixedPct, background: "#ef4444" }} />}
                {dailyPct > 0 && <div className="cd-stack-bar__seg" style={{ flex: dailyPct, background: "#f97316" }} />}
                {/* Resto (pérdida) si < 100% */}
                {(1 - netPct - commPct - fixedPct - dailyPct) > 0.001 && (
                  <div className="cd-stack-bar__seg" style={{ flex: 1 - netPct - commPct - fixedPct - dailyPct, background: "rgba(16,19,31,0.1)" }} />
                )}
              </div>
              <div className="cd-stack-bar__legend">
                <div className="cd-stack-bar__legend-item">
                  <div className="cd-stack-bar__legend-dot" style={{ background: "#3b82f6" }} />
                  Ganancia ({pct(netPct)})
                </div>
                <div className="cd-stack-bar__legend-item">
                  <div className="cd-stack-bar__legend-dot" style={{ background: "#a855f7" }} />
                  Comisiones ({pct(commPct)})
                </div>
                <div className="cd-stack-bar__legend-item">
                  <div className="cd-stack-bar__legend-dot" style={{ background: "#ef4444" }} />
                  Fijos ({pct(fixedPct)})
                </div>
                <div className="cd-stack-bar__legend-item">
                  <div className="cd-stack-bar__legend-dot" style={{ background: "#f97316" }} />
                  Diarios ({pct(dailyPct)})
                </div>
              </div>
            </>
          )}
        </div>

        {/* Columna derecha: desglose */}
        <div className="cd-breakdown-list">
          {[
            { label: "Serv. peluquería",  amount: servicesIncome,     pctVal: servicesIncome / income },
            { label: "PetShop",            amount: petshopIncome,      pctVal: petshopIncome / income },
            { label: "Comisiones",         amount: -groomerCommissions, pctVal: groomerCommissions / income },
            { label: "Gastos fijos",       amount: -fixedExpenseTotal,  pctVal: fixedExpenseTotal / income },
            { label: "Gastos diarios",     amount: -dailyExpenseTotal,  pctVal: dailyExpenseTotal / income },
            { label: "Ganancia neta",      amount: profit,             pctVal: margin, bold: true },
          ].map((row) => (
            <div className="cd-breakdown-row" key={row.label}>
              <span className="cd-breakdown-row__label">{row.label}</span>
              <div className="cd-breakdown-row__right">
                <div
                  className="cd-breakdown-row__amount"
                  style={{
                    fontWeight: row.bold ? 800 : 600,
                    color: row.amount < 0 ? "#dc2626" : row.bold ? (profit < 0 ? "#dc2626" : "#16a34a") : "#10131f",
                  }}
                >
                  {row.amount < 0 ? `-${fmt(Math.abs(row.amount))}` : fmt(row.amount)}
                </div>
                {income > 0 && (
                  <div className="cd-breakdown-row__pct">
                    {pct(Math.abs(row.pctVal || 0))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="cd-diag">
        <div className="cd-diag__title">Diagnóstico automático</div>

        <div className={`cd-diag__item cd-diag__item--${diagFixed.tone}`}>
          <strong>{diagFixed.title}</strong>
          {diagFixed.msg}
        </div>

        <div className={`cd-diag__item cd-diag__item--${diagComision.tone}`}>
          <strong>{diagComision.title}</strong>
          {diagComision.msg}
        </div>

        <div className={`cd-diag__item cd-diag__item--${diagTicket.tone}`}>
          <strong>{diagTicket.title}</strong>
          {diagTicket.msg}
        </div>
      </div>
    </div>
  );
}
