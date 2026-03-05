// src/components/dashboard/KpiGrid.jsx
import KpiCard from "./KpiCard";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function KpiGrid({ kpis }) {
  const deltas = kpis.deltas || {};
  return (
    <section className="kpi-grid">
      <KpiCard
        label="Ingresos"
        value={formatCurrency(kpis.income)}
        delta={deltas.income}
      />
      <KpiCard
        label="Gastos"
        value={formatCurrency(kpis.expenses)}
        delta={deltas.expenses}
      />
      <KpiCard
        label="Ganancia neta"
        value={formatCurrency(kpis.profit)}
        delta={deltas.profit}
        tone={kpis.profit >= 0 ? "positive" : "negative"}
      />
      <KpiCard
        label="Margen %"
        value={formatPercent(kpis.margin || 0)}
        delta={deltas.margin}
        tone={
          kpis.margin >= 0.3
            ? "positive"
            : kpis.margin >= 0.1
            ? "warning"
            : "negative"
        }
      />
      <KpiCard
        label="Servicios"
        value={kpis.servicesCount}
        delta={deltas.servicesCount}
      />
      <KpiCard
        label="Ticket promedio"
        value={formatCurrency(kpis.avgTicket)}
        delta={deltas.avgTicket}
      />
    </section>
  );
}
