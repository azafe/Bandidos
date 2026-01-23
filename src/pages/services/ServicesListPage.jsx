// src/pages/services/ServicesListPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

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
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return {
      from: `${yyyy}-${mm}-01`,
      to: now.toISOString().slice(0, 10),
      customer_id: "",
      pet_id: "",
      service_type_id: "",
      groomer_id: "",
    };
  });
  const { items: customers } = useApiResource("/v2/customers");
  const { items: pets } = useApiResource("/v2/pets");
  const { items: serviceTypes } = useApiResource("/v2/service-types");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: employees } = useApiResource("/v2/employees");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiRequest("/v2/services", { params: filters });
        if (!active) return;
        setServices(Array.isArray(data) ? data : data?.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudieron cargar los servicios.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters]);

  // Stats
  const servicesWithDate = services.map((s) => ({
    ...s,
    _dateObj: parseSheetDate(s.date),
  }));

  const now = new Date();
  const servicesToday = servicesWithDate.filter((s) => {
    const d = s._dateObj;
    if (!d) return false;
    return d.toDateString() === now.toDateString();
  });

  const countToday = servicesToday.length;
  const totalToday = servicesToday.reduce(
    (acc, s) => acc + (Number(s.price) || 0),
    0
  );

  const countPeriod = servicesWithDate.length;
  const totalPeriod = servicesWithDate.reduce(
    (acc, s) => acc + (Number(s.price) || 0),
    0
  );

  function getNameById(list, id) {
    if (!id) return "";
    const match = list.find((item) => String(item.id) === String(id));
    return match?.name || "";
  }

  const resolveOwnerName = (service) =>
    service.ownerName ||
    service.customer?.name ||
    getNameById(customers, service.customer_id) ||
    "-";
  const resolvePetName = (service) =>
    service.dogName ||
    service.pet?.name ||
    getNameById(pets, service.pet_id) ||
    "-";
  const resolveServiceTypeName = (service) =>
    service.type ||
    service.service_type?.name ||
    getNameById(serviceTypes, service.service_type_id) ||
    "-";
  const resolvePaymentMethodName = (service) =>
    service.paymentMethod ||
    service.payment_method?.name ||
    getNameById(paymentMethods, service.payment_method_id) ||
    "-";
  const resolveGroomerName = (service) =>
    service.groomer?.name ||
    service.groomer ||
    getNameById(employees, service.groomer_id) ||
    "-";

  // Filtro de búsqueda sobre los servicios
  const searchTerm = search.trim().toLowerCase();
  const filteredServices = servicesWithDate.filter((s) => {
    if (!searchTerm) return true;

    return [
      s.dogName,
      s.pet?.name,
      resolvePetName(s),
      resolveOwnerName(s),
      resolveServiceTypeName(s),
      resolvePaymentMethodName(s),
      resolveGroomerName(s),
    ]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchTerm));
  });

  const periodLabel = `${filters.from} → ${filters.to}`;

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "-";
    return `$${Number(value).toLocaleString("es-AR")}`;
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

  async function handleDelete(service) {
    const ok = window.confirm(
      `¿Eliminar el turno de ${resolvePetName(service)} (${service.date})?`
    );
    if (!ok) return false;

    try {
      await apiRequest(`/v2/services/${service.id}`, { method: "DELETE" });
      const data = await apiRequest("/v2/services", { params: filters });
      setServices(Array.isArray(data) ? data : data?.items || []);
      return true;
    } catch {
      alert("No se pudo eliminar el servicio. Revisá la consola.");
      return false;
    }
  }

  

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">
            Servicios registrados en Bandidos para el período seleccionado.
          </p>
        </div>

        <Link to="/services/new" className="btn-primary">
          + Nuevo servicio
        </Link>
      </header>

      {loading && <div className="card">Cargando servicios...</div>}
      {error && (
        <div className="card" style={{ color: "#f37b7b" }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>
          Filtros de período
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="form-field">
            <label htmlFor="from">Desde</label>
            <input
              id="from"
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="to">Hasta</label>
            <input
              id="to"
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="customer_id">Cliente</label>
            <select
              id="customer_id"
              value={filters.customer_id}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  customer_id: e.target.value,
                  pet_id: "",
                }))
              }
            >
              <option value="">Todos</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="pet_id">Mascota</label>
            <select
              id="pet_id"
              value={filters.pet_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, pet_id: e.target.value }))
              }
            >
              <option value="">Todas</option>
              {pets
                .filter((p) =>
                  filters.customer_id ? p.customer_id === filters.customer_id : true
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service_type_id">Servicio</label>
            <select
              id="service_type_id"
              value={filters.service_type_id}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  service_type_id: e.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="groomer_id">Groomer</label>
            <select
              id="groomer_id"
              value={filters.groomer_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, groomer_id: e.target.value }))
              }
            >
              <option value="">Todos</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
          <h3 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Servicios del período</h3>
          <p style={{ fontSize: "2rem", fontWeight: 600 }}>{countPeriod}</p>
          <p style={{ fontSize: "0.9rem", color: "#999" }}>
            Ingresos del período:{" "}
            <strong>${totalPeriod.toLocaleString("es-AR")}</strong>
            <br />
            <span style={{ fontSize: "0.8rem" }}>Período: {periodLabel}</span>
          </p>
        </div>
      </div>

      {/* Lista: servicios de hoy */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>Servicios de hoy</h2>
        <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 12 }}>
          Turnos registrados en la fecha actual.
        </p>

        <div className="list-wrapper">
          {servicesToday.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Hoy todavía no se registraron servicios.
            </div>
          ) : (
            servicesToday.map((s) => (
              <div
                key={s.id}
                className="list-item"
                onClick={() => setSelectedService(s)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">
                    {resolvePetName(s)} - {resolveServiceTypeName(s)}
                  </div>
                </div>
                <div className="list-item__meta">
                  <span>Fecha: {formatDateDisplay(s.date)}</span>
                  <span>Dueño: {resolveOwnerName(s)}</span>
                  <span>Precio: {formatPrice(s.price)}</span>
                  <span>Método: {resolvePaymentMethodName(s)}</span>
                  <span>Groomer: {resolveGroomerName(s)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista: servicios del período + buscador */}
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
              Servicios del período
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#888" }}>
              Historial de servicios del período mostrado. Usá el buscador para
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

        <div className="list-wrapper">
          {filteredServices.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              No hay servicios que coincidan con la búsqueda en este período.
            </div>
          ) : (
            filteredServices.map((s) => (
              <div
                key={s.id}
                className="list-item"
                onClick={() => setSelectedService(s)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">
                    {resolvePetName(s)} - {resolveServiceTypeName(s)}
                  </div>
                </div>
                <div className="list-item__meta">
                  <span>Fecha: {formatDateDisplay(s.date)}</span>
                  <span>Dueño: {resolveOwnerName(s)}</span>
                  <span>Precio: {formatPrice(s.price)}</span>
                  <span>Método: {resolvePaymentMethodName(s)}</span>
                  <span>Groomer: {resolveGroomerName(s)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        title="Detalle del servicio"
      >
        {selectedService && (
          <>
            <div>
              <strong>Fecha:</strong> {formatDateDisplay(selectedService.date)}
            </div>
            <div>
              <strong>Perro:</strong>{" "}
              {resolvePetName(selectedService)}
            </div>
            <div>
              <strong>Dueño:</strong> {resolveOwnerName(selectedService)}
            </div>
            <div>
              <strong>Servicio:</strong> {resolveServiceTypeName(selectedService)}
            </div>
            <div>
              <strong>Precio:</strong> {formatPrice(selectedService.price)}
            </div>
            <div>
              <strong>Método de pago:</strong>{" "}
              {resolvePaymentMethodName(selectedService)}
            </div>
            <div>
              <strong>Groomer:</strong> {resolveGroomerName(selectedService)}
            </div>
            <div className="modal-actions">
              <Link
                to={`/services/${selectedService.id}`}
                className="btn-primary"
                onClick={() => setSelectedService(null)}
              >
                Editar
              </Link>
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  const removed = await handleDelete(selectedService);
                  if (removed) setSelectedService(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
