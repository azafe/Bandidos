// src/components/dashboard/ChartsSection.jsx
import ProfitTrendChart from "./ProfitTrendChart";
import IncomeVsExpenseChart from "./IncomeVsExpenseChart";
import ExpenseBreakdownChart from "./ExpenseBreakdownChart";

export default function ChartsSection({ series }) {
  return (
    <section className="dashboard-charts">
      <div className="card">
        <h3 className="card-title">Tendencia de profit</h3>
        <p className="card-subtitle">
          Ganancia diaria (ingresos - gastos) con línea de equilibrio.
        </p>
        <ProfitTrendChart data={series.byDay} />
      </div>

      <div className="card">
        <h3 className="card-title">Ingresos vs gastos</h3>
        <p className="card-subtitle">Comparación diaria por rango.</p>
        <IncomeVsExpenseChart data={series.byDay} />
      </div>

      <div className="card">
        <h3 className="card-title">Distribución de gastos</h3>
        <p className="card-subtitle">
          Gastos diarios por categoría + gastos fijos.
        </p>
        <ExpenseBreakdownChart data={series.expensesByCategory} />
      </div>
    </section>
  );
}
