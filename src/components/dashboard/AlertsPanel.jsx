// src/components/dashboard/AlertsPanel.jsx
export default function AlertsPanel({ alerts }) {
  return (
    <div className="card">
      <h3 className="card-title">Alertas</h3>
      <p className="card-subtitle">Señales rápidas del período.</p>
      {alerts.length === 0 ? (
        <div className="alerts-empty">Sin alertas por ahora.</div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className={`alert-card alert-card--${alert.tone}`}
            >
              <div className="alert-card__title">{alert.title}</div>
              <div className="alert-card__desc">{alert.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
