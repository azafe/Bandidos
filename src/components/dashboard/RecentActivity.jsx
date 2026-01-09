// src/components/dashboard/RecentActivity.jsx
function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function RecentActivity({ items }) {
  if (!items.length) {
    return (
      <div className="card">
        <h3 className="card-title">Últimos movimientos</h3>
        <p className="card-subtitle">No hay movimientos recientes.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">Últimos movimientos</h3>
      <p className="card-subtitle">Servicios y gastos más recientes.</p>
      <div className="activity-list">
        {items.map((item) => (
          <div key={item.id} className="activity-item">
            <span
              className={
                item.type === "service"
                  ? "badge badge--positive"
                  : "badge badge--negative"
              }
            >
              {item.type === "service" ? "Servicio" : "Gasto"}
            </span>
            <div className="activity-item__main">
              <div className="activity-item__title">{item.title}</div>
              <div className="activity-item__subtitle">
                {item.subtitle} · {item.method}
              </div>
            </div>
            <div className="activity-item__amount">
              {formatCurrency(item.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
