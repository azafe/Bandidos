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
  const [activeTab, setActiveTab] = useState("period");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [filterCustomerSearch, setFilterCustomerSearch] = useState("");
  const [filterPetSearch, setFilterPetSearch] = useState("");
  const [filterServiceSearch, setFilterServiceSearch] = useState("");
  const [filterGroomerSearch, setFilterGroomerSearch] = useState("");
  const [isFilterCustomerOpen, setIsFilterCustomerOpen] = useState(false);
  const [isFilterPetOpen, setIsFilterPetOpen] = useState(false);
  const [isFilterServiceOpen, setIsFilterServiceOpen] = useState(false);
  const [isFilterGroomerOpen, setIsFilterGroomerOpen] = useState(false);
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
        const data = await apiRequest("/agenda", {
          params: { from: filters.from, to: filters.to },
        });
        if (!active) return;
        setServices(Array.isArray(data) ? data : data?.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudieron cargar los turnos.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters.from, filters.to]);

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
    (acc, s) => acc + getServicePrice(s),
    0
  );

  const countPeriod = servicesWithDate.length;
  const totalPeriod = servicesWithDate.reduce(
    (acc, s) => acc + getServicePrice(s),
    0
  );

  function getNameById(list, id) {
    if (!id) return "";
    const match = list.find((item) => String(item.id) === String(id));
    return match?.name || "";
  }

  const STATUS_LABELS = {
    reserved: "Reservado",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };

  function normalizeStatus(status) {
    return STATUS_LABELS[status] ? status : "reserved";
  }

  const resolveOwnerName = (service) =>
    service.owner_name ||
    service.ownerName ||
    service.customer?.name ||
    getNameById(customers, service.customer_id) ||
    "-";
  const resolvePetName = (service) =>
    service.pet_name ||
    service.dogName ||
    service.pet?.name ||
    getNameById(pets, service.pet_id) ||
    "-";
  const resolveServiceTypeName = (service) =>
    service.service_type?.name ||
    service.type ||
    getNameById(serviceTypes, service.service_type_id) ||
    "-";
  const resolvePaymentMethodName = (service) =>
    service.payment_method?.name ||
    service.paymentMethod ||
    service.payment_method?.name ||
    getNameById(paymentMethods, service.payment_method_id) ||
    "-";
  const resolveGroomerName = (service) =>
    service.groomer?.name ||
    service.groomer ||
    getNameById(employees, service.groomer_id) ||
    "-";

  function getServicePrice(service) {
    const fromCatalog = serviceTypes.find(
      (item) => String(item.id) === String(service.service_type_id)
    );
    return Number(
      fromCatalog?.default_price ||
        service.service_type?.default_price ||
        service.service_price ||
        service.amount ||
        service.price ||
        0
    );
  }

  // Filtro de búsqueda sobre los turnos
  const searchTerm = search.trim().toLowerCase();
  const serviceMatchesSearch = (service) => {
    if (!searchTerm) return true;
    return [
      service.dogName,
      service.pet?.name,
      resolvePetName(service),
      resolveOwnerName(service),
      resolveServiceTypeName(service),
      resolvePaymentMethodName(service),
      resolveGroomerName(service),
    ]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchTerm));
  };

  const matchesFilters = (service) => {
    if (filters.customer_id) {
      const customerName = getNameById(customers, filters.customer_id).toLowerCase();
      const ownerName = resolveOwnerName(service).toLowerCase();
      if (!ownerName || !customerName || !ownerName.includes(customerName)) return false;
    }
    if (filters.pet_id) {
      const petName = getNameById(pets, filters.pet_id).toLowerCase();
      const matchesId = String(service.pet_id) === String(filters.pet_id);
      const matchesName = resolvePetName(service).toLowerCase() === petName;
      if (!matchesId && !matchesName) return false;
    }
    if (filters.service_type_id) {
      const serviceName = getNameById(serviceTypes, filters.service_type_id).toLowerCase();
      const matchesId =
        String(service.service_type_id) === String(filters.service_type_id);
      const matchesName = resolveServiceTypeName(service).toLowerCase() === serviceName;
      if (!matchesId && !matchesName) return false;
    }
    if (filters.groomer_id) {
      const groomerName = getNameById(employees, filters.groomer_id).toLowerCase();
      const matchesId = String(service.groomer_id) === String(filters.groomer_id);
      const matchesName = resolveGroomerName(service).toLowerCase() === groomerName;
      if (!matchesId && !matchesName) return false;
    }
    return true;
  };

  const filteredPeriod = servicesWithDate.filter(matchesFilters).filter(serviceMatchesSearch);
  const filteredToday = servicesToday.filter(matchesFilters).filter(serviceMatchesSearch);

  const listItems = activeTab === "today" ? filteredToday : filteredPeriod;

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

  const activeFilterChips = [
    filters.customer_id
      ? {
          key: "customer",
          label: `Cliente: ${getNameById(customers, filters.customer_id)}`,
          onRemove: () =>
            setFilters((prev) => ({ ...prev, customer_id: "", pet_id: "" })),
        }
      : null,
    filters.pet_id
      ? {
          key: "pet",
          label: `Mascota: ${getNameById(pets, filters.pet_id)}`,
          onRemove: () => setFilters((prev) => ({ ...prev, pet_id: "" })),
        }
      : null,
    filters.service_type_id
      ? {
          key: "service",
          label: `Servicio: ${getNameById(serviceTypes, filters.service_type_id)}`,
          onRemove: () =>
            setFilters((prev) => ({ ...prev, service_type_id: "" })),
        }
      : null,
    filters.groomer_id
      ? {
          key: "groomer",
          label: `Groomer: ${getNameById(employees, filters.groomer_id)}`,
          onRemove: () => setFilters((prev) => ({ ...prev, groomer_id: "" })),
        }
      : null,
    searchTerm
      ? {
          key: "search",
          label: `Buscar: ${search}`,
          onRemove: () => setSearch(""),
        }
      : null,
  ].filter(Boolean);

  function clearFilters() {
    setFilters((prev) => ({
      ...prev,
      customer_id: "",
      pet_id: "",
      service_type_id: "",
      groomer_id: "",
    }));
    setFilterCustomerSearch("");
    setFilterPetSearch("");
    setFilterServiceSearch("");
    setFilterGroomerSearch("");
  }

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

  

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">
            Turnos agendados para el período seleccionado.
          </p>
        </div>

        <Link to="/agenda" className="btn-primary">
          Ver agenda
        </Link>
      </header>

      {error && (
        <div className="card" style={{ color: "#f37b7b" }}>
          {error}
        </div>
      )}

      <div className="card filters-card" style={{ marginBottom: 16 }}>
        <div className="filters-header">
          <div>
            <h3 className="card-title">Filtros</h3>
            <p className="card-subtitle">Acotá por período o por persona.</p>
          </div>
          <div className="filters-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
            {activeFilterChips.length > 0 ? (
              <button type="button" className="btn-secondary" onClick={clearFilters}>
                Limpiar
              </button>
            ) : null}
          </div>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="filters-chips">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="filter-chip"
                onClick={chip.onRemove}
              >
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="filters-grid">
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
                  onBlur={() =>
                    setTimeout(() => setIsFilterCustomerOpen(false), 120)
                  }
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
                  onBlur={() =>
                    setTimeout(() => setIsFilterServiceOpen(false), 120)
                  }
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
                  onBlur={() =>
                    setTimeout(() => setIsFilterGroomerOpen(false), 120)
                  }
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
        ) : null}
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

      <div className="card services-panel">
        <div className="services-panel__header">
          <div>
            <h2 className="card-title">Listado de turnos</h2>
            <p className="card-subtitle">
              Navegá por hoy o por el período filtrado.
            </p>
          </div>
          <div className="services-panel__controls">
            <div className="services-tabs">
              <button
                type="button"
                className={activeTab === "today" ? "tab tab--active" : "tab"}
                onClick={() => setActiveTab("today")}
              >
                Hoy
              </button>
              <button
                type="button"
                className={activeTab === "period" ? "tab tab--active" : "tab"}
                onClick={() => setActiveTab("period")}
              >
                Período
              </button>
            </div>
            <div className="services-search">
              <span className="services-search__icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                placeholder="Buscar por mascota, dueño, servicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="services-list">
          {loading ? (
            <div className="services-skeleton">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="service-item service-item--skeleton">
                  <div className="service-item__body">
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-pill" />
                  </div>
                  <div className="service-item__side">
                    <div className="skeleton skeleton-price" />
                  </div>
                </div>
              ))}
            </div>
          ) : listItems.length === 0 ? (
            <div className="services-empty">
              {activeTab === "today" && servicesToday.length === 0
                ? "Todavía no hay turnos cargados para hoy."
                : activeTab === "period" && servicesWithDate.length === 0
                ? "No hay turnos cargados en este período."
                : "No hay resultados para la búsqueda o filtros actuales."}
            </div>
          ) : (
            listItems.map((s) => (
              <div
                key={s.id}
                className="service-item"
                onClick={() => {
                  setSelectedService(s);
                }}
              >
                <div className="service-item__body">
                  <div className="service-item__title">
                    {resolvePetName(s)} - {resolveServiceTypeName(s)}
                  </div>
                  <div className="service-item__meta">
                    <span>{formatDateDisplay(s.date)}</span>
                    {s.time ? <span>{s.time}</span> : null}
                    <span>{resolveOwnerName(s)}</span>
                    <span>{resolveGroomerName(s)}</span>
                  </div>
                  <div className="service-item__badges">
                    <span className="service-badge">
                      {resolvePaymentMethodName(s)}
                    </span>
                  </div>
                </div>
                <div className="service-item__side">
                  <div className="service-item__price">
                    {formatPrice(getServicePrice(s))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        title="Detalle del turno"
      >
        {selectedService && (
          <>
            <>
              <div>
                <strong>Fecha:</strong> {formatDateDisplay(selectedService.date)}
              </div>
              {selectedService.time ? (
                <div>
                  <strong>Hora:</strong> {selectedService.time}
                </div>
              ) : null}
              <div>
                <strong>Mascota:</strong> {resolvePetName(selectedService)}
              </div>
              <div>
                <strong>Dueño:</strong> {resolveOwnerName(selectedService)}
              </div>
              <div>
                <strong>Servicio:</strong> {resolveServiceTypeName(selectedService)}
              </div>
              <div>
                <strong>Precio:</strong> {formatPrice(getServicePrice(selectedService))}
              </div>
              <div>
                <strong>Método de pago:</strong>{" "}
                {resolvePaymentMethodName(selectedService)}
              </div>
              <div>
                <strong>Groomer:</strong> {resolveGroomerName(selectedService)}
              </div>
              <div>
                <strong>Estado:</strong>{" "}
                {STATUS_LABELS[normalizeStatus(selectedService.status)]}
              </div>
              <div>
                <strong>Notas:</strong> {selectedService.notes || "-"}
              </div>
            </>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedService(null)}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
