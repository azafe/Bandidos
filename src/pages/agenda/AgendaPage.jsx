// src/pages/agenda/AgendaPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAgendaDay } from "../../hooks/useAgendaDay";
import { useApiResource } from "../../hooks/useApiResource";
import {
  createAgendaTurno,
  deleteAgendaTurno,
  updateAgendaTurno,
} from "../../services/agendaApi";
import { apiRequest } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";
import "../../styles/agenda.css";

const STATUS_OPTIONS = [
  { value: "reserved", label: "Reservado" },
  { value: "finished", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
];

const STATUS_LABELS = {
  reserved: "Reservado",
  finished: "Finalizado",
  cancelled: "Cancelado",
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
  return `${dd}-${mm}-${yyyy}`;
}

function normalizeDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (raw.includes("T")) return raw.slice(0, 10);
  return raw;
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

function formatPetLabel(pet) {
  const name = pet?.name || "Mascota";
  const owner = pet?.owner_name ? ` (${pet.owner_name})` : "";
  return `${name}${owner}`;
}

function formatDateLong(value) {
  if (!value) return "-";
  const raw = String(value).split("T")[0];
  const [yyyy, mm, dd] = raw.split("-");
  if (!yyyy || !mm || !dd) return value;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const label = d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function addDays(dateStr, delta) {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  if (!yyyy || !mm || !dd) return dateStr;
  const d = new Date(yyyy, mm - 1, dd + delta);
  const nextY = d.getFullYear();
  const nextM = String(d.getMonth() + 1).padStart(2, "0");
  const nextD = String(d.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

function formatTime(value) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function getEndTime(startTime, duration) {
  if (!startTime) return "-";
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "-";
  const total = h * 60 + m + Number(duration || 0);
  const endH = Math.floor((total % (24 * 60)) / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function normalize(text) {
  return (text || "").toLowerCase();
}

function reminderKey(date) {
  return `bandidos_agenda_reminder_${date}`;
}

function normalizeStatus(status) {
  return STATUS_LABELS[status] ? status : "reserved";
}

function getServiceName(turno, serviceTypes) {
  if (turno?.service_type?.name) return turno.service_type.name;
  const match = serviceTypes.find(
    (service) => String(service.id) === String(turno?.service_type_id)
  );
  return match?.name || "-";
}

function getPrimaryAction(turno) {
  if (normalizeStatus(turno.status) === "reserved")
    return { label: "Finalizar", status: "finished" };
  return null;
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
  const [isCompact, setIsCompact] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [reminder, setReminder] = useState("");
  const [reminderSaved, setReminderSaved] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("reserved");
  const [finishForm, setFinishForm] = useState({
    groomer_id: "",
    service_type_id: "",
    price: "",
  });
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
  const {
    items,
    loading,
    error,
    warning,
    summaryTotals,
    refetch,
  } = useAgendaDay(selectedDate);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(reminderKey(selectedDate));
      setReminder(stored || "");
      setReminderSaved(false);
    } catch {
      setReminder("");
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedTurno) return;
    const status = normalizeStatus(selectedTurno.status);
    setPendingStatus(status);
    setFinishForm({
      groomer_id: selectedTurno.groomer_id || "",
      service_type_id: selectedTurno.service_type_id || "",
      price:
        selectedTurno.price !== null && selectedTurno.price !== undefined
          ? String(selectedTurno.price)
          : "",
    });
  }, [selectedTurno]);

  const getServicePrice = useCallback(
    (turno) => {
      const fromCatalog = serviceTypes.find(
        (service) => String(service.id) === String(turno.service_type_id)
      );
      return Number(
        fromCatalog?.default_price ||
          turno.service_type?.default_price ||
          turno.service_price ||
          turno.amount ||
          turno.price ||
          0
      );
    },
    [serviceTypes]
  );

  const summary = useMemo(() => {
    const total = items.length;
    const reserved = items.filter(
      (turno) => normalizeStatus(turno.status) === "reserved"
    ).length;
    const finished = items.filter(
      (turno) => normalizeStatus(turno.status) === "finished"
    ).length;
    const cancelled = items.filter(
      (turno) => normalizeStatus(turno.status) === "cancelled"
    ).length;
    const computedIncome = items.reduce((sum, turno) => sum + getServicePrice(turno), 0);
    const computedDeposit = items.reduce(
      (sum, turno) => sum + (Number(turno.deposit_amount || 0) || 0),
      0
    );
    const income = summaryTotals?.totalEstimated ?? computedIncome;
    const deposit = summaryTotals?.totalDeposit ?? computedDeposit;
    return { total, income, deposit, reserved, finished, cancelled };
  }, [items, getServicePrice, summaryTotals]);

  const dailySummaryItems = useMemo(
    () => [...items].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [items]
  );

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

  const selectedService = useMemo(
    () => serviceTypes.find((service) => service.id === form.service_type_id),
    [serviceTypes, form.service_type_id]
  );
  const servicePrice = Number(selectedService?.default_price || 0);
  const depositAmount = Number(form.deposit_amount || 0);
  const remainingAmount = Math.max(servicePrice - depositAmount, 0);

  const filteredPets = useMemo(() => {
    const term = petSearch.trim().toLowerCase();
    if (!term) return pets;
    return pets.filter((pet) =>
      [pet.name, pet.owner_name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term))
    );
  }, [pets, petSearch]);

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
    setPetSearch("");
    setFormError("");
    setIsCreating(true);
    setIsEditing(false);
  }

  function openEdit(turno) {
    setSelectedTurno(turno);
    setForm({
      date: normalizeDate(turno.date || selectedDate),
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
      status: normalizeStatus(turno.status),
    });
    setPetSearch(turno.pet_name || "");
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
    setPetSearch(pet?.name || "");
    setIsPetOpen(false);
  }

  function saveReminder() {
    try {
      window.localStorage.setItem(reminderKey(selectedDate), reminder.trim());
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 1200);
    } catch {
      setReminderSaved(false);
    }
  }

  function validateForm() {
    if (!form.date) return { field: "agenda-date", message: "Seleccioná la fecha." };
    if (!form.time) return { field: "agenda-time", message: "Ingresá la hora." };
    if (!form.pet_name.trim())
      return { field: "agenda-pet", message: "Ingresá la mascota." };
    if (!form.owner_name.trim())
      return { field: "agenda-owner", message: "Ingresá el dueño." };
    if (!form.service_type_id)
      return { field: "agenda-service", message: "Seleccioná el servicio." };
    const amount = Number(form.deposit_amount || 0);
    if (Number.isNaN(amount) || amount < 0)
      return {
        field: "agenda-deposit",
        message: "El monto de pago/seña debe ser mayor o igual a 0.",
      };
    const [hour, minute] = form.time.split(":").map(Number);
    if (hour < 7 || hour > 22 || minute > 59 || minute < 0)
      return {
        field: "agenda-time",
        message: "La hora debe estar entre 07:00 y 22:00.",
      };
    return null;
  }

  function focusField(fieldId) {
    if (!fieldId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
    });
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError.message);
      focusField(validationError.field);
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
      const petId = normalizeId(form.pet_id);
      const serviceTypeId = normalizeId(form.service_type_id);
      const paymentMethodId = normalizeId(form.payment_method_id);
      const groomerId = normalizeId(form.groomer_id);
      const payload = {
        date: normalizeDate(form.date),
        time: form.time,
        duration: Number(form.duration || 60),
        pet_id: petId,
        pet_name: form.pet_name.trim(),
        breed: form.breed.trim(),
        owner_name: form.owner_name.trim(),
        service_type_id: serviceTypeId,
        payment_method_id: paymentMethodId,
        deposit_amount: Number(form.deposit_amount || 0),
        notes: form.notes.trim(),
        groomer_id: groomerId,
        status: normalizeStatus(form.status),
      };
      if (isEditing && selectedTurno) {
        await updateAgendaTurno(selectedTurno.id, payload);
      } else {
        await createAgendaTurno(payload);
      }
      await refetch();
      setIsCreating(false);
      setIsEditing(false);
    } catch (err) {
      if (!isEditing) {
        console.error("[agenda] Error creando turno", {
          message: err?.message,
          status: err?.status,
          payload: err?.payload,
        });
      }
      const details =
        err?.status && err?.payload
          ? ` (${err.status})`
          : err?.status
          ? ` (${err.status})`
          : "";
      setFormError(
        `${err.message || "No se pudo guardar el turno."}${details}`
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function updateStatus(turno, status) {
    return updateStatusWithDetails(turno, status, null);
  }

  async function updateStatusWithDetails(turno, status, extra) {
    try {
      const previousStatus = normalizeStatus(turno.status);
      await updateAgendaTurno(turno.id, { status, ...(extra || {}) });
      const updatedTurno = { ...turno, ...(extra || {}), status };
      if (status === "finished" && previousStatus !== "finished") {
        await createServiceFromTurno(updatedTurno);
      }
      await refetch();
      setSelectedTurno((prev) => (prev ? { ...prev, ...(extra || {}), status } : prev));
    } catch (err) {
      const details = err?.status ? ` (${err.status})` : "";
      alert(`${err.message || "No se pudo actualizar el estado."}${details}`);
    }
  }

  async function createServiceFromTurno(turno) {
    try {
      const price =
        turno.price !== null && turno.price !== undefined
          ? Number(turno.price)
          : getServicePrice(turno);
      const payload = {
        date: normalizeDate(turno.date),
        customer_id: normalizeId(turno.customer_id || turno.owner_id || null),
        pet_id: normalizeId(turno.pet_id),
        service_type_id: normalizeId(turno.service_type_id),
        price,
        payment_method_id: normalizeId(turno.payment_method_id),
        groomer_id: normalizeId(turno.groomer_id),
        notes: (turno.notes || "").trim(),
      };
      await apiRequest("/v2/services", { method: "POST", body: payload });
    } catch (err) {
      console.error("[agenda] Error creando servicio desde turno", {
        message: err?.message,
        status: err?.status,
        payload: err?.payload,
        turno_id: turno?.id,
      });
    }
  }

  async function handleDelete(turno) {
    const ok = window.confirm("¿Eliminar este turno?");
    if (!ok) return;
    try {
      await deleteAgendaTurno(turno.id);
      await refetch();
      setSelectedTurno(null);
    } catch (err) {
      const details = err?.status ? ` (${err.status})` : "";
      alert(`${err.message || "No se pudo eliminar el turno."}${details}`);
    }
  }

  async function handleFinishSubmit() {
    if (!selectedTurno) return;
    const groomerId = normalizeId(finishForm.groomer_id);
    const serviceTypeId = normalizeId(finishForm.service_type_id);
    const price = Number(finishForm.price || 0);
    if (!groomerId) {
      alert("Seleccioná el groomer.");
      return;
    }
    if (!serviceTypeId) {
      alert("Seleccioná el tipo de servicio.");
      return;
    }
    if (!price || Number.isNaN(price) || price < 0) {
      alert("Ingresá un monto válido.");
      return;
    }
    await updateStatusWithDetails(selectedTurno, "finished", {
      groomer_id: groomerId,
      service_type_id: serviceTypeId,
      price,
    });
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
    <div className={`page-content agenda-page${isCompact ? " agenda-page--compact" : ""}`}>
      <div className="agenda-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Turnos diarios y control rapido del dia.
          </p>
        </div>
        <button type="button" className="btn-primary agenda-cta" onClick={openCreate}>
          + Nuevo turno
        </button>
      </div>

      <div className="agenda-daybar card">
        <div className="agenda-daybar__left">
          <span className="agenda-daybar__label">{formatDateLong(selectedDate)}</span>
          <div className="agenda-date__controls">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
            >
              ←
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedDate(todayISO())}
            >
              Hoy
            </button>
            <div className="date-field__control">
              <input
                type="text"
                className="date-field__display"
                value={formatDateDisplay(selectedDate)}
                placeholder="DD-MM-AAAA"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                type="date"
                className="date-field__native"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
            >
              →
            </button>
          </div>
        </div>
        <div className="agenda-metrics">
          <div className="agenda-metric agenda-metric--count">
            <span>Total turnos</span>
            <strong>{summary.total}</strong>
            <div className="agenda-metric__sub">
              <span className="agenda-chip agenda-chip--ok">
                Finalizados {summary.finished}
              </span>
              <span className="agenda-chip agenda-chip--pending">
                Reservados {summary.reserved}
              </span>
              <span className="agenda-chip agenda-chip--danger">
                Cancelados {summary.cancelled}
              </span>
            </div>
          </div>
          <div className="agenda-metric agenda-metric--income">
            <span>Ingresos estimados</span>
            <strong>{formatCurrency(summary.income)}</strong>
          </div>
        </div>
        <div className="agenda-summary">
          <div className="agenda-summary__header">
            <span>Resumen diario</span>
            <strong>{summary.total} perros</strong>
          </div>
          {dailySummaryItems.length === 0 ? (
            <div className="agenda-summary__empty">Sin turnos para el día.</div>
          ) : (
            <ul className="agenda-summary__list">
              {dailySummaryItems.map((turno) => (
                <li key={turno.id} className="agenda-summary__item">
                  <span className="agenda-summary__time">
                    {formatTime(turno.time)}
                  </span>
                  <span className="agenda-summary__name">
                    {turno.pet_name || "Mascota"}
                  </span>
                  <span className="agenda-summary__detail">
                    {turno.owner_name || "-"} ·{" "}
                    {getServiceName(turno, serviceTypes)} ·{" "}
                    {STATUS_LABELS[normalizeStatus(turno.status)]} ·{" "}
                    {formatCurrency(getServicePrice(turno))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="agenda-controls">
        <div className="agenda-filters card">
          <div className="agenda-filters__header">
            <div>
              <h2 className="card-title">Busqueda y filtros</h2>
              <p className="card-subtitle">Encontrá turnos en segundos.</p>
            </div>
            <div className="agenda-filters__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsCompact((prev) => !prev)}
              >
                {isCompact ? "Modo normal" : "Modo compacto"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setFilters({ service_type_id: "", groomer_id: "", status: "" });
                  setSearch("");
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
          {warning ? <div className="agenda-warning">{warning}</div> : null}
          <div className="agenda-search agenda-search--primary">
            <input
              type="text"
              placeholder="Buscar por mascota o dueno..."
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
          <div className="agenda-filter-chips">
            {activeFilterChips.length > 0 ? (
              activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="filter-chip"
                  onClick={chip.onRemove}
                >
                  {chip.label} <span aria-hidden="true">×</span>
                </button>
              ))
            ) : (
              <span className="agenda-filter-chips__empty">Sin filtros activos</span>
            )}
          </div>
        </div>

        <div className="agenda-reminder card">
          <div className="agenda-reminder__header">
            <div>
              <h2 className="card-title">
                <span className="agenda-reminder__icon" aria-hidden="true">
                  📝
                </span>{" "}
                Recordatorio del dia
              </h2>
              <p className="card-subtitle">Nota interna para el equipo.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={saveReminder}
            >
              {reminderSaved ? "Guardado" : "Guardar nota del dia"}
            </button>
          </div>
          <textarea
            rows={4}
            placeholder="Ej: confirmar seña de Luna y cortar uñas a Toto..."
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            onBlur={saveReminder}
          />
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
          <div className="agenda-empty">
            <p>No hay turnos cargados para este dia.</p>
            <button type="button" className="btn-primary" onClick={openCreate}>
              Agregar primer turno
            </button>
          </div>
        ) : filteredTurnos.length === 0 ? (
          <div className="agenda-empty">
            <p>No hay resultados para la busqueda o filtros actuales.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFilters({ service_type_id: "", groomer_id: "", status: "" });
                setSearch("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="agenda-timeline">
            {filteredTurnos.map((turno) => (
              <div
                key={turno.id}
                className={`agenda-timeline__row agenda-timeline__row--${normalizeStatus(
                  turno.status
                )}`}
              >
                <div className="agenda-timeline__time">
                  <span className="agenda-time-range">
                    {formatTime(turno.time)} -{" "}
                    {getEndTime(turno.time, turno.duration || 60)}
                  </span>
                  <span className="agenda-time-dot" aria-hidden="true" />
                  <span className="agenda-time-line" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  className="agenda-card agenda-card--timeline"
                  onClick={() => {
                    setSelectedTurno(turno);
                    setIsEditing(false);
                  }}
                >
                  <div className="agenda-card__body">
                    <div className="agenda-card__title">
                      {turno.pet_name || "Mascota"} -{" "}
                      {getServiceName(turno, serviceTypes) || "Servicio"}
                    </div>
                    <div className="agenda-card__meta">
                      {turno.owner_name || "-"} · {turno.breed || "-"}
                    </div>
                    <div className="agenda-card__pills">
                      {turno.groomer?.name ? (
                        <span className="agenda-card__pill agenda-card__pill--groomer">
                          {turno.groomer.name}
                        </span>
                      ) : null}
                      {turno.payment_method?.name ? (
                        <span className="agenda-card__pill">
                          {turno.payment_method.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="agenda-card__side">
                    <span
                      className={`agenda-badge agenda-badge--${normalizeStatus(
                        turno.status
                      )}`}
                      title={STATUS_LABELS[normalizeStatus(turno.status)]}
                    >
                      {STATUS_LABELS[normalizeStatus(turno.status)]}
                    </span>
                    <div className="agenda-card__amount">
                      {formatCurrency(getServicePrice(turno))}
                    </div>
                  </div>
                </button>
              </div>
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
                <strong>Hora:</strong>{" "}
                {formatTime(selectedTurno.time)} -{" "}
                {getEndTime(selectedTurno.time, selectedTurno.duration || 60)}
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
                {getServiceName(selectedTurno, serviceTypes)}
              </div>
              <div>
                <strong>Precio del servicio:</strong>{" "}
                {formatCurrency(getServicePrice(selectedTurno))}
              </div>
              <div>
                <strong>Seña:</strong> {formatCurrency(selectedTurno.deposit_amount)}
              </div>
              <div>
                <strong>Saldo:</strong>{" "}
                {formatCurrency(
                  Math.max(
                    getServicePrice(selectedTurno) -
                      Number(selectedTurno.deposit_amount || 0),
                    0
                  )
                )}
              </div>
              <div>
                <strong>Notas:</strong> {selectedTurno.notes || "-"}
              </div>
            </div>
            <div className="modal-actions">
              <label className="form-field">
                <span>Estado</span>
                <select
                  value={pendingStatus}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPendingStatus(next);
                    if (next !== "finished") {
                      updateStatus(selectedTurno, next);
                    }
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              {pendingStatus === "finished" ? (
                <div className="agenda-finish">
                  <label className="form-field">
                    <span>Groomer</span>
                    <select
                      value={finishForm.groomer_id}
                      onChange={(e) =>
                        setFinishForm((prev) => ({
                          ...prev,
                          groomer_id: e.target.value,
                        }))
                      }
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
                    <span>Tipo de servicio</span>
                    <select
                      value={finishForm.service_type_id}
                      onChange={(e) =>
                        setFinishForm((prev) => ({
                          ...prev,
                          service_type_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccioná</option>
                      {serviceTypes.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Monto pagado</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={finishForm.price}
                      onChange={(e) =>
                        setFinishForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleFinishSubmit}
                  >
                    Guardar finalización
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => openEdit(selectedTurno)}
              >
                Editar
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
            <div className="date-field__control">
              <input
                type="text"
                className="date-field__display"
                value={formatDateDisplay(form.date)}
                placeholder="DD-MM-AAAA"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                type="date"
                id="agenda-date"
                name="date"
                className="date-field__native"
                value={form.date}
                onChange={handleFormChange}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Hora</span>
            <input
              id="agenda-time"
              type="time"
              name="time"
              value={form.time}
              onChange={handleFormChange}
            />
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
            <small className="agenda-helper">
              Termina {getEndTime(form.time, form.duration || 60)}
            </small>
          </label>
          <label className="form-field">
            <span>Mascota</span>
            <div className="combo-field">
              <input
                type="text"
                name="pet_name"
                id="agenda-pet"
                placeholder="Buscá por nombre..."
                value={petSearch}
                onChange={(e) => {
                  setPetSearch(e.target.value);
                  setIsPetOpen(true);
                  setForm((prev) => ({ ...prev, pet_id: "", pet_name: e.target.value }));
                }}
                onFocus={() => setIsPetOpen(true)}
                onBlur={() => setTimeout(() => setIsPetOpen(false), 120)}
                autoComplete="off"
                required
              />
              {isPetOpen ? (
                <div className="combo-field__list" role="listbox">
                  {filteredPets.length === 0 ? (
                    <div className="combo-field__empty">Sin resultados</div>
                  ) : (
                    filteredPets.map((pet) => (
                      <button
                        key={pet.id}
                        type="button"
                        className="combo-field__option"
                        onMouseDown={() => handlePetSelect(pet.id)}
                      >
                        {formatPetLabel(pet)}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
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
              id="agenda-owner"
              type="text"
              name="owner_name"
              value={form.owner_name}
              onChange={handleFormChange}
            />
          </label>
          <label className="form-field">
            <span>Servicio</span>
            <select
              id="agenda-service"
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
          <div className="agenda-price-card">
            <div>
              <span>Precio del servicio</span>
              <strong>
                {servicePrice ? formatCurrency(servicePrice) : "Sin definir"}
              </strong>
            </div>
            <div>
              <span>Seña recibida</span>
              <strong>{formatCurrency(depositAmount)}</strong>
            </div>
            <div>
              <span>Saldo a cobrar</span>
              <strong>{formatCurrency(remainingAmount)}</strong>
            </div>
          </div>
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
              id="agenda-deposit"
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
