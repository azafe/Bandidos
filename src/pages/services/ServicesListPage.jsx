// src/pages/services/ServicesListPage.jsx

import { Link } from "react-router-dom";
import { useServices } from "../../context/ServicesContext";

export default function ServicesListPage() {
  const { services } = useServices();

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">
            Registro de baños, cortes y servicios realizados.
          </p>
        </div>

        <Link to="/services/new" className="btn-primary">
          + Nuevo servicio
        </Link>
      </header>

      <div className="card">
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Perro</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Método</th>
                <th>Groomer</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    Sin servicios cargados.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{s.dogName}</td>
                    <td>{s.type}</td>
                    <td>${s.price.toLocaleString("es-AR")}</td>
                    <td>{s.paymentMethod}</td>
                    <td>{s.groomer}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
