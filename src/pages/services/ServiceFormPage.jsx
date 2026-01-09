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

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
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
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="customer_id">Cliente</label>
            <select
              id="customer_id"
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Seleccioná cliente</option>
              {options.customers.map((c) => (
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
              name="pet_id"
              value={form.pet_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Seleccioná mascota</option>
              {options.pets
                .filter((p) =>
                  form.customer_id ? p.customer_id === form.customer_id : true
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="service_type_id">Tipo de servicio</label>
            <select
              id="service_type_id"
              name="service_type_id"
              value={form.service_type_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Seleccioná servicio</option>
              {options.serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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
            <select
              id="payment_method_id"
              name="payment_method_id"
              value={form.payment_method_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Seleccioná método</option>
              {options.paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="groomer_id">Groomer</label>
            <select
              id="groomer_id"
              name="groomer_id"
              value={form.groomer_id}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Seleccioná</option>
              {options.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
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
