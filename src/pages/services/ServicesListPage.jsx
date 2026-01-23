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
    const datePart = raw.split("T")[0];
    const parts = datePart.split("-");
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
  const [filterCustomerSearch, setFilterCustomerSearch] = useState("");
  const [filterPetSearch, setFilterPetSearch] = useState("");
  const [filterServiceSearch, setFilterServiceSearch] = useState("");
  const [filterGroomerSearch, setFilterGroomerSearch] = useState("");
  const [isFilterCustomerOpen, setIsFilterCustomerOpen] = useState(false);
  const [isFilterPetOpen, setIsFilterPetOpen] = useState(false);
  const [isFilterServiceOpen, setIsFilterServiceOpen] = useState(false);
  const [isFilterGroomerOpen, setIsFilterGroomerOpen] = useState(false);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    date: "",
    customer_id: "",
    pet_id: "",
    service_type_id: "",
    price: "",
    payment_method_id: "",
    groomer_id: "",
    notes: "",
  });
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

  const normalizedFilterCustomerSearch = filterCustomerSearch.trim().toLowerCase();
  const normalizedFilterPetSearch = filterPetSearch.trim().toLowerCase();
  const normalizedFilterServiceSearch = filterServiceSearch.trim().toLowerCase();
  const normalizedFilterGroomerSearch = filterGroomerSearch.trim().toLowerCase();

  const filteredFilterCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(normalizedFilterCustomerSearch)
  );
  const filteredFilterPets = pets
    .filter((p) =>
      filters.customer_id ? p.customer_id === filters.customer_id : true
    )
    .filter((p) => p.name?.toLowerCase().includes(normalizedFilterPetSearch));
  const filteredFilterServiceTypes = serviceTypes.filter((t) =>
    t.name?.toLowerCase().includes(normalizedFilterServiceSearch)
  );
  const filteredFilterGroomers = employees.filter((e) =>
    e.name?.toLowerCase().includes(normalizedFilterGroomerSearch)
  );

  const modalPets = pets.filter((p) =>
    modalForm.customer_id ? p.customer_id === modalForm.customer_id : true
  );

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

  function toISODate(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (raw.includes("T")) return raw.slice(0, 10);
    if (raw.includes("-") && raw.split("-")[0].length === 4) {
      return raw.slice(0, 10);
    }
    const parsed = parseSheetDate(raw);
    if (!parsed || Number.isNaN(parsed.getTime())) return "";
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = parsed.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  function buildModalForm(service) {
    return {
      date: toISODate(service?.date),
      customer_id: service?.customer_id || service?.customer?.id || "",
      pet_id: service?.pet_id || service?.pet?.id || "",
      service_type_id:
        service?.service_type_id || service?.service_type?.id || "",
      price:
        service?.price !== null && service?.price !== undefined
          ? String(service.price)
          : "",
      payment_method_id:
        service?.payment_method_id || service?.payment_method?.id || "",
      groomer_id: service?.groomer_id || service?.groomer?.id || "",
      notes: service?.notes || "",
    };
  }

  useEffect(() => {
    if (!selectedService) return;
    setModalForm(buildModalForm(selectedService));
    setIsEditingModal(false);
  }, [selectedService]);

  useEffect(() => {
    const match = customers.find(
      (c) => String(c.id) === String(filters.customer_id)
    );
    setFilterCustomerSearch(match?.name || "");
  }, [filters.customer_id, customers]);

  useEffect(() => {
    const match = pets.find((p) => String(p.id) === String(filters.pet_id));
    setFilterPetSearch(match?.name || "");
  }, [filters.pet_id, pets]);

  useEffect(() => {
    const match = serviceTypes.find(
      (t) => String(t.id) === String(filters.service_type_id)
    );
    setFilterServiceSearch(match?.name || "");
  }, [filters.service_type_id, serviceTypes]);

  useEffect(() => {
    const match = employees.find(
      (e) => String(e.id) === String(filters.groomer_id)
    );
    setFilterGroomerSearch(match?.name || "");
  }, [filters.groomer_id, employees]);

  function handleModalChange(e) {
    const { name, value } = e.target;
    setModalForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleModalSave() {
    if (!selectedService) return;
    const amountNumber = Number(modalForm.price || 0);
    if (!modalForm.customer_id) {
      alert("Seleccioná un cliente.");
      return;
    }
    if (!modalForm.pet_id) {
      alert("Seleccioná una mascota.");
      return;
    }
    if (!modalForm.service_type_id) {
      alert("Seleccioná un tipo de servicio.");
      return;
    }
    if (!modalForm.payment_method_id) {
      alert("Seleccioná un método de pago.");
      return;
    }
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un precio válido.");
      return;
    }

    const payload = {
      date: modalForm.date,
      customer_id: modalForm.customer_id,
      pet_id: modalForm.pet_id,
      service_type_id: modalForm.service_type_id,
      price: amountNumber,
      payment_method_id: modalForm.payment_method_id,
      groomer_id: modalForm.groomer_id || null,
      notes: modalForm.notes?.trim() || "",
    };

    try {
      await apiRequest(`/v2/services/${selectedService.id}`, {
        method: "PUT",
        body: payload,
      });
      const data = await apiRequest("/v2/services", { params: filters });
      const items = Array.isArray(data) ? data : data?.items || [];
      setServices(items);
      const updated = items.find((item) => item.id === selectedService.id);
      if (updated) setSelectedService(updated);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo actualizar el servicio.");
    }
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
            <div className="combo-field">
              <input
                id="customer_filter"
                type="text"
                placeholder="Todos"
                value={filterCustomerSearch}
                onChange={(e) => {
                  setFilterCustomerSearch(e.target.value);
                  setIsFilterCustomerOpen(true);
                  setFilters((prev) => ({
                    ...prev,
                    customer_id: "",
                    pet_id: "",
                  }));
                  setFilterPetSearch("");
                }}
                onFocus={() => setIsFilterCustomerOpen(true)}
                onBlur={() => setTimeout(() => setIsFilterCustomerOpen(false), 120)}
                autoComplete="off"
              />
              {isFilterCustomerOpen ? (
                <div className="combo-field__list" role="listbox">
                  <button
                    type="button"
                    className="combo-field__option"
                    onMouseDown={() => {
                      setFilters((prev) => ({
                        ...prev,
                        customer_id: "",
                        pet_id: "",
                      }));
                      setFilterCustomerSearch("");
                      setFilterPetSearch("");
                      setIsFilterCustomerOpen(false);
                    }}
                  >
                    Todos
                  </button>
                  {filteredFilterCustomers.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredFilterCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setFilters((prev) => ({
                            ...prev,
                            customer_id: c.id,
                            pet_id: "",
                          }));
                          setFilterCustomerSearch(c.name || "");
                          setFilterPetSearch("");
                          setIsFilterCustomerOpen(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="pet_id">Mascota</label>
            <div className="combo-field">
              <input
                id="pet_filter"
                type="text"
                placeholder="Todas"
                value={filterPetSearch}
                onChange={(e) => {
                  setFilterPetSearch(e.target.value);
                  setIsFilterPetOpen(true);
                  setFilters((prev) => ({ ...prev, pet_id: "" }));
                }}
                onFocus={() => setIsFilterPetOpen(true)}
                onBlur={() => setTimeout(() => setIsFilterPetOpen(false), 120)}
                autoComplete="off"
                disabled={!filters.customer_id}
              />
              {isFilterPetOpen ? (
                <div className="combo-field__list" role="listbox">
                  {!filters.customer_id ? (
                    <div className="combo-field__empty">
                      Seleccioná un cliente primero
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setFilters((prev) => ({ ...prev, pet_id: "" }));
                          setFilterPetSearch("");
                          setIsFilterPetOpen(false);
                        }}
                      >
                        Todas
                      </button>
                      {filteredFilterPets.length === 0 ? (
                        <div className="combo-field__empty">Sin resultados</div>
                      ) : (
                        filteredFilterPets.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="combo-field__option"
                            onMouseDown={() => {
                              setFilters((prev) => ({ ...prev, pet_id: p.id }));
                              setFilterPetSearch(p.name || "");
                              setIsFilterPetOpen(false);
                            }}
                          >
                            {p.name}
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="service_type_id">Servicio</label>
            <div className="combo-field">
              <input
                id="service_filter"
                type="text"
                placeholder="Todos"
                value={filterServiceSearch}
                onChange={(e) => {
                  setFilterServiceSearch(e.target.value);
                  setIsFilterServiceOpen(true);
                  setFilters((prev) => ({ ...prev, service_type_id: "" }));
                }}
                onFocus={() => setIsFilterServiceOpen(true)}
                onBlur={() => setTimeout(() => setIsFilterServiceOpen(false), 120)}
                autoComplete="off"
              />
              {isFilterServiceOpen ? (
                <div className="combo-field__list" role="listbox">
                  <button
                    type="button"
                    className="combo-field__option"
                    onMouseDown={() => {
                      setFilters((prev) => ({ ...prev, service_type_id: "" }));
                      setFilterServiceSearch("");
                      setIsFilterServiceOpen(false);
                    }}
                  >
                    Todos
                  </button>
                  {filteredFilterServiceTypes.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredFilterServiceTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setFilters((prev) => ({
                            ...prev,
                            service_type_id: t.id,
                          }));
                          setFilterServiceSearch(t.name || "");
                          setIsFilterServiceOpen(false);
                        }}
                      >
                        {t.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="groomer_id">Groomer</label>
            <div className="combo-field">
              <input
                id="groomer_filter"
                type="text"
                placeholder="Todos"
                value={filterGroomerSearch}
                onChange={(e) => {
                  setFilterGroomerSearch(e.target.value);
                  setIsFilterGroomerOpen(true);
                  setFilters((prev) => ({ ...prev, groomer_id: "" }));
                }}
                onFocus={() => setIsFilterGroomerOpen(true)}
                onBlur={() => setTimeout(() => setIsFilterGroomerOpen(false), 120)}
                autoComplete="off"
              />
              {isFilterGroomerOpen ? (
                <div className="combo-field__list" role="listbox">
                  <button
                    type="button"
                    className="combo-field__option"
                    onMouseDown={() => {
                      setFilters((prev) => ({ ...prev, groomer_id: "" }));
                      setFilterGroomerSearch("");
                      setIsFilterGroomerOpen(false);
                    }}
                  >
                    Todos
                  </button>
                  {filteredFilterGroomers.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredFilterGroomers.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setFilters((prev) => ({
                            ...prev,
                            groomer_id: emp.id,
                          }));
                          setFilterGroomerSearch(emp.name || "");
                          setIsFilterGroomerOpen(false);
                        }}
                      >
                        {emp.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
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
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    name="date"
                    value={modalForm.date}
                    onChange={handleModalChange}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Cliente</span>
                  <select
                    name="customer_id"
                    value={modalForm.customer_id}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        customer_id: e.target.value,
                        pet_id: "",
                      }))
                    }
                    required
                  >
                    <option value="">Seleccioná cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Mascota</span>
                  <select
                    name="pet_id"
                    value={modalForm.pet_id}
                    onChange={handleModalChange}
                    required
                    disabled={!modalForm.customer_id}
                  >
                    <option value="">Seleccioná mascota</option>
                    {modalPets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Tipo de servicio</span>
                  <select
                    name="service_type_id"
                    value={modalForm.service_type_id}
                    onChange={handleModalChange}
                    required
                  >
                    <option value="">Seleccioná servicio</option>
                    {serviceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Precio</span>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="100"
                    value={modalForm.price}
                    onChange={handleModalChange}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Método de pago</span>
                  <select
                    name="payment_method_id"
                    value={modalForm.payment_method_id}
                    onChange={handleModalChange}
                    required
                  >
                    <option value="">Seleccioná método</option>
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Groomer</span>
                  <select
                    name="groomer_id"
                    value={modalForm.groomer_id}
                    onChange={handleModalChange}
                  >
                    <option value="">Seleccioná</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Notas</span>
                  <textarea
                    name="notes"
                    rows={3}
                    value={modalForm.notes}
                    onChange={handleModalChange}
                  />
                </label>
              </>
            ) : (
              <>
                <div>
                  <strong>Fecha:</strong> {formatDateDisplay(selectedService.date)}
                </div>
                <div>
                  <strong>Perro:</strong> {resolvePetName(selectedService)}
                </div>
                <div>
                  <strong>Dueño:</strong> {resolveOwnerName(selectedService)}
                </div>
                <div>
                  <strong>Servicio:</strong>{" "}
                  {resolveServiceTypeName(selectedService)}
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
              </>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setModalForm(buildModalForm(selectedService));
                      setIsEditingModal(false);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleModalSave}
                  >
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsEditingModal(true)}
                  >
                    Editar
                  </button>
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
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
