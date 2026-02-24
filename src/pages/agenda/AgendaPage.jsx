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

const DEFAULT_GROOMER_COMMISSION = 40;

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

function toNumber(value) {
  const parsed =
    typeof value === "string" ? Number(value.trim().replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTurnoGroomerId(turno) {
  return turno?.groomer_id ?? turno?.groomer?.id ?? "";
}

function getEmployeeCommissionRate(employee) {
  if (!employee) return DEFAULT_GROOMER_COMMISSION;
  const raw =
    employee.commission_rate ??
    employee.commissionRate ??
    employee.commission ??
    employee.comision ??
    employee.comision_porcentaje ??
    employee.percentage ??
    DEFAULT_GROOMER_COMMISSION;
  const rate = Number(raw);
  if (!Number.isFinite(rate)) return DEFAULT_GROOMER_COMMISSION;
  return Math.max(0, Math.min(100, rate));
}

function getServiceName(turno, serviceTypes) {
  if (turno?.service_type?.name) return turno.service_type.name;
  const match = serviceTypes.find(
    (service) => String(service.id) === String(turno?.service_type_id)
  );
  return match?.name || "-";
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    without_groomer: false,
  });
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [viewMode, setViewMode] = useState("operation");
  const [closeGroomerId, setCloseGroomerId] = useState("");
  const [showZeroFinishedRows, setShowZeroFinishedRows] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [reminder, setReminder] = useState("");
  const [reminderSaved, setReminderSaved] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("reserved");
  const [showFinishForm, setShowFinishForm] = useState(false);
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
    setShowFinishForm(false);
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
    return { total, reserved, finished };
  }, [items]);

  const statusOptions = useMemo(
    () => STATUS_OPTIONS.filter((status) => status.value !== "finished"),
    []
  );

  const dailySummaryItems = useMemo(
    () => [...items].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [items]
  );
  const nextTurno = dailySummaryItems[0] || null;
  const employeesById = useMemo(
    () =>
      new Map(
        employees
          .filter((employee) => employee?.id !== null && employee?.id !== undefined)
          .map((employee) => [String(employee.id), employee])
      ),
    [employees]
  );

  const filteredTurnos = useMemo(() => {
    const term = normalize(search);
    return items
      .filter((turno) => {
        if (filters.without_groomer && String(getTurnoGroomerId(turno) || "").trim())
          return false;
        if (filters.status && normalizeStatus(turno.status) !== filters.status) return false;
        if (!term) return true;
        const groomerName =
          turno.groomer?.name ||
          (typeof turno.groomer === "string" ? turno.groomer : "") ||
          employeesById.get(String(getTurnoGroomerId(turno) || ""))?.name ||
          "";
        return [
          turno.pet_name,
          turno.owner_name,
          groomerName,
          turno.breed,
          turno.service_type?.name,
        ]
          .filter(Boolean)
          .some((field) => normalize(field).includes(term));
      })
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [items, search, filters, employeesById]);

  const closeFilteredTurnos = useMemo(() => {
    if (!closeGroomerId) return items;
    return items.filter(
      (turno) => String(getTurnoGroomerId(turno) || "") === String(closeGroomerId)
    );
  }, [items, closeGroomerId]);

  const closeSummary = useMemo(() => {
    let reserved = 0;
    let finished = 0;
    let cancelled = 0;
    let estimatedIncome = 0;
    let finishedIncome = 0;
    let totalDeposit = 0;

    items.forEach((turno) => {
      const status = normalizeStatus(turno.status);
      const amount = getServicePrice(turno);
      estimatedIncome += amount;
      totalDeposit += toNumber(turno.deposit_amount);
      if (status === "reserved") reserved += 1;
      if (status === "finished") {
        finished += 1;
        finishedIncome += amount;
      }
      if (status === "cancelled") cancelled += 1;
    });

    const totalScheduled = items.length;
    const completionRate = totalScheduled
      ? Math.round((finished / totalScheduled) * 100)
      : 0;

    return {
      totalScheduled,
      reserved,
      finished,
      cancelled,
      completionRate,
      estimatedIncome,
      finishedIncome,
      totalDeposit,
      pendingCollection: Math.max(estimatedIncome - totalDeposit, 0),
    };
  }, [items, getServicePrice]);

  const closeLiquidationRows = useMemo(() => {
    const grouped = new Map();

    closeFilteredTurnos.forEach((turno) => {
      const rawGroomerId = getTurnoGroomerId(turno);
      const hasGroomerId = rawGroomerId !== null && rawGroomerId !== undefined && rawGroomerId !== "";
      const groomerKey = hasGroomerId ? String(rawGroomerId) : "unassigned";
      const employee = hasGroomerId ? employeesById.get(groomerKey) : null;
      const groomerName =
        turno.groomer?.name ||
        employee?.name ||
        (hasGroomerId ? `Groomer #${groomerKey}` : "Sin groomer asignado");
      const commissionRate = hasGroomerId ? getEmployeeCommissionRate(employee) : 0;

      if (!grouped.has(groomerKey)) {
        grouped.set(groomerKey, {
          groomerId: groomerKey,
          groomerName,
          commissionRate,
          scheduledCount: 0,
          finishedCount: 0,
          estimatedIncome: 0,
          finishedIncome: 0,
        });
      }

      const row = grouped.get(groomerKey);
      const amount = getServicePrice(turno);
      row.scheduledCount += 1;
      row.estimatedIncome += amount;
      if (normalizeStatus(turno.status) === "finished") {
        row.finishedCount += 1;
        row.finishedIncome += amount;
      }
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        completionRate: row.scheduledCount
          ? Math.round((row.finishedCount / row.scheduledCount) * 100)
          : 0,
        payout: row.finishedIncome * (row.commissionRate / 100),
      }))
      .sort((a, b) => b.payout - a.payout || b.finishedIncome - a.finishedIncome);
  }, [closeFilteredTurnos, employeesById, getServicePrice]);

  const closeLiquidationTotals = useMemo(
    () =>
      closeLiquidationRows.reduce(
        (acc, row) => ({
          scheduledCount: acc.scheduledCount + row.scheduledCount,
          finishedCount: acc.finishedCount + row.finishedCount,
          finishedIncome: acc.finishedIncome + row.finishedIncome,
          payout: acc.payout + row.payout,
        }),
        { scheduledCount: 0, finishedCount: 0, finishedIncome: 0, payout: 0 }
      ),
    [closeLiquidationRows]
  );

  const closeLiquidationRowsVisible = useMemo(() => {
    if (closeGroomerId) return closeLiquidationRows;
    if (showZeroFinishedRows) return closeLiquidationRows;
    return closeLiquidationRows.filter((row) => row.finishedCount > 0);
  }, [closeLiquidationRows, closeGroomerId, showZeroFinishedRows]);

  const closeLiquidationVisibleTotals = useMemo(
    () =>
      closeLiquidationRowsVisible.reduce(
        (acc, row) => ({
          scheduledCount: acc.scheduledCount + row.scheduledCount,
          finishedCount: acc.finishedCount + row.finishedCount,
          finishedIncome: acc.finishedIncome + row.finishedIncome,
          payout: acc.payout + row.payout,
        }),
        { scheduledCount: 0, finishedCount: 0, finishedIncome: 0, payout: 0 }
      ),
    [closeLiquidationRowsVisible]
  );

  const selectedCloseRow = useMemo(() => {
    if (!closeGroomerId) return null;
    return (
      closeLiquidationRows.find((row) => row.groomerId === String(closeGroomerId)) || null
    );
  }, [closeLiquidationRows, closeGroomerId]);

  const closePendingFinalizeCount = useMemo(
    () =>
      items.filter(
        (turno) => normalizeStatus(turno.status) === "reserved"
      ).length,
    [items]
  );

  const closeFinishedWithoutGroomerCount = useMemo(
    () =>
      items.filter(
        (turno) =>
          normalizeStatus(turno.status) === "finished" && !String(getTurnoGroomerId(turno) || "").trim()
      ).length,
    [items]
  );

  const closeReadyToFinishDay =
    closePendingFinalizeCount === 0 && closeFinishedWithoutGroomerCount === 0;

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
    filters.status
      ? {
          key: "status",
          label: `Estado: ${STATUS_LABELS[filters.status]}`,
          onRemove: () => setFilters((prev) => ({ ...prev, status: "" })),
        }
      : null,
    filters.without_groomer
      ? {
          key: "without_groomer",
          label: "Solo sin groomer",
          onRemove: () => setFilters((prev) => ({ ...prev, without_groomer: false })),
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

  function resetFilters() {
    setFilters({
      status: "",
      without_groomer: false,
    });
    setSearch("");
  }

  function resetCloseFilters() {
    setCloseGroomerId("");
    setShowZeroFinishedRows(false);
  }

  function goToOperationPending() {
    setViewMode("operation");
    setShowReminder(false);
    setFilters({
      status: "reserved",
      without_groomer: false,
    });
    setSearch("");
  }

  function goToOperationFinishedWithoutGroomer() {
    setViewMode("operation");
    setShowReminder(false);
    setFilters({
      status: "finished",
      without_groomer: true,
    });
    setSearch("");
  }

  return (
    <div className={`page-content agenda-page${isCompact ? " agenda-page--compact" : ""}`}>
      <div className="agenda-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Turnos diarios y control rapido del dia.
          </p>
        </div>
        {viewMode === "operation" ? (
          <button type="button" className="btn-primary agenda-cta" onClick={openCreate}>
            + Nuevo turno
          </button>
        ) : null}
      </div>

      <div className="agenda-mode-bar card">
        <div className="agenda-mode-switch" role="tablist" aria-label="Modo de agenda">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "operation"}
            className={viewMode === "operation" ? "is-active" : ""}
            onClick={() => setViewMode("operation")}
          >
            Operación
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "close"}
            className={viewMode === "close" ? "is-active" : ""}
            onClick={() => {
              setShowReminder(false);
              setViewMode("close");
            }}
          >
            Cierre del día
          </button>
        </div>
        <p className="agenda-mode-hint">
          {viewMode === "operation"
            ? "Usá este modo para cargar, editar y ejecutar turnos del día."
            : "Usá este modo para cerrar el día: revisar finalizados y liquidar por groomer."}
        </p>
      </div>

      <div className="agenda-command card">
        <div className="agenda-command__top">
          <div className="agenda-command__date">
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

          {viewMode === "operation" ? (
            <div className="agenda-search agenda-search--primary agenda-command__search">
              <input
                type="text"
                placeholder="Buscar por mascota, dueño o groomer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          ) : (
            <div className={`agenda-close-mini-note${closeReadyToFinishDay ? " is-ready" : " is-pending"}`}>
              {closeReadyToFinishDay
                ? "Cierre operativo al día."
                : "Hay pendientes antes del cierre final."}
            </div>
          )}

          <div className="agenda-command__actions">
            {viewMode === "operation" ? (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCompact((prev) => !prev)}
                >
                  {isCompact ? "Modo normal" : "Modo compacto"}
                </button>
                <button
                  type="button"
                  className={showReminder ? "btn-primary" : "btn-secondary"}
                  onClick={() => setShowReminder((prev) => !prev)}
                >
                  Nota del día
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetFilters}
                  disabled={activeFilterChips.length === 0}
                >
                  Limpiar
                </button>
              </>
            ) : null}
          </div>
        </div>

        {warning ? <div className="agenda-warning">{warning}</div> : null}

        {viewMode === "operation" ? (
          <>
            <div className="agenda-kpi-strip">
              <span className="agenda-chip agenda-chip--neutral">
                Turnos: <strong>{summary.total}</strong>
              </span>
              <span className="agenda-chip agenda-chip--pending">
                Pendientes {summary.reserved}
              </span>
              <span className="agenda-chip agenda-chip--ok">
                Finalizados {summary.finished}
              </span>
              {nextTurno ? (
                <span className="agenda-chip agenda-chip--next">
                  Próximo: {formatTime(nextTurno.time)} · {nextTurno.pet_name || "Mascota"}
                </span>
              ) : (
                <span className="agenda-chip agenda-chip--next">Sin turnos para hoy</span>
              )}
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
                <span className="agenda-filter-chips__empty">
                  Sin filtros activos. Mostrando agenda completa del día.
                </span>
              )}
            </div>
          </>
        ) : null}
      </div>

      {viewMode === "operation" ? (
        <>
          {showReminder ? (
            <div className="agenda-controls">
              <div className="agenda-reminder card">
                <div className="agenda-reminder__header">
                  <div>
                    <h2 className="card-title">
                      <span className="agenda-reminder__icon" aria-hidden="true">
                        📝
                      </span>{" "}
                      Recordatorio del día
                    </h2>
                    <p className="card-subtitle">Nota interna rápida para el equipo.</p>
                  </div>
                  <div className="agenda-reminder__actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={saveReminder}
                    >
                      {reminderSaved ? "Guardado" : "Guardar nota"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowReminder(false)}
                    >
                      Ocultar
                    </button>
                  </div>
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
          ) : null}

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
                  onClick={resetFilters}
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
        </>
      ) : (
        <>
          <div className="agenda-close-overview card">
            <div className="agenda-close-overview__header">
              <div>
                <h2 className="card-title">Estado de cierre</h2>
                <p className="card-subtitle">
                  {formatDateDisplay(selectedDate)} · checklist operativo antes de cerrar.
                </p>
              </div>
              <span
                className={`agenda-close-overview__badge${
                  closeReadyToFinishDay ? " is-ready" : " is-pending"
                }`}
              >
                {closeReadyToFinishDay ? "Listo para cerrar" : "Faltan acciones"}
              </span>
            </div>

            <div className="agenda-close-checklist">
              <article
                className={
                  closePendingFinalizeCount > 0
                    ? "agenda-close-checklist__item is-alert"
                    : "agenda-close-checklist__item is-ok"
                }
              >
                <strong>Turnos por finalizar</strong>
                <span>
                  {closePendingFinalizeCount > 0
                    ? `${closePendingFinalizeCount} pendientes`
                    : "Todo finalizado"}
                </span>
                {closePendingFinalizeCount > 0 ? (
                  <button
                    type="button"
                    className="btn-secondary agenda-close-checklist__action"
                    onClick={goToOperationPending}
                  >
                    Ver turnos pendientes
                  </button>
                ) : null}
              </article>
              <article
                className={
                  closeFinishedWithoutGroomerCount > 0
                    ? "agenda-close-checklist__item is-alert"
                    : "agenda-close-checklist__item is-ok"
                }
              >
                <strong>Finalizados sin groomer</strong>
                <span>
                  {closeFinishedWithoutGroomerCount > 0
                    ? `${closeFinishedWithoutGroomerCount} para corregir`
                    : "Sin pendientes"}
                </span>
                {closeFinishedWithoutGroomerCount > 0 ? (
                  <button
                    type="button"
                    className="btn-secondary agenda-close-checklist__action"
                    onClick={goToOperationFinishedWithoutGroomer}
                  >
                    Ver finalizados sin groomer
                  </button>
                ) : null}
              </article>
              <article
                className={
                  closeSummary.pendingCollection > 0
                    ? "agenda-close-checklist__item is-alert"
                    : "agenda-close-checklist__item is-ok"
                }
              >
                <strong>Saldo por cobrar</strong>
                <span>
                  {closeSummary.pendingCollection > 0
                    ? formatCurrency(closeSummary.pendingCollection)
                    : "Todo cobrado"}
                </span>
              </article>
            </div>

            <div className="agenda-close-kpis agenda-close-kpis--simple">
              <article className="agenda-close-kpi agenda-close-kpi--neutral">
                <span className="agenda-close-kpi__label">Turnos agendados</span>
                <strong className="agenda-close-kpi__value">{closeSummary.totalScheduled}</strong>
              </article>
              <article className="agenda-close-kpi agenda-close-kpi--success">
                <span className="agenda-close-kpi__label">Turnos finalizados</span>
                <strong className="agenda-close-kpi__value">{closeSummary.finished}</strong>
              </article>
              <article className="agenda-close-kpi agenda-close-kpi--paid">
                <span className="agenda-close-kpi__label">Facturación finalizada</span>
                <strong className="agenda-close-kpi__value">
                  {formatCurrency(closeSummary.finishedIncome)}
                </strong>
              </article>
              <article className="agenda-close-kpi agenda-close-kpi--income">
                <span className="agenda-close-kpi__label">Pago a groomers</span>
                <strong className="agenda-close-kpi__value">
                  {formatCurrency(closeLiquidationTotals.payout)}
                </strong>
              </article>
            </div>
          </div>

          <div className="agenda-close-liquidation card">
            <div className="agenda-close-liquidation__header">
              <div>
                <h2 className="card-title">Liquidación por groomer</h2>
                <p className="card-subtitle">
                  {formatDateDisplay(selectedDate)} · Comisión por defecto{" "}
                  {DEFAULT_GROOMER_COMMISSION}% si no hay valor definido en empleados.
                </p>
              </div>
              <div className="agenda-close-toolbar">
                <label className="agenda-close-filter" htmlFor="agenda-close-groomer">
                  <span>Groomer</span>
                  <select
                    id="agenda-close-groomer"
                    value={closeGroomerId}
                    onChange={(e) => setCloseGroomerId(e.target.value)}
                  >
                    <option value="">Todos los groomers</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetCloseFilters}
                  disabled={!closeGroomerId}
                >
                  Limpiar filtro
                </button>
                {!closeGroomerId ? (
                  <button
                    type="button"
                    className={`btn-secondary agenda-close-toggle${
                      showZeroFinishedRows ? " is-active" : ""
                    }`}
                    onClick={() => setShowZeroFinishedRows((prev) => !prev)}
                  >
                    {showZeroFinishedRows
                      ? "Ocultar sin finalizados"
                      : "Mostrar sin finalizados"}
                  </button>
                ) : null}
              </div>
            </div>
            {error && <div className="agenda-empty">{error}</div>}
            {loading ? (
              <div className="agenda-skeleton">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="agenda-card agenda-card--skeleton">
                    <div className="skeleton skeleton-line" />
                  </div>
                ))}
              </div>
            ) : closeLiquidationRows.length === 0 ? (
              <div className="agenda-empty">
                <p>No hay turnos cargados para este día.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setViewMode("operation")}
                >
                  Ir a Operación
                </button>
              </div>
            ) : closeLiquidationRowsVisible.length === 0 ? (
              <div className="agenda-empty">
                <p>No hay groomers con turnos finalizados para liquidar.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowZeroFinishedRows(true)}
                >
                  Mostrar también sin finalizados
                </button>
              </div>
            ) : (
              <div className="agenda-close-table-wrap">
                <table className="agenda-close-table">
                  <thead>
                    <tr>
                      <th>Groomer</th>
                      <th>Agendados</th>
                      <th>Finalizados</th>
                      <th>Cumplimiento</th>
                      <th>Facturación</th>
                      <th>Comisión</th>
                      <th>A pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closeLiquidationRowsVisible.map((row) => (
                      <tr key={row.groomerId}>
                        <td>{row.groomerName}</td>
                        <td>{row.scheduledCount}</td>
                        <td>{row.finishedCount}</td>
                        <td>{row.completionRate}%</td>
                        <td>{formatCurrency(row.finishedIncome)}</td>
                        <td>{row.commissionRate}%</td>
                        <td className="agenda-close-table__amount">
                          {formatCurrency(row.payout)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{showZeroFinishedRows || closeGroomerId ? "Total" : "Total visible"}</td>
                      <td>{closeLiquidationVisibleTotals.scheduledCount}</td>
                      <td>{closeLiquidationVisibleTotals.finishedCount}</td>
                      <td>
                        {closeLiquidationVisibleTotals.scheduledCount
                          ? Math.round(
                              (closeLiquidationVisibleTotals.finishedCount /
                                closeLiquidationVisibleTotals.scheduledCount) *
                                100
                            )
                          : 0}
                        %
                      </td>
                      <td>{formatCurrency(closeLiquidationVisibleTotals.finishedIncome)}</td>
                      <td>-</td>
                      <td className="agenda-close-table__amount">
                        {formatCurrency(closeLiquidationVisibleTotals.payout)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="agenda-close-resume card">
            <h2 className="card-title">Resumen de pago</h2>
            {selectedCloseRow ? (
              <div className="agenda-close-formula">
                <strong>{selectedCloseRow.groomerName}</strong>
                <span>
                  {formatCurrency(selectedCloseRow.finishedIncome)} ×{" "}
                  {selectedCloseRow.commissionRate}% ={" "}
                  {formatCurrency(selectedCloseRow.payout)}
                </span>
              </div>
            ) : (
              <div className="agenda-close-formula">
                <strong>Total del equipo</strong>
                <span>{formatCurrency(closeLiquidationTotals.payout)} a pagar hoy.</span>
              </div>
            )}
          </div>

          <div className="agenda-reminder card agenda-reminder--close">
            <div className="agenda-reminder__header">
              <div>
                <h2 className="card-title">
                  <span className="agenda-reminder__icon" aria-hidden="true">
                    📝
                  </span>{" "}
                  Nota de cierre
                </h2>
                <p className="card-subtitle">Dejá observaciones del día para el equipo.</p>
              </div>
              <div className="agenda-reminder__actions">
                <button type="button" className="btn-secondary" onClick={saveReminder}>
                  {reminderSaved ? "Guardado" : "Guardar nota"}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              placeholder="Ej: revisar pagos pendientes y confirmar transferencias."
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              onBlur={saveReminder}
            />
          </div>
        </>
      )}

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
                    updateStatus(selectedTurno, next);
                  }}
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              {!showFinishForm && normalizeStatus(selectedTurno.status) !== "finished" ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowFinishForm(true)}
                >
                  Dar por finalizado
                </button>
              ) : null}
              {showFinishForm ? (
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
                    className="btn-secondary"
                    onClick={() => setShowFinishForm(false)}
                  >
                    Cancelar
                  </button>
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
