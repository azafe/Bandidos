// src/components/dashboard/DashboardHeader.jsx
import { Link } from "react-router-dom";

const presets = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "custom", label: "Personalizado" },
];

export default function DashboardHeader({
  rangeType,
  range,
  onRangeTypeChange,
  onRangeChange,
}) {
  return (
    <header className="dashboard-header">
      <div>
        <h1 className="dashboard-title">Inicio</h1>
        <p className="dashboard-subtitle">
          Tu negocio en un vistazo. Rango: {range.label}
        </p>
      </div>

      <div className="dashboard-header__actions">
        <div className="dashboard-header__presets">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={
                rangeType === preset.id ? "btn-primary" : "btn-secondary"
              }
              onClick={() => onRangeTypeChange(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {rangeType === "custom" && (
          <div className="dashboard-header__dates">
            <label className="form-field">
              <span>Desde</span>
              <input
                type="date"
                value={range.from}
                onChange={(e) =>
                  onRangeChange({ ...range, from: e.target.value })
                }
              />
            </label>
            <label className="form-field">
              <span>Hasta</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) =>
                  onRangeChange({ ...range, to: e.target.value })
                }
              />
            </label>
          </div>
        )}

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
