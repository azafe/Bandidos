// src/components/dashboard/decision/TabSimulador.jsx
import { useState } from "react";

const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

function marginInfo(margin) {
  if (margin < 0)    return { color: "#ef4444", label: "EN PÉRDIDA" };
  if (margin < 0.10) return { color: "#f97316", label: "MUY BAJO" };
  if (margin < 0.20) return { color: "#eab308", label: "BAJO" };
  if (margin < 0.30) return { color: "#22c55e", label: "EN CRECIMIENTO" };
  return               { color: "#3b82f6", label: "OBJETIVO ALCANZADO" };
}

export default function TabSimulador({ kpis, fixedBreakdown }) {
  const commissionRate0 = kpis.servicesIncome > 0
    ? kpis.groomerCommissions / kpis.servicesIncome
    : 0.40;

  const fixedFromBreakdown = fixedBreakdown.reduce((s, i) => s + (Number(i.value) || 0), 0);

  const defaults = {
    servicesIncome: kpis.servicesIncome,
    petshopIncome:  kpis.petshopIncome,
    newClients:     0,
    commissionRate: commissionRate0,
    dailyExpenses:  kpis.dailyExpenseTotal,
    fixedExpenses:  fixedFromBreakdown || kpis.fixedExpenseTotal,
    targetMargin:   0.30,
  };

  const [sim, setSim] = useState(defaults);

  const simIncome = sim.servicesIncome + sim.petshopIncome + (sim.newClients * kpis.avgTicket);
  const simCommissions = sim.servicesIncome * sim.commissionRate;
  const simCosts = simCommissions + sim.fixedExpenses + sim.dailyExpenses;
  const simProfit = simIncome - simCosts;
  const simMargin = simIncome > 0 ? simProfit / simIncome : 0;
  const info = marginInfo(simMargin);

  // Panel objetivo
  const targetIncome = simCosts / (1 - sim.targetMargin);
  const gap = targetIncome - simIncome;
  const gapPct = simIncome > 0 ? gap / simIncome : 0;
  const extraClients = kpis.avgTicket > 0 ? Math.ceil(Math.max(gap, 0) / kpis.avgTicket) : 0;

  function update(field, value) {
    setSim((prev) => ({ ...prev, [field]: value }));
  }

  const maxServicesIncome = Math.max(kpis.servicesIncome * 3, 1000);
  const maxPetshopIncome  = Math.max(kpis.petshopIncome  * 3, 1000);
  const maxFixedExpenses  = Math.max(sim.fixedExpenses   * 3, 1000);
  const maxDailyExpenses  = Math.max(sim.dailyExpenses   * 3, 1000);

  // Tabla comparativa
  const rows = [
    { label: "Ingresos servicios", actual: kpis.servicesIncome,      simVal: sim.servicesIncome },
    { label: "Ingresos PetShop",   actual: kpis.petshopIncome,       simVal: sim.petshopIncome + (sim.newClients * kpis.avgTicket) },
    { label: "Comisiones",         actual: kpis.groomerCommissions,   simVal: simCommissions, isCost: true },
    { label: "Gastos fijos",       actual: kpis.fixedExpenseTotal,    simVal: sim.fixedExpenses, isCost: true },
    { label: "Gastos diarios",     actual: kpis.dailyExpenseTotal,    simVal: sim.dailyExpenses, isCost: true },
    { label: "Ganancia neta",      actual: kpis.profit,              simVal: simProfit, isTotal: true },
    { label: "Margen",             actual: kpis.margin,              simVal: simMargin, isMargin: true },
  ];

  const netPct   = simIncome > 0 ? Math.max(simProfit, 0) / simIncome : 0;
  const commPct  = simIncome > 0 ? simCommissions / simIncome : 0;
  const fixedPct = simIncome > 0 ? sim.fixedExpenses / simIncome : 0;
  const dailyPct = simIncome > 0 ? sim.dailyExpenses / simIncome : 0;

  return (
    <div className="cd-sim-layout">
      {/* Sliders */}
      <div className="cd-sim-sliders">
        <SliderGroup
          label="Ingresos servicios"
          value={sim.servicesIncome}
          min={0}
          max={maxServicesIncome}
          step={100}
          fmt={fmt}
          onChange={(v) => update("servicesIncome", v)}
        />
        <SliderGroup
          label="Ingresos PetShop"
          value={sim.petshopIncome}
          min={0}
          max={maxPetshopIncome}
          step={100}
          fmt={fmt}
          onChange={(v) => update("petshopIncome", v)}
        />
        <SliderGroup
          label="Clientes nuevos adicionales"
          value={sim.newClients}
          min={0}
          max={50}
          step={1}
          fmt={(v) => `${v} (${fmt(v * kpis.avgTicket)})`}
          onChange={(v) => update("newClients", v)}
        />
        <SliderGroup
          label="Tasa de comisión"
          value={sim.commissionRate}
          min={0.20}
          max={0.60}
          step={0.01}
          fmt={pct}
          onChange={(v) => update("commissionRate", v)}
        />
        <SliderGroup
          label="Gastos fijos"
          value={sim.fixedExpenses}
          min={0}
          max={maxFixedExpenses}
          step={100}
          fmt={fmt}
          onChange={(v) => update("fixedExpenses", v)}
        />
        <SliderGroup
          label="Gastos diarios"
          value={sim.dailyExpenses}
          min={0}
          max={maxDailyExpenses}
          step={100}
          fmt={fmt}
          onChange={(v) => update("dailyExpenses", v)}
        />

        {/* Objetivo */}
        <div className="cd-slider-group">
          <div className="cd-slider-group__header">
            <span className="cd-slider-group__label">Objetivo de margen</span>
            <span className="cd-slider-group__value">{pct(sim.targetMargin)}</span>
          </div>
          <div className="cd-sim-target-row">
            {[0.10, 0.20, 0.30, 0.40].map((t) => (
              <button
                key={t}
                type="button"
                className={`cd-sim-target-btn${sim.targetMargin === t ? " cd-sim-target-btn--active" : ""}`}
                onClick={() => update("targetMargin", t)}
              >
                {t * 100}%
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="cd-sim-restore" onClick={() => setSim(defaults)}>
          Restaurar valores actuales
        </button>
      </div>

      {/* Panel resultado */}
      <div className="cd-sim-result">
        <div className="cd-sim-result__margin">
          <div className="cd-sim-result__margin-num" style={{ color: info.color }}>
            {pct(simMargin)}
          </div>
          <span className="cd-margin-hero__badge" style={{ background: info.color }}>
            {info.label}
          </span>

          {/* Barra apilada simulada */}
          {simIncome > 0 && (
            <div className="cd-stack-bar" style={{ marginTop: 12 }}>
              {netPct   > 0 && <div className="cd-stack-bar__seg" style={{ flex: netPct,   background: "#3b82f6" }} />}
              {commPct  > 0 && <div className="cd-stack-bar__seg" style={{ flex: commPct,  background: "#a855f7" }} />}
              {fixedPct > 0 && <div className="cd-stack-bar__seg" style={{ flex: fixedPct, background: "#ef4444" }} />}
              {dailyPct > 0 && <div className="cd-stack-bar__seg" style={{ flex: dailyPct, background: "#f97316" }} />}
            </div>
          )}
        </div>

        {/* Tabla comparativa */}
        <table className="cd-compare-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Actual</th>
              <th>Simulado</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const diff = row.simVal - row.actual;
              const better = row.isCost ? diff < 0 : diff > 0;
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.isMargin ? pct(row.actual) : fmt(row.actual)}</td>
                  <td>{row.isMargin ? pct(row.simVal) : fmt(row.simVal)}</td>
                  <td className={diff === 0 ? "" : better ? "cd-compare-table__diff--pos" : "cd-compare-table__diff--neg"}>
                    {diff === 0 ? "—"
                      : row.isMargin
                        ? `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}pp`
                        : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Panel ¿qué necesitás? */}
        <div className={`cd-target-panel${gap > 0 ? " cd-target-panel--gap" : ""}`}>
          <div className="cd-target-panel__title">
            Para llegar al {pct(sim.targetMargin)} de margen
          </div>
          <div className="cd-target-panel__row">
            <span>Ingresos necesarios</span>
            <span>{fmt(targetIncome)}</span>
          </div>
          <div className="cd-target-panel__row">
            <span>Gap en pesos</span>
            <span style={{ color: gap > 0 ? "#dc2626" : "#16a34a" }}>
              {gap > 0 ? `+${fmt(gap)}` : fmt(gap)}
            </span>
          </div>
          {gap > 0 && (
            <>
              <div className="cd-target-panel__row">
                <span>Como % de aumento de precios</span>
                <span>{pct(gapPct)}</span>
              </div>
              <div className="cd-target-panel__row">
                <span>Como clientes adicionales</span>
                <span>{extraClients} clientes</span>
              </div>
            </>
          )}
          {gap <= 0 && (
            <div className="cd-target-panel__row">
              <span>✓ Objetivo alcanzado en simulación</span>
              <span style={{ color: "#16a34a" }}>+{fmt(Math.abs(gap))}</span>
            </div>
          )}
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
