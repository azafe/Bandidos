// src/components/dashboard/ChartsSection.jsx
import RevenueChart from "./RevenueChart";
import MarginChart from "./MarginChart";
import GroomerChart from "./GroomerChart";
import ServiceTypeChart from "./ServiceTypeChart";
import ExpenseBreakdownChart from "./ExpenseBreakdownChart";

export default function ChartsSection({ series }) {
  return (
    <section className="dashboard-charts">
      {/* Fila 1: chart principal (2/3) + margen % (1/3) */}
      <div className="dashboard-charts__row dashboard-charts__row--main">
        <div className="card">
          <h3 className="card-title">Ingresos vs Gastos</h3>
          <p className="card-subtitle">Barras diarias con línea de ganancia.</p>
          <RevenueChart data={series.byDay} />
        </div>
        <div className="card">
          <h3 className="card-title">Margen % diario</h3>
          <p className="card-subtitle">Meta: 30% de margen</p>
          <MarginChart data={series.marginByDay} />
        </div>
      </div>

      {/* Fila 2: groomer | servicios | gastos */}
      <div className="dashboard-charts__row dashboard-charts__row--secondary">
        <div className="card">
          <h3 className="card-title">Ingresos por groomer</h3>
          <GroomerChart data={series.groomerRevenue} />
        </div>
        <div className="card">
          <h3 className="card-title">Ingresos por servicio</h3>
          <ServiceTypeChart data={series.revenueByServiceType} />
        </div>
        <div className="card">
          <h3 className="card-title">Distribución de gastos</h3>
          <ExpenseBreakdownChart data={series.expensesByCategory} />
        </div>
      </div>
    </section>
  );
}
