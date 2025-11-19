// src/pages/services/ServicesListPage.jsx
import { Link } from "react-router-dom";

export default function ServicesListPage() {
  const mockServices = [
    {
      id: 1,
      date: "2025-11-19",
      dogName: "Luna",
      serviceType: "Baño + corte",
      price: 8000,
      paymentMethod: "Efectivo",
      groomer: "Jorge",
    },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">
            Registro de baños, cortes y servicios realizados.
          </p>
        </div>
        <Link to="/services/new">
          <button className="btn-primary">+ Nuevo servicio</button>
        </Link>
      </header>

      <table className="table">
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
          {mockServices.map((s) => (
            <tr key={s.id}>
              <td>{s.date}</td>
              <td>{s.dogName}</td>
              <td>{s.serviceType}</td>
              <td>${s.price.toLocaleString("es-AR")}</td>
              <td>{s.paymentMethod}</td>
              <td>{s.groomer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
