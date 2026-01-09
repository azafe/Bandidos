// src/components/dashboard/QuickActions.jsx
import { Link } from "react-router-dom";

export default function QuickActions() {
  return (
    <div className="card">
      <h3 className="card-title">Acciones rápidas</h3>
      <p className="card-subtitle">Atajos para el día a día.</p>
      <div className="quick-actions">
        <div className="quick-actions__item">
          <div>
            <div className="quick-actions__label">Registrar servicio</div>
            <div className="quick-actions__hint">Baño, corte o completo</div>
          </div>
          <Link to="/services/new">
            <button className="btn-primary">Ir</button>
          </Link>
        </div>
        <div className="quick-actions__item">
          <div>
            <div className="quick-actions__label">Registrar gasto diario</div>
            <div className="quick-actions__hint">Shampoo, limpieza, snacks</div>
          </div>
          <Link to="/expenses/daily">
            <button className="btn-secondary">Abrir</button>
          </Link>
        </div>
        <div className="quick-actions__item">
          <div>
            <div className="quick-actions__label">Ver servicios</div>
            <div className="quick-actions__hint">Historial y tickets</div>
          </div>
          <Link to="/services">
            <button className="btn-secondary">Abrir</button>
          </Link>
        </div>
        <div className="quick-actions__item">
          <div>
            <div className="quick-actions__label">Gastos fijos</div>
            <div className="quick-actions__hint">Alquiler, servicios</div>
          </div>
          <Link to="/expenses/fixed">
            <button className="btn-secondary">Abrir</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
