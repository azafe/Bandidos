// src/components/dashboard/DecisionCenter.jsx
import TabSituacion from "./decision/TabSituacion";
import "../../styles/decision-center.css";

export default function DecisionCenter({ kpis }) {
  if (!kpis) return null;

  return (
    <section className="cd-section" aria-label="Resumen económico">
      <TabSituacion kpis={kpis} />
    </section>
  );
}
