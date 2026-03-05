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
    <section className="kpi-grid kpi-grid--two-rows">
      {/* Fila 1: visión financiera global */}
      <KpiCard
        label="Ingresos Totales"
        value={formatCurrency(kpis.income)}
        delta={deltas.income}
      />
      <KpiCard
        label="Costos Totales"
        value={formatCurrency(kpis.totalCosts)}
        delta={deltas.totalCosts}
      />
      <KpiCard
        label="Comisiones"
        value={formatCurrency(kpis.groomerCommissions)}
        delta={deltas.groomerCommissions}
        tone="default"
      />
      <KpiCard
        label="Ganancia Neta"
        value={formatCurrency(kpis.profit)}
        delta={deltas.profit}
        tone={kpis.profit >= 0 ? "positive" : "negative"}
      />
      {/* Fila 2: desglose */}
      <KpiCard
        label="Ingresos Servicios"
        value={formatCurrency(kpis.servicesIncome)}
        delta={deltas.servicesIncome}
      />
      <KpiCard
        label="Ingresos PetShop"
        value={formatCurrency(kpis.petshopIncome)}
        delta={deltas.petshopIncome}
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
        label="Servicios realizados"
        value={kpis.servicesCount}
        delta={deltas.servicesCount}
      />
    </section>
  );
}
