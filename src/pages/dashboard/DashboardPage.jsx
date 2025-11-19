// src/pages/dashboard/DashboardPage.jsx
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const kpis = {
    todayRevenue: 32000,
    monthRevenue: 420000,
    todayServices: 7,
    avgTicket: 4600,
  };

  const todayServices = [
    {
      id: 1,
      time: "10:00",
      dogName: "Luna",
      ownerName: "María",
      serviceType: "Baño + corte",
      price: 8000,
    },
    {
      id: 2,
      time: "11:30",
      dogName: "Rocky",
      ownerName: "José",
      serviceType: "Baño",
      price: 5000,
    },
    {
      id: 3,
      time: "15:00",
      dogName: "Milo",
      ownerName: "Ana",
      serviceType: "Corte",
      price: 6000,
    },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Resumen del negocio de Bandidos · {formattedDate}
          </p>
        </div>
        <Link to="/services/new">
          <button className="btn-primary">+ Registrar servicio</button>
        </Link>
      </header>

      {/* KPIs principales */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Ingresos de hoy</span>
          <span className="kpi-value">
            ${kpis.todayRevenue.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Ingresos del mes</span>
          <span className="kpi-value">
            ${kpis.monthRevenue.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Servicios de hoy</span>
          <span className="kpi-value">{kpis.todayServices}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Ticket promedio</span>
          <span className="kpi-value">
            ${kpis.avgTicket.toLocaleString("es-AR")}
          </span>
        </div>
      </section>

      {/* Grilla de tarjetas */}
      <section className="dashboard-grid">
        {/* Servicios de hoy */}
        <div className="card">
          <h2 className="card-title">Servicios de hoy</h2>
          <p className="card-subtitle">
            Turnos registrados para el día.
          </p>

          <table className="table table--compact">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Perro</th>
                <th>Dueño</th>
                <th>Servicio</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {todayServices.map((s) => (
                <tr key={s.id}>
                  <td>{s.time}</td>
                  <td>{s.dogName}</td>
                  <td>{s.ownerName}</td>
                  <td>{s.serviceType}</td>
                  <td>${s.price.toLocaleString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h2 className="card-title">Accesos rápidos</h2>
          <p className="card-subtitle">Tareas frecuentes de Bandidos</p>

          <div className="quick-actions">
            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">
                  Registrar nuevo servicio
                </div>
                <div className="quick-actions__hint">
                  Baño, corte o completo
                </div>
              </div>
              <Link to="/services/new">
                <button className="btn-primary" style={{ padding: "6px 14px" }}>
                  Ir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">Ver servicios</div>
                <div className="quick-actions__hint">
                  Historial de perros atendidos
                </div>
              </div>
              <Link to="/services">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">Registrar gasto diario</div>
                <div className="quick-actions__hint">
                  Shampoo, limpieza, snacks
                </div>
              </div>
              <Link to="/expenses/daily">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">
                  Gastos fijos del mes
                </div>
                <div className="quick-actions__hint">
                  Alquiler, servicios, sueldos
                </div>
              </div>
              <Link to="/expenses/fixed">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
