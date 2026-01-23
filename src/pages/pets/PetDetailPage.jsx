// src/pages/pets/PetDetailPage.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";

function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (raw.includes("-")) {
    const datePart = raw.split("T")[0];
    const parts = datePart.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts.map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  let [p1, p2, p3] = parts.map((v) => Number(v));
  if (!p1 || !p2 || !p3) return null;
  let day;
  let month;
  let year;
  if (p1 > 12) {
    day = p1;
    month = p2;
  } else if (p2 > 12) {
    month = p1;
    day = p2;
  } else {
    day = p1;
    month = p2;
  }
  year = p3 < 100 ? 2000 + p3 : p3;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateDisplay(value) {
  if (!value) return "-";
  const parsed = parseSheetDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return value;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

export default function PetDetailPage() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [petData, servicesData] = await Promise.all([
          apiRequest(`/v2/pets/${id}`),
          apiRequest("/v2/services", { params: { pet_id: id } }),
        ]);
        if (!active) return;
        setPet(petData);
        setServices(Array.isArray(servicesData) ? servicesData : servicesData?.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudo cargar la ficha de la mascota.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const totalServices = services.length;
  const totalRevenue = services.reduce(
    (sum, s) => sum + (Number(s.price) || 0),
    0
  );

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ficha de mascota</h1>
          <p className="page-subtitle">
            Información general e historial de servicios.
          </p>
        </div>
        <Link to="/pets" className="btn-secondary">
          Volver
        </Link>
      </header>

      {error && (
        <div className="card" style={{ color: "#f37b7b" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">Cargando ficha...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card-title">{pet?.name || "Mascota"}</h2>
            <p className="card-subtitle">
              Dueño: {pet?.owner_name || "-"} · Celular: {pet?.owner_phone || "-"}
            </p>
            <div className="list-item__meta" style={{ marginTop: 8 }}>
              <span>Raza: {pet?.breed || "-"}</span>
            </div>
            <div className="list-item__meta" style={{ marginTop: 6 }}>
              <span>Notas: {pet?.notes || "-"}</span>
            </div>
          </div>

          <div className="cards-row" style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>
                Servicios totales
              </h3>
              <p style={{ fontSize: "2rem", fontWeight: 600 }}>{totalServices}</p>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>
                Ingresos acumulados
              </h3>
              <p style={{ fontSize: "2rem", fontWeight: 600 }}>
                ${totalRevenue.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Historial de servicios</h2>
            <p className="card-subtitle">
              Todos los servicios registrados para esta mascota.
            </p>
            <div className="list-wrapper" style={{ marginTop: 10 }}>
              {services.length === 0 ? (
                <div className="card-subtitle" style={{ textAlign: "center" }}>
                  No hay servicios registrados para esta mascota.
                </div>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="list-item">
                    <div className="list-item__header">
                      <div className="list-item__title">
                        {service.service_type?.name || "Servicio"}
                      </div>
                    </div>
                    <div className="list-item__meta">
                      <span>Fecha: {formatDateDisplay(service.date)}</span>
                      <span>Groomer: {service.groomer?.name || "-"}</span>
                      <span>Método: {service.payment_method?.name || "-"}</span>
                      <span>Precio: {formatPrice(service.price)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
