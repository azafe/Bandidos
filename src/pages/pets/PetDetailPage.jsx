// src/pages/pets/PetDetailPage.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";

const PET_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
  "#6366f1", "#ec4899",
];

function petColor(name) {
  if (!name) return PET_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PET_COLORS[Math.abs(hash) % PET_COLORS.length];
}

function petInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

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
  let day, month;
  if (p1 > 12) { day = p1; month = p2; }
  else if (p2 > 12) { month = p1; day = p2; }
  else { day = p1; month = p2; }
  const year = p3 < 100 ? 2000 + p3 : p3;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateDisplay(value) {
  if (!value) return "-";
  const parsed = parseSheetDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return value;
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function formatDuration(minutes) {
  const m = Number(minutes);
  if (!m || !Number.isFinite(m)) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

const STATUS_LABELS = {
  reserved:  "Reservado",
  finished:  "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_COLORS = {
  reserved:  { bg: "rgba(59,130,246,0.12)", color: "#1d4ed8" },
  finished:  { bg: "rgba(34,197,94,0.15)",  color: "#15803d" },
  cancelled: { bg: "rgba(248,113,113,0.15)", color: "#b91c1c" },
};

// Ordena servicios del más reciente al más antiguo
function sortByDate(services) {
  return [...services].sort((a, b) => {
    const da = parseSheetDate(a.date);
    const db = parseSheetDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });
}

export default function PetDetailPage() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const today = new Date().toISOString().slice(0, 10);
        const [petData, agendaData] = await Promise.all([
          apiRequest(`/v2/pets/${id}`),
          apiRequest("/agenda", { params: { from: "2020-01-01", to: today } }),
        ]);
        if (!active) return;
        setPet(petData);
        const all = Array.isArray(agendaData) ? agendaData : agendaData?.items || [];
        setServices(all.filter((s) => String(s.pet_id) === String(id)));
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudo cargar la ficha de la mascota.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const sorted = sortByDate(services);
  const totalRevenue = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const avgRevenue = services.length > 0 ? totalRevenue / services.length : 0;
  const lastService = sorted[0];
  const color = petColor(pet?.name);

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ficha de mascota</h1>
          <p className="page-subtitle">Información general e historial de servicios.</p>
        </div>
        <Link to="/pets" className="btn-secondary">← Volver</Link>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {loading ? (
        <div className="card card-subtitle" style={{ padding: 32, textAlign: "center" }}>Cargando ficha...</div>
      ) : pet && (
        <>
          {/* Perfil */}
          <div className="pet-detail-profile">
            <div className="pet-detail-profile__bar" style={{ background: color }} />
            <div className="pet-detail-profile__body">
              <div className="pet-detail-profile__left">
                <div className="pet-detail-profile__avatar" style={{ background: color }}>
                  {petInitial(pet.name)}
                </div>
                <div>
                  <h2 className="pet-detail-profile__name">{pet.name}</h2>
                  {pet.breed && <p className="pet-detail-profile__breed">{pet.breed}</p>}
                  <div className="pet-detail-profile__badges">
                    <span className={`pet-card__tag${pet.neutered ? " pet-card__tag--yes" : ""}`}>
                      {pet.neutered ? "Castrado" : "Sin castrar"}
                    </span>
                    {pet.behavior && <span className="pet-card__tag">{pet.behavior}</span>}
                    {pet.age && <span className="pet-card__tag">{pet.age}</span>}
                  </div>
                </div>
              </div>
              <div className="pet-detail-profile__info">
                {[
                  { label: "Dueño", value: pet.owner_name },
                  { label: "Celular", value: pet.owner_phone },
                  { label: "Dirección", value: pet.address },
                  { label: "Notas", value: pet.notes },
                ].filter((r) => r.value).map(({ label, value }) => (
                  <div key={label} className="pet-detail-profile__row">
                    <span className="pet-detail-profile__row-label">{label}</span>
                    <span className="pet-detail-profile__row-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="card fixed-expenses-summary" style={{ marginBottom: 16 }}>
            <div className="fixed-expenses-summary__kpis">
              <div className="fe-kpi fe-kpi--total">
                <span>Ingresos acumulados</span>
                <strong>{formatPrice(totalRevenue)}</strong>
              </div>
              <div className="fe-kpi">
                <span>Servicios totales</span>
                <strong>{services.length}</strong>
              </div>
              <div className="fe-kpi">
                <span>Promedio por servicio</span>
                <strong>{services.length > 0 ? formatPrice(Math.round(avgRevenue)) : "-"}</strong>
              </div>
              <div className="fe-kpi">
                <span>Último servicio</span>
                <strong>{lastService ? formatDateDisplay(lastService.date) : "-"}</strong>
                {lastService && <small>{lastService.service_type?.name || "Servicio"}</small>}
              </div>
            </div>
          </div>

          {/* Historial */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <h2 className="card-title">Historial de servicios</h2>
              <p className="card-subtitle">
                {services.length} {services.length === 1 ? "servicio registrado" : "servicios registrados"} · Del más reciente al más antiguo.
              </p>
            </div>

            {services.length === 0 ? (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
                No hay servicios registrados para esta mascota.
              </div>
            ) : (
              <div className="fe-cards-grid">
                {sorted.map((service) => (
                  <div
                    key={service.id}
                    className="fe-card"
                    style={{ "--fe-accent": color, cursor: "pointer" }}
                    onClick={() => setSelectedService(service)}
                  >
                    <div className="fe-card__accent" />
                    <div className="fe-card__body">
                      <div className="fe-card__top">
                        <span className="fe-card__name">
                          {service.service_type?.name || "Servicio"}
                        </span>
                        <span className="fe-card__date-badge">
                          {formatDateDisplay(service.date)}
                        </span>
                      </div>
                      <div className="fe-card__amount">{formatPrice(service.price)}</div>
                      <div className="fe-card__meta">
                        {service.groomer?.name && (
                          <span className="fe-card__badge">{service.groomer.name}</span>
                        )}
                        {service.payment_method?.name && (
                          <span className="fe-card__meta-item">{service.payment_method.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal detalle de servicio */}
      <Modal
        isOpen={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        title="Detalle del servicio"
      >
        {selectedService && (() => {
          const s = selectedService;
          const status = s.status || "reserved";
          const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.reserved;
          const deposit = Number(s.deposit_amount) || 0;
          const price = Number(s.price) || 0;
          const remaining = Math.max(0, price - deposit);
          return (
            <div className="fe-modal-detail">
              {/* Hero */}
              <div className="pet-modal-header">
                <div className="pet-modal-avatar" style={{ background: color }}>
                  {petInitial(pet?.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>
                    {s.service_type?.name || "Servicio"}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                    }}
                  >
                    {STATUS_LABELS[status] || status}
                  </span>
                </div>
              </div>

              <div className="fe-modal-detail__rows">
                <div><strong>Fecha</strong><span>{formatDateDisplay(s.date)}</span></div>
                {formatTime(s.time) && (
                  <div><strong>Hora</strong><span>{formatTime(s.time)}</span></div>
                )}
                {formatDuration(s.duration) && (
                  <div><strong>Duración</strong><span>{formatDuration(s.duration)}</span></div>
                )}
                <div><strong>Groomer</strong><span>{s.groomer?.name || "-"}</span></div>
                <div><strong>Precio</strong><span>{formatPrice(price)}</span></div>
                {deposit > 0 && (
                  <div><strong>Seña</strong><span>{formatPrice(deposit)}</span></div>
                )}
                {deposit > 0 && (
                  <div><strong>Saldo restante</strong><span>{formatPrice(remaining)}</span></div>
                )}
                <div><strong>Método de pago</strong><span>{s.payment_method?.name || "-"}</span></div>
                {s.notes && (
                  <div style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <strong>Notas</strong>
                    <span style={{ marginTop: 4, fontSize: "0.88rem" }}>{s.notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
