// src/components/dashboard/DashboardHeader.jsx
import AsistenteIA from "./AsistenteIA";

export default function DashboardHeader({
  monthOffset,
  range,
  onMonthOffsetChange,
}) {
  const label = range.label.charAt(0).toUpperCase() + range.label.slice(1);
  const fecha = (value) => value.split("-").reverse().join("/");

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__intro">
        <h2>Resumen del mes</h2>
        <p>Del {fecha(range.from)} al {fecha(range.to)}</p>
      </div>
      <div className="dashboard-header__controls">
        <div className="dashboard-month-nav">
          <button
            type="button"
            className="btn-secondary dashboard-month-nav__arrow"
            aria-label="Mes anterior"
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
          >
            ‹
          </button>
          <span className="dashboard-month-nav__label">{label}</span>
          <button
            type="button"
            className="btn-secondary dashboard-month-nav__arrow"
            aria-label="Mes siguiente"
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
            disabled={monthOffset >= 0}
          >
            ›
          </button>
        </div>
        <AsistenteIA />
      </div>
      {monthOffset !== 0 && (
        <button
          type="button"
          className="dashboard-month-reset"
          onClick={() => onMonthOffsetChange(0)}
        >
          Volver al mes actual
        </button>
      )}
    </header>
  );
}
