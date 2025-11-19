// src/pages/dashboard/DashboardPage.jsx
export default function DashboardPage() {
  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Resumen rápido de cómo va Bandidos este mes.
          </p>
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Ingresos del mes</span>
          <span className="kpi-value">$0</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Gastos del mes</span>
          <span className="kpi-value">$0</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Ganancia del mes</span>
          <span className="kpi-value">$0</span>
        </div>
      </section>
    </div>
  );
}