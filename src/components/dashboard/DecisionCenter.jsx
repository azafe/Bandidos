// src/components/dashboard/DecisionCenter.jsx
import { useEffect, useState } from "react";
import TabSituacion  from "./decision/TabSituacion";
import TabGastosFijos from "./decision/TabGastosFijos";
import TabSimulador   from "./decision/TabSimulador";
import TabProyeccion  from "./decision/TabProyeccion";
import TabPlanAccion  from "./decision/TabPlanAccion";
import "../../styles/decision-center.css";

const TABS = [
  "Situación actual",
  "Gastos fijos",
  "Simulador",
  "Proyección",
  "Plan de acción",
];

const DEFAULT_BREAKDOWN = [
  { id: 1, label: "Alquiler",      value: 0 },
  { id: 2, label: "Sueldos base",  value: 0 },
  { id: 3, label: "Servicios",     value: 0 },
  { id: 4, label: "Seguros",       value: 0 },
];

export default function DecisionCenter({ kpis, fixedExpenses }) {
  const [activeTab, setActiveTab] = useState(0);
  const [fixedBreakdown, setFixedBreakdown] = useState(DEFAULT_BREAKDOWN);

  useEffect(() => {
    if (Array.isArray(fixedExpenses) && fixedExpenses.length > 0) {
      setFixedBreakdown(
        fixedExpenses.map((item, idx) => ({
          id: item.id ?? idx,
          label: item.name || item.label || `Ítem ${idx + 1}`,
          value: Number(item.amount || 0) || 0,
        }))
      );
    } else {
      setFixedBreakdown(DEFAULT_BREAKDOWN);
    }
  }, [fixedExpenses]);

  if (!kpis) return null;

  return (
    <div className="cd-section">
      <h2 className="cd-section__header">Centro de Decisiones</h2>

      <div className="cd-tabs services-tabs">
        {TABS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`tab${activeTab === idx ? " tab--active" : ""}`}
            onClick={() => setActiveTab(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cd-panel">
        {activeTab === 0 && <TabSituacion kpis={kpis} />}
        {activeTab === 1 && (
          <TabGastosFijos
            kpis={kpis}
            fixedBreakdown={fixedBreakdown}
            onBreakdownChange={setFixedBreakdown}
          />
        )}
        {activeTab === 2 && <TabSimulador kpis={kpis} fixedBreakdown={fixedBreakdown} />}
        {activeTab === 3 && <TabProyeccion kpis={kpis} />}
        {activeTab === 4 && <TabPlanAccion kpis={kpis} fixedBreakdown={fixedBreakdown} />}
      </div>
    </div>
  );
}
