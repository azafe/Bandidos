// src/pages/services/ServiceFormPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(value) {
  if (!value) return "";
  const raw = String(value);
  const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return raw;
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [serviceTypeSearch, setServiceTypeSearch] = useState("");
  const [paymentMethodSearch, setPaymentMethodSearch] = useState("");
  const [groomerSearch, setGroomerSearch] = useState("");
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [isServiceTypeOpen, setIsServiceTypeOpen] = useState(false);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const [isGroomerOpen, setIsGroomerOpen] = useState(false);
  const [options, setOptions] = useState({
    customers: [],
    pets: [],
    serviceTypes: [],
    paymentMethods: [],
    employees: [],
  });

  const [form, setForm] = useState({
    date: todayISO(),
    customer_id: "",
    pet_id: "",
    service_type_id: "",
    price: "",
    payment_method_id: "",
    groomer_id: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    if (!form.customer_id) return;
    const match = options.customers.find(
      (c) => String(c.id) === String(form.customer_id)
    );
    if (match) {
      setCustomerSearch(match.name || "");
    }
  }, [form.customer_id, options.customers]);

  useEffect(() => {
    if (!form.pet_id) return;
    const match = options.pets.find(
      (p) => String(p.id) === String(form.pet_id)
    );
    if (match) {
      setPetSearch(match.name || "");
    }
  }, [form.pet_id, options.pets]);

  useEffect(() => {
    if (!form.service_type_id) return;
    const match = options.serviceTypes.find(
      (t) => String(t.id) === String(form.service_type_id)
    );
    if (match) {
      setServiceTypeSearch(match.name || "");
    }
  }, [form.service_type_id, options.serviceTypes]);

  useEffect(() => {
    if (!form.payment_method_id) return;
    const match = options.paymentMethods.find(
      (m) => String(m.id) === String(form.payment_method_id)
    );
    if (match) {
      setPaymentMethodSearch(match.name || "");
    }
  }, [form.payment_method_id, options.paymentMethods]);

  useEffect(() => {
    if (!form.groomer_id) return;
    const match = options.employees.find(
      (e) => String(e.id) === String(form.groomer_id)
    );
    if (match) {
      setGroomerSearch(match.name || "");
    }
  }, [form.groomer_id, options.employees]);

  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const normalizedPetSearch = petSearch.trim().toLowerCase();
  const normalizedServiceTypeSearch = serviceTypeSearch.trim().toLowerCase();
  const normalizedPaymentMethodSearch = paymentMethodSearch.trim().toLowerCase();
  const normalizedGroomerSearch = groomerSearch.trim().toLowerCase();

  const filteredCustomers = options.customers.filter((c) =>
    c.name?.toLowerCase().includes(normalizedCustomerSearch)
  );
  const filteredPets = options.pets
    .filter((p) =>
      form.customer_id ? p.customer_id === form.customer_id : true
    )
    .filter((p) => p.name?.toLowerCase().includes(normalizedPetSearch));
  const filteredServiceTypes = options.serviceTypes.filter((t) =>
    t.name?.toLowerCase().includes(normalizedServiceTypeSearch)
  );
  const filteredPaymentMethods = options.paymentMethods.filter((m) =>
    m.name?.toLowerCase().includes(normalizedPaymentMethodSearch)
  );
  const filteredGroomers = options.employees.filter((e) =>
    e.name?.toLowerCase().includes(normalizedGroomerSearch)
  );

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        setLoading(true);
        const [
          customers,
          pets,
          serviceTypes,
          paymentMethods,
          employees,
        ] = await Promise.all([
          apiRequest("/v2/customers"),
          apiRequest("/v2/pets"),
          apiRequest("/v2/service-types"),
          apiRequest("/v2/payment-methods"),
          apiRequest("/v2/employees"),
        ]);
        if (!active) return;
        setOptions({
          customers: Array.isArray(customers) ? customers : customers?.items || [],
          pets: Array.isArray(pets) ? pets : pets?.items || [],
          serviceTypes: Array.isArray(serviceTypes)
            ? serviceTypes
            : serviceTypes?.items || [],
          paymentMethods: Array.isArray(paymentMethods)
            ? paymentMethods
            : paymentMethods?.items || [],
          employees: Array.isArray(employees)
            ? employees
            : employees?.items || [],
        });
      } catch (err) {
        console.error("[ServiceFormPage] Error cargando opciones:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadService() {
      if (!id) return;
      try {
        const data = await apiRequest(`/v2/services/${id}`);
        if (!active) return;
        setForm({
          date: data.date || todayISO(),
          customer_id: data.customer_id || data.customer?.id || "",
          pet_id: data.pet_id || data.pet?.id || "",
          service_type_id: data.service_type_id || data.service_type?.id || "",
          price: data.price ? String(data.price) : "",
          payment_method_id:
            data.payment_method_id || data.payment_method?.id || "",
          groomer_id: data.groomer_id || data.groomer?.id || "",
          notes: data.notes || "",
        });
      } catch (err) {
        console.error("[ServiceFormPage] Error cargando servicio:", err);
      }
    }

    loadService();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    if (!form.customer_id) {
      alert("Seleccioná un cliente.");
      setSubmitting(false);
      return;
    }
    if (!form.pet_id) {
      alert("Seleccioná una mascota.");
      setSubmitting(false);
      return;
    }
    if (!form.service_type_id) {
      alert("Seleccioná un tipo de servicio.");
      setSubmitting(false);
      return;
    }
    if (!form.payment_method_id) {
      alert("Seleccioná un método de pago.");
      setSubmitting(false);
      return;
    }

    const payload = {
      date: form.date,
      customer_id: form.customer_id,
      pet_id: form.pet_id,
      service_type_id: form.service_type_id,
      price: Number(form.price || 0),
      payment_method_id: form.payment_method_id,
      groomer_id: form.groomer_id || null,
      notes: form.notes.trim(),
    };

    try {
      if (id) {
        await apiRequest(`/v2/services/${id}`, { method: "PUT", body: payload });
        alert("✅ Servicio actualizado correctamente.");
      } else {
        await apiRequest("/v2/services", { method: "POST", body: payload });
        alert("✅ Servicio guardado correctamente en Bandidos.");
      }
      navigate("/services");
    } catch (err) {
      console.error("[ServiceFormPage] Error al guardar servicio:", err);
      alert(
        "❌ Ocurrió un error al guardar el servicio. Revisá la consola para más detalles."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            {id ? "Editar servicio" : "Nuevo servicio"}
          </h1>
          <p className="page-subtitle">
            Cargá un baño, corte o servicio completo para Bandidos.
          </p>
        </div>
      </header>

      {/* CARD igual estilo que Empleados */}
      <div className="form-card">
        {loading && (
          <p className="card-subtitle">Cargando clientes y catálogos...</p>
        )}
        <form className="form-grid" onSubmit={handleSubmit}>
          {/* Fecha */}
          <div className="form-field">
            <label htmlFor="date">Fecha</label>
            <div className="date-field__control">
              <input
                id="date_display"
                type="text"
                className="date-field__display"
                value={formatDateDisplay(form.date)}
                placeholder="DD-MM-AAAA"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                id="date"
                name="date"
                type="date"
                className="date-field__native"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="customer_id">Cliente</label>
            <div className="combo-field">
              <input
                id="customer_search"
                name="customer_search"
                type="text"
                placeholder="Buscá por nombre..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsCustomerOpen(true);
                  setForm((prev) => ({ ...prev, customer_id: "", pet_id: "" }));
                  setPetSearch("");
                }}
                onFocus={() => setIsCustomerOpen(true)}
                onBlur={() => setTimeout(() => setIsCustomerOpen(false), 120)}
                disabled={loading}
                required
                autoComplete="off"
              />
              {isCustomerOpen && !loading ? (
                <div className="combo-field__list" role="listbox">
                  {filteredCustomers.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setForm((prev) => ({
                            ...prev,
                            customer_id: c.id,
                            pet_id: "",
                          }));
                          setCustomerSearch(c.name || "");
                          setPetSearch("");
                          setIsCustomerOpen(false);
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
                id="pet_search"
                name="pet_search"
                type="text"
                placeholder="Buscá por nombre..."
                value={petSearch}
                onChange={(e) => {
                  setPetSearch(e.target.value);
                  setIsPetOpen(true);
                  setForm((prev) => ({ ...prev, pet_id: "" }));
                }}
                onFocus={() => setIsPetOpen(true)}
                onBlur={() => setTimeout(() => setIsPetOpen(false), 120)}
                disabled={loading || !form.customer_id}
                required
                autoComplete="off"
              />
              {isPetOpen && !loading ? (
                <div className="combo-field__list" role="listbox">
                  {!form.customer_id ? (
                    <div className="combo-field__empty">
                      Seleccioná un cliente primero
                    </div>
                  ) : filteredPets.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredPets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setForm((prev) => ({ ...prev, pet_id: p.id }));
                          setPetSearch(p.name || "");
                          setIsPetOpen(false);
                        }}
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="service_type_id">Tipo de servicio</label>
            <div className="combo-field">
              <input
                id="service_type_search"
                name="service_type_search"
                type="text"
                placeholder="Buscá por nombre..."
                value={serviceTypeSearch}
                onChange={(e) => {
                  setServiceTypeSearch(e.target.value);
                  setIsServiceTypeOpen(true);
                  setForm((prev) => ({ ...prev, service_type_id: "" }));
                }}
                onFocus={() => setIsServiceTypeOpen(true)}
                onBlur={() => setTimeout(() => setIsServiceTypeOpen(false), 120)}
                disabled={loading}
                required
                autoComplete="off"
              />
              {isServiceTypeOpen && !loading ? (
                <div className="combo-field__list" role="listbox">
                  {filteredServiceTypes.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredServiceTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setForm((prev) => ({
                            ...prev,
                            service_type_id: t.id,
                          }));
                          setServiceTypeSearch(t.name || "");
                          setIsServiceTypeOpen(false);
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
            <label htmlFor="price">Precio (ARS)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="100"
              placeholder="Ej: 8500"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="payment_method_id">Método de pago</label>
            <div className="combo-field">
              <input
                id="payment_method_search"
                name="payment_method_search"
                type="text"
                placeholder="Buscá por nombre..."
                value={paymentMethodSearch}
                onChange={(e) => {
                  setPaymentMethodSearch(e.target.value);
                  setIsPaymentMethodOpen(true);
                  setForm((prev) => ({ ...prev, payment_method_id: "" }));
                }}
                onFocus={() => setIsPaymentMethodOpen(true)}
                onBlur={() => setTimeout(() => setIsPaymentMethodOpen(false), 120)}
                disabled={loading}
                required
                autoComplete="off"
              />
              {isPaymentMethodOpen && !loading ? (
                <div className="combo-field__list" role="listbox">
                  {filteredPaymentMethods.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredPaymentMethods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setForm((prev) => ({
                            ...prev,
                            payment_method_id: m.id,
                          }));
                          setPaymentMethodSearch(m.name || "");
                          setIsPaymentMethodOpen(false);
                        }}
                      >
                        {m.name}
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
                id="groomer_search"
                name="groomer_search"
                type="text"
                placeholder="Buscá por nombre..."
                value={groomerSearch}
                onChange={(e) => {
                  setGroomerSearch(e.target.value);
                  setIsGroomerOpen(true);
                  setForm((prev) => ({ ...prev, groomer_id: "" }));
                }}
                onFocus={() => setIsGroomerOpen(true)}
                onBlur={() => setTimeout(() => setIsGroomerOpen(false), 120)}
                disabled={loading}
                autoComplete="off"
              />
              {isGroomerOpen && !loading ? (
                <div className="combo-field__list" role="listbox">
                  {filteredGroomers.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredGroomers.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => {
                          setForm((prev) => ({ ...prev, groomer_id: emp.id }));
                          setGroomerSearch(emp.name || "");
                          setIsGroomerOpen(false);
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

          {/* Notas: ocupa todo el ancho */}
          <div className="form-field form-field--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Observaciones del perro o del servicio..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {/* Botón: full width en grid */}
          <div className="form-actions form-field--full">
            <button
              type="submit"
              className={`btn-primary ${
                submitting ? "btn-primary--loading" : ""
              }`}
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" />
                  Guardando...
                </>
              ) : (
                "Guardar servicio"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
