// src/pages/services/ServicesListPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useServices } from "../../context/ServicesContext";

/**
 * Convierte el string de fecha de Google Sheets
 * (ej: "29/7/2024", "7/29/24" o "2024-07-29")
 * a un objeto Date de JS.
 */
function parseSheetDate(dateStr) {
  if (!dateStr) return null;

  const raw = String(dateStr).trim();

  // Caso ISO o con guiones: 2024-07-29
  if (raw.includes("-")) {
    const parts = raw.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts.map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // Caso con barras: 29/7/2024, 7/29/24, etc.
  const parts = raw.split("/");
  if (parts.length !== 3) return null;

  let [p1, p2, p3] = parts.map((v) => Number(v));
  if (!p1 || !p2 || !p3) return null;

  let day, month, year;

  // Detectar si la primera parte es día o mes
  if (p1 > 12) {
    // Formato latino: dd/mm/aa
    day = p1;
    month = p2;
  } else if (p2 > 12) {
    // Formato US: mm/dd/aa
    month = p1;
    day = p2;
  } else {
    // Ambiguo: asumimos dd/mm/aa por ser Argentina
    day = p1;
    month = p2;
  }

  year = p3 < 100 ? 2000 + p3 : p3;

  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

export default function ServicesListPage() {
  const { services, deleteService } = useServices();
  const [search, setSearch] = useState("");

  const now = new Date();

  // Normalizamos la lista con objeto Date ya parseado
  const servicesWithDate = services.map((s) => ({
    ...s,
    _dateObj: parseSheetDate(s.date),
  }));

  // Servicios del mes actual
  const servicesThisMonth = servicesWithDate.filter((s) => {
    const d = s._dateObj;
    if (!d) return false;
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });

  // Servicios de hoy
  const servicesToday = servicesThisMonth.filter((s) => {
    const d = s._dateObj;
    if (!d) return false;
    return d.getDate() === now.getDate();
  });

  // Stats
  const countToday = servicesToday.length;
  const totalToday = servicesToday.reduce(
    (acc, s) => acc + (Number(s.price) || 0),
    0
  );

  const countMonth = servicesThisMonth.length;
  const totalMonth = servicesThisMonth.reduce(
    (acc, s) => acc + (Number(s.price) || 0),
    0
  );

  // Filtro de búsqueda sobre los servicios del mes
  const searchTerm = search.trim().toLowerCase();
  const filteredMonthServices = servicesThisMonth.filter((s) => {
    if (!searchTerm) return true;

    return [
      s.dogName,
      s.ownerName,
      s.type,
      s.paymentMethod,
      s.groomer,
    ]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchTerm));
  });

  const monthLabel = now.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  async function handleDelete(service) {
    const ok = window.confirm(
      `¿Eliminar el turno de ${service.dogName} (${service.date})?`
    );
    if (!ok) return;

    try {
      await deleteService(service);
    } catch {
      alert("No se pudo eliminar el servicio. Revisá la consola.");
    }
  }

  

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">
            Servicios de hoy y del último mes con datos registrados en Bandidos.
          </p>
        </div>

        <Link to="/services/new" className="btn-primary">
          + Nuevo servicio
        </Link>
      </header>

      {/* Cards resumen */}
      <div className="cards-row" style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Servicios de hoy</h3>
          <p style={{ fontSize: "2rem", fontWeight: 600 }}>{countToday}</p>
          <p style={{ fontSize: "0.9rem", color: "#999" }}>
            Ingresos de hoy:{" "}
            <strong>${totalToday.toLocaleString("es-AR")}</strong>
          </p>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Servicios del mes</h3>
          <p style={{ fontSize: "2rem", fontWeight: 600 }}>{countMonth}</p>
          <p style={{ fontSize: "0.9rem", color: "#999" }}>
            Ingresos del mes:{" "}
            <strong>${totalMonth.toLocaleString("es-AR")}</strong>
            <br />
            <span style={{ fontSize: "0.8rem" }}>Período: {monthLabel}</span>
          </p>
        </div>
      </div>

      {/* Tabla: servicios de hoy */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>Servicios de hoy</h2>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 12 }}>
          Turnos registrados en la fecha actual.
        </p>

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Hora / Fecha</th>
                <th>Perro</th>
                <th>Dueño</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Método</th>
                <th>Groomer</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicesToday.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                    Hoy todavía no se registraron servicios.
                  </td>
                </tr>
              ) : (
                servicesToday.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{s.dogName}</td>
                    <td>{s.ownerName}</td>
                    <td>{s.type}</td>
                    <td>${Number(s.price).toLocaleString("es-AR")}</td>
                    <td>{s.paymentMethod}</td>
                    <td>{s.groomer}</td>
                    <td>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => handleDelete(s)}
                    >
                      Eliminar
                    </button>
           </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla: servicios del mes + buscador */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>
              Servicios de {monthLabel}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#888" }}>
              Historial de servicios del mes mostrado. Usá el buscador para
              filtrar por perro, dueño, servicio, método o groomer.
            </p>
          </div>

          <input
            type="text"
            placeholder="Buscar por perro, dueño, servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 14px",
              background: "#12131a",
              color: "#fff",
              minWidth: 260,
            }}
          />
        </div>

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Perro</th>
                <th>Dueño</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Método</th>
                <th>Groomer</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthServices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                    No hay servicios que coincidan con la búsqueda en este mes.
                  </td>
                </tr>
              ) : (
                filteredMonthServices.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{s.dogName}</td>
                    <td>{s.ownerName}</td>
                    <td>{s.type}</td>
                    <td>${Number(s.price).toLocaleString("es-AR")}</td>
                    <td>{s.paymentMethod}</td>
                    <td>{s.groomer}</td>
                     <td>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => handleDelete(s)}
                    >
                      Eliminar
                    </button>
                  </td>
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
