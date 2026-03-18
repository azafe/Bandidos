// src/components/dashboard/DashboardHeader.jsx
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
            Hoy
          </button>
        )}
      </div>
    </header>
  );
}
