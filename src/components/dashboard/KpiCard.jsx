// src/components/dashboard/KpiCard.jsx
export default function KpiCard({ label, value, delta, tone, helper, subtitle }) {
  const isPositive = delta >= 0;
  const badgeClass = isPositive ? "badge badge--positive" : "badge badge--negative";
  const formattedDelta = `${isPositive ? "+" : ""}${(delta * 100).toFixed(1)}%`;

  return (
    <div className={`kpi-card kpi-card--${tone || "default"}`}>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value">{value}</div>
      {delta !== null && delta !== undefined && (
        <span className={badgeClass}>{formattedDelta}</span>
      )}
      {helper && <span className="kpi-helper">{helper}</span>}
      {subtitle && <span className="kpi-helper">{subtitle}</span>}
    </div>
  );
}
