// src/pages/agenda/AgendaPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAgendaDay } from "../../hooks/useAgendaDay";
import { useApiResource } from "../../hooks/useApiResource";
import { apiRequest } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";
import "../../styles/agenda.css";

const STATUS_OPTIONS = [
  { value: "reserved", label: "Reservado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "finished", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "No-show" },
];

const STATUS_LABELS = {
  reserved: "Reservado",
  confirmed: "Confirmado",
  finished: "Finalizado",
  cancelled: "Cancelado",
  no_show: "No-show",
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(value) {
  if (!value) return "-";
  const raw = String(value).split("T")[0];
  const [yyyy, mm, dd] = raw.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(value) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function normalize(text) {
  return (text || "").toLowerCase();
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    service_type_id: "",
    groomer_id: "",
    status: "",
  });
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    date: selectedDate,
    time: "",
    duration: 60,
    pet_id: "",
    pet_name: "",
    breed: "",
    owner_name: "",
    service_type_id: "",
    payment_method_id: "",
    deposit_amount: "",
    notes: "",
    groomer_id: "",
    status: "reserved",
  });

  const { items: serviceTypes } = useApiResource("/v2/service-types");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: employees } = useApiResource("/v2/employees");
  const { items: pets } = useApiResource("/v2/pets");
  const { items, loading, error, refetch } = useAgendaDay(selectedDate);

  const summary = useMemo(() => {
    const total = items.length;
    const income = items.reduce(
      (sum, turno) => sum + (Number(turno.amount || turno.price || 0) || 0),
      0
    );
    const deposits = items.reduce(
      (sum, turno) => sum + (Number(turno.deposit_amount || 0) || 0),
      0
    );
    return { total, income, deposits };
  }, [items]);

  const filteredTurnos = useMemo(() => {
    const term = normalize(search);
    return items
      .filter((turno) => {
        if (filters.service_type_id && turno.service_type_id !== filters.service_type_id)
          return false;
        if (filters.groomer_id && turno.groomer_id !== filters.groomer_id) return false;
        if (filters.status && turno.status !== filters.status) return false;
        if (!term) return true;
        return [
          turno.pet_name,
          turno.owner_name,
          turno.breed,
          turno.service_type?.name,
        ]
          .filter(Boolean)
          .some((field) => normalize(field).includes(term));
      })
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [items, search, filters]);

  function openCreate() {
    setForm({
      date: selectedDate,
      time: "",
      duration: 60,
      pet_id: "",
      pet_name: "",
      breed: "",
      owner_name: "",
      service_type_id: "",
      payment_method_id: "",
      deposit_amount: "",
      notes: "",
      groomer_id: "",
      status: "reserved",
    });
    setFormError("");
    setIsCreating(true);
    setIsEditing(false);
  }

  function openEdit(turno) {
    setSelectedTurno(turno);
    setForm({
      date: turno.date || selectedDate,
      time: turno.time || "",
      duration: turno.duration || 60,
      pet_id: turno.pet_id || "",
      pet_name: turno.pet_name || "",
      breed: turno.breed || "",
      owner_name: turno.owner_name || "",
      service_type_id: turno.service_type_id || "",
      payment_method_id: turno.payment_method_id || "",
      deposit_amount:
        turno.deposit_amount !== null && turno.deposit_amount !== undefined
          ? String(turno.deposit_amount)
          : "",
      notes: turno.notes || "",
      groomer_id: turno.groomer_id || "",
      status: turno.status || "reserved",
    });
    setFormError("");
    setIsCreating(true);
    setIsEditing(true);
  }

  function closeForm() {
    setIsCreating(false);
    setIsEditing(false);
    setFormError("");
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePetSelect(petId) {
    const pet = pets.find((p) => String(p.id) === String(petId));
    setForm((prev) => ({
      ...prev,
      pet_id: petId,
      pet_name: pet?.name || prev.pet_name,
      breed: pet?.breed || prev.breed,
      owner_name: pet?.owner_name || prev.owner_name,
    }));
  }

  function validateForm() {
    if (!form.date) return "Seleccioná la fecha.";
    if (!form.time) return "Ingresá la hora.";
    if (!form.pet_name.trim()) return "Ingresá la mascota.";
    if (!form.owner_name.trim()) return "Ingresá el dueño.";
    if (!form.service_type_id) return "Seleccioná el servicio.";
    const amount = Number(form.deposit_amount || 0);
    if (Number.isNaN(amount) || amount < 0)
      return "El monto de pago/seña debe ser mayor o igual a 0.";
    const [hour, minute] = form.time.split(":").map(Number);
    if (hour < 7 || hour > 22 || minute > 59 || minute < 0)
      return "La hora debe estar entre 07:00 y 22:00.";
    return "";
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const conflict = items.find(
      (turno) =>
        turno.date === form.date &&
        turno.time === form.time &&
        turno.id !== selectedTurno?.id
    );
    if (conflict) {
      const ok = window.confirm(
        "Ya existe un turno en la misma fecha y hora. ¿Querés continuar?"
      );
      if (!ok) return;
    }

    setFormLoading(true);
    try {
      const payload = {
        date: form.date,
        time: form.time,
        duration: Number(form.duration || 60),
        pet_id: form.pet_id || null,
        pet_name: form.pet_name.trim(),
        breed: form.breed.trim(),
        owner_name: form.owner_name.trim(),
        service_type_id: form.service_type_id,
        payment_method_id: form.payment_method_id || null,
        deposit_amount: Number(form.deposit_amount || 0),
        notes: form.notes.trim(),
        groomer_id: form.groomer_id || null,
        status: form.status,
      };
      if (isEditing && selectedTurno) {
        await apiRequest(`/v2/agenda/${selectedTurno.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiRequest("/v2/agenda", { method: "POST", body: payload });
      }
      await refetch();
      setIsCreating(false);
      setIsEditing(false);
    } catch (err) {
      setFormError(err.message || "No se pudo guardar el turno.");
    } finally {
      setFormLoading(false);
    }
  }

  async function updateStatus(turno, status) {
    try {
      await apiRequest(`/v2/agenda/${turno.id}`, {
        method: "PUT",
        body: { status },
      });
      await refetch();
      setSelectedTurno((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      alert(err.message || "No se pudo actualizar el estado.");
    }
  }

  async function handleDelete(turno) {
    const ok = window.confirm("¿Eliminar este turno?");
    if (!ok) return;
    try {
      await apiRequest(`/v2/agenda/${turno.id}`, { method: "DELETE" });
      await refetch();
      setSelectedTurno(null);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el turno.");
    }
  }

  const activeFilterChips = [
    filters.service_type_id
      ? {
          key: "service",
          label: `Servicio: ${
            serviceTypes.find((s) => s.id === filters.service_type_id)?.name ||
            ""
          }`,
          onRemove: () => setFilters((prev) => ({ ...prev, service_type_id: "" })),
        }
      : null,
    filters.groomer_id
      ? {
          key: "groomer",
          label: `Groomer: ${
            employees.find((g) => g.id === filters.groomer_id)?.name || ""
          }`,
          onRemove: () => setFilters((prev) => ({ ...prev, groomer_id: "" })),
        }
      : null,
    filters.status
      ? {
          key: "status",
          label: `Estado: ${STATUS_LABELS[filters.status]}`,
          onRemove: () => setFilters((prev) => ({ ...prev, status: "" })),
        }
      : null,
    search
      ? {
          key: "search",
          label: `Buscar: ${search}`,
          onRemove: () => setSearch(""),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="page-content agenda-page">
      <div className="agenda-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Turnos diarios y control rapido del dia.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + Nuevo turno
        </button>
      </div>

      <div className="agenda-summary card">
        <div className="agenda-summary__main">
          <label className="agenda-date">
            <span>Fecha</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
          <div className="agenda-metrics">
            <div>
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Ingresos estimados</span>
              <strong>{formatCurrency(summary.income)}</strong>
            </div>
            <div>
              <span>Senas</span>
              <strong>{formatCurrency(summary.deposits)}</strong>
            </div>
          </div>
        </div>
        <div className="agenda-summary__filters">
          <div className="agenda-search">
            <input
              type="text"
              placeholder="Buscar mascota o dueno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="agenda-quick-filters">
            <select
              value={filters.service_type_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, service_type_id: e.target.value }))
              }
            >
              <option value="">Servicio</option>
              {serviceTypes.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <select
              value={filters.groomer_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, groomer_id: e.target.value }))
              }
            >
              <option value="">Groomer</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">Estado</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          {activeFilterChips.length > 0 ? (
            <div className="agenda-filter-chips">
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
        </div>
      </div>

      <div className="agenda-day card">
        <div className="agenda-day__header">
          <div>
            <h2 className="card-title">Turnos del dia</h2>
            <p className="card-subtitle">
              {formatDateDisplay(selectedDate)} · {filteredTurnos.length} turnos
            </p>
          </div>
        </div>

        {error && <div className="agenda-empty">{error}</div>}
        {loading ? (
          <div className="agenda-skeleton">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="agenda-card agenda-card--skeleton">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="agenda-empty">No hay turnos cargados para este dia.</div>
        ) : filteredTurnos.length === 0 ? (
          <div className="agenda-empty">
            No hay resultados para la busqueda o filtros actuales.
          </div>
        ) : (
          <div className="agenda-list">
            {filteredTurnos.map((turno) => (
              <button
                key={turno.id}
                type="button"
                className="agenda-card"
                onClick={() => {
                  setSelectedTurno(turno);
                  setIsEditing(false);
                }}
              >
                <div className="agenda-card__time">{formatTime(turno.time)}</div>
                <div className="agenda-card__body">
                  <div className="agenda-card__title">
                    {turno.pet_name || "Mascota"} -{" "}
                    {turno.service_type?.name || "Servicio"}
                  </div>
                  <div className="agenda-card__meta">
                    {turno.owner_name || "-"} · {turno.breed || "-"}
                  </div>
                  {turno.payment_method?.name ? (
                    <div className="agenda-card__pill">
                      {turno.payment_method.name}
                    </div>
                  ) : null}
                </div>
                <div className="agenda-card__side">
                  <span
                    className={`agenda-badge agenda-badge--${turno.status || "reserved"}`}
                  >
                    {STATUS_LABELS[turno.status] || "Reservado"}
                  </span>
                  {turno.deposit_amount || turno.amount || turno.price ? (
                    <div className="agenda-card__amount">
                      {formatCurrency(
                        turno.deposit_amount || turno.amount || turno.price
                      )}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedTurno)}
        onClose={() => setSelectedTurno(null)}
        title="Detalle del turno"
      >
        {selectedTurno && (
          <>
            <div className="agenda-detail">
              <div>
                <strong>Fecha:</strong> {formatDateDisplay(selectedTurno.date)}
              </div>
              <div>
                <strong>Hora:</strong> {formatTime(selectedTurno.time)}
              </div>
              <div>
                <strong>Mascota:</strong> {selectedTurno.pet_name || "-"}
              </div>
              <div>
                <strong>Raza:</strong> {selectedTurno.breed || "-"}
              </div>
              <div>
                <strong>Dueño:</strong> {selectedTurno.owner_name || "-"}
              </div>
              <div>
                <strong>Servicio:</strong>{" "}
                {selectedTurno.service_type?.name || "-"}
              </div>
              <div>
                <strong>Pago/Seña:</strong>{" "}
                {formatCurrency(selectedTurno.deposit_amount)}
              </div>
              <div>
                <strong>Notas:</strong> {selectedTurno.notes || "-"}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => openEdit(selectedTurno)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  openEdit(selectedTurno);
                }}
              >
                Registrar pago
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateStatus(selectedTurno, "confirmed")}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateStatus(selectedTurno, "finished")}
              >
                Finalizar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateStatus(selectedTurno, "no_show")}
              >
                No-show
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateStatus(selectedTurno, "cancelled")}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDelete(selectedTurno)}
              >
                Eliminar
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={isCreating}
        onClose={closeForm}
        title={isEditing ? "Editar turno" : "Nuevo turno"}
      >
        <div className="agenda-form">
          {formError ? <div className="agenda-form__error">{formError}</div> : null}
          <label className="form-field">
            <span>Fecha</span>
            <input type="date" name="date" value={form.date} onChange={handleFormChange} />
          </label>
          <label className="form-field">
            <span>Hora</span>
            <input type="time" name="time" value={form.time} onChange={handleFormChange} />
          </label>
          <label className="form-field">
            <span>Duracion (min)</span>
            <input
              type="number"
              name="duration"
              min="30"
              step="15"
              value={form.duration}
              onChange={handleFormChange}
            />
          </label>
          <label className="form-field">
            <span>Mascota</span>
            <select
              value={form.pet_id}
              onChange={(e) => handlePetSelect(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="pet_name"
              placeholder="Mascota (manual)"
              value={form.pet_name}
              onChange={handleFormChange}
            />
            <Link className="agenda-link" to="/pets">
              Crear nueva mascota
            </Link>
          </label>
          <label className="form-field">
            <span>Raza</span>
            <input type="text" name="breed" value={form.breed} onChange={handleFormChange} />
          </label>
          <label className="form-field">
            <span>Dueño</span>
            <input
              type="text"
              name="owner_name"
              value={form.owner_name}
              onChange={handleFormChange}
            />
          </label>
          <label className="form-field">
            <span>Servicio</span>
            <select
              name="service_type_id"
              value={form.service_type_id}
              onChange={handleFormChange}
            >
              <option value="">Seleccionar</option>
              {serviceTypes.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Metodo de pago</span>
            <select
              name="payment_method_id"
              value={form.payment_method_id}
              onChange={handleFormChange}
            >
              <option value="">Opcional</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Pago/Seña</span>
            <input
              type="number"
              name="deposit_amount"
              min="0"
              value={form.deposit_amount}
              onChange={handleFormChange}
            />
          </label>
          <label className="form-field">
            <span>Groomer</span>
            <select
              name="groomer_id"
              value={form.groomer_id}
              onChange={handleFormChange}
            >
              <option value="">Opcional</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Estado</span>
            <select name="status" value={form.status} onChange={handleFormChange}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Notas</span>
            <textarea name="notes" rows={3} value={form.notes} onChange={handleFormChange} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={formLoading}
            >
              {formLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
