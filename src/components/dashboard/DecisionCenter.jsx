// src/components/dashboard/DecisionCenter.jsx
import TabSituacion from "./decision/TabSituacion";
import "../../styles/decision-center.css";

export default function DecisionCenter({ kpis }) {
  if (!kpis) return null;

  return (
    <div className="cd-section">
      <div className="cd-panel">
        <TabSituacion kpis={kpis} />
      </div>
    </div>
  );
}
