// src/components/dashboard/decision/TabProyeccion.jsx
import { useMemo, useState } from "react";

const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

export default function TabProyeccion({ kpis }) {
  const commissionRate = kpis.servicesIncome > 0
    ? kpis.groomerCommissions / kpis.servicesIncome
    : 0.40;

  const [sliders, setSliders] = useState({
    newClientsPerMonth:     2,
    priceIncreasePerMonth:  0,
    churnPerMonth:          5,
    costInflationPerMonth:  1,
  });

  function update(field, value) {
    setSliders((prev) => ({ ...prev, [field]: value }));
  }

  const projection = useMemo(() => {
    const baseClients = kpis.servicesCount;
    const baseTicket  = kpis.avgTicket;
    const petshopBase = kpis.petshopIncome;
    const fixedBase   = kpis.fixedExpenseTotal;
    const dailyBase   = kpis.dailyExpenseTotal;

    const months = [];
    let clients = baseClients;

    for (let n = 1; n <= 6; n++) {
      clients = Math.round(clients * (1 - sliders.churnPerMonth / 100) + sliders.newClientsPerMonth);
      const avgTicketN  = baseTicket * Math.pow(1 + sliders.priceIncreasePerMonth / 100, n);
      const servIncome  = clients * avgTicketN;
      const income      = servIncome + petshopBase;
      const commissions = servIncome * commissionRate;
      const costFactor  = Math.pow(1 + sliders.costInflationPerMonth / 100, n);
      const costs       = commissions + (fixedBase + dailyBase) * costFactor;
      const profit      = income - costs;
      const margin      = income > 0 ? profit / income : 0;

      months.push({ n, clients, income, costs, profit, margin });
    }
    return months;
  }, [kpis, sliders, commissionRate]);

  const goalMonth = projection.find((m) => m.margin >= 0.30);
  const totalIncome  = projection.reduce((s, m) => s + m.income, 0);
  const totalProfit  = projection.reduce((s, m) => s + m.profit, 0);

  return (
    <div>
      {/* Sliders */}
      <div className="cd-proj-sliders">
        <SliderGroup
          label="Clientes nuevos/mes"
          value={sliders.newClientsPerMonth}
          min={0} max={20} step={1}
          fmt={(v) => `${v}`}
          onChange={(v) => update("newClientsPerMonth", v)}
        />
        <SliderGroup
          label="Aumento de precios/mes (%)"
          value={sliders.priceIncreasePerMonth}
          min={0} max={10} step={0.5}
          fmt={(v) => `${v}%`}
          onChange={(v) => update("priceIncreasePerMonth", v)}
        />
        <SliderGroup
          label="Churn/mes (%)"
          value={sliders.churnPerMonth}
          min={0} max={30} step={1}
          fmt={(v) => `${v}%`}
          onChange={(v) => update("churnPerMonth", v)}
        />
        <SliderGroup
          label="Inflación de costos/mes (%)"
          value={sliders.costInflationPerMonth}
          min={0} max={10} step={0.5}
          fmt={(v) => `${v}%`}
          onChange={(v) => update("costInflationPerMonth", v)}
        />
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table className="cd-proj-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Clientes</th>
              <th>Ingresos</th>
              <th>Costos</th>
              <th>Ganancia</th>
              <th>Margen</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((m) => {
              const isGoal = goalMonth && m.n === goalMonth.n;
              return (
                <tr
                  key={m.n}
                  className={isGoal ? "cd-proj-table__row--goal" : ""}
                >
                  <td>Mes {m.n}{isGoal ? " ★" : ""}</td>
                  <td style={{ textAlign: "right" }}>{m.clients}</td>
                  <td style={{ textAlign: "right" }}>{fmt(m.income)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(m.costs)}</td>
                  <td style={{ textAlign: "right" }} className={m.profit >= 0 ? "positive" : "negative"}>
                    {fmt(m.profit)}
                  </td>
                  <td style={{ textAlign: "right" }} className={m.margin >= 0.30 ? "positive" : m.margin < 0 ? "negative" : ""}>
                    {pct(m.margin)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards resumen */}
      <div className="cd-proj-cards">
        <div className="cd-proj-card">
          <div className="cd-proj-card__label">Objetivo 30%</div>
          <div className="cd-proj-card__value" style={{ color: goalMonth ? "#3b82f6" : "#ef4444" }}>
            {goalMonth ? `Mes ${goalMonth.n}` : "No alcanzado"}
          </div>
          <div className="cd-proj-card__sub">
            {goalMonth ? "Primer mes con margen ≥ 30%" : "En los próximos 6 meses"}
          </div>
        </div>
        <div className="cd-proj-card">
          <div className="cd-proj-card__label">Ingresos acumulados (6m)</div>
          <div className="cd-proj-card__value">{fmt(totalIncome)}</div>
          <div className="cd-proj-card__sub">Suma proyectada del período</div>
        </div>
        <div className="cd-proj-card">
          <div className="cd-proj-card__label">Ganancia acumulada (6m)</div>
          <div className="cd-proj-card__value" style={{ color: totalProfit >= 0 ? "#16a34a" : "#ef4444" }}>
            {fmt(totalProfit)}
          </div>
          <div className="cd-proj-card__sub">Ganancia neta total proyectada</div>
        </div>
      </div>
    </div>
  );
}

function SliderGroup({ label, value, min, max, step, fmt: fmtFn, onChange }) {
  return (
    <div className="cd-slider-group">
      <div className="cd-slider-group__header">
        <span className="cd-slider-group__label">{label}</span>
        <span className="cd-slider-group__value">{fmtFn(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
