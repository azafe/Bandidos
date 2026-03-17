// src/components/dashboard/DashboardHeader.jsx
import { Link } from "react-router-dom";

export default function DashboardHeader({
  monthOffset,
  range,
  onMonthOffsetChange,
}) {
  const label = range.label.charAt(0).toUpperCase() + range.label.slice(1);

  return (
    <header className="dashboard-header">
      <div>
        <h1 className="dashboard-title">Inicio</h1>
        <p className="dashboard-subtitle">
          Tu negocio en un vistazo · {label}
        </p>
      </div>

      <div className="dashboard-header__actions">
        <div className="dashboard-month-nav">
          <button
            type="button"
            className="btn-secondary dashboard-month-nav__arrow"
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
          >
            ‹
          </button>

          <span className="dashboard-month-nav__label">{label}</span>

          <button
            type="button"
            className="btn-secondary dashboard-month-nav__arrow"
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
            disabled={monthOffset >= 0}
          >
            ›
          </button>

          {monthOffset !== 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onMonthOffsetChange(0)}
            >
              Mes actual
            </button>
          )}
        </div>

        <div className="dashboard-header__cta">
          <Link to="/services/new">
            <button className="btn-primary">+ Registrar servicio</button>
          </Link>
          <Link to="/expenses/daily">
            <button className="btn-secondary">+ Registrar gasto</button>
          </Link>
        </div>
      </div>
    </header>
  );
}
