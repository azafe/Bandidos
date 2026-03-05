// src/pages/agenda/AgendaPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150];
const DURATION_LABELS = { 15: "15 min", 30: "30 min", 45: "45 min", 60: "1 h", 90: "1 h 30", 120: "2 h", 150: "2 h 30" };
const CUSTOM_DURATION_OPTION = "other";
const FORM_STEPS = [
  { key: "details", label: "1. Datos del turno" },
  { key: "service", label: "2. Servicio y pago" },
];
const FORM_STEP_FIELDS = {
  details: ["date", "time", "duration", "pet_name"],
  service: ["service_type_id", "deposit_amount", "status"],
};
const FORM_FIELD_IDS = {
  date: "agenda-date",
  time: "agenda-time",
  duration: "agenda-duration",
  pet_name: "agenda-pet",
  service_type_id: "agenda-service",
  deposit_amount: "agenda-deposit",
  status: "agenda-status",
};
const FORM_FIELD_ORDER = [
  "date",
  "time",
  "duration",
  "pet_name",
  "service_type_id",
  "deposit_amount",
  "status",
];
const FORM_STEP_BY_FIELD = {
  date: "details",
  time: "details",
  duration: "details",
  pet_name: "details",
  service_type_id: "service",
  deposit_amount: "service",
  status: "service",
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
  const parsed = parseDateInput(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value).trim();
  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;
  const parts = raw.split(/[-/]/);
  if (parts.length !== 3) return null;
  let [p1, p2, p3] = parts.map((part) => Number(part));
  if (!p1 || !p2 || !p3) return null;
  let day, month;
  if (p1 > 12) {
    day = p1;
    month = p2;
  } else if (p2 > 12) {
    month = p1;
    day = p2;
  } else {
    month = p2;
    day = p1;
  }
  const year = p3 < 100 ? 2000 + p3 : p3;
  const constructed = new Date(year, month - 1, day);
  return Number.isNaN(constructed.getTime()) ? null : constructed;
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

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function resolveDuration(value, fallback = 60) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

function parseCustomDuration(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 12) return null;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

function formatCustomDuration(totalMinutes) {
  const normalized = Number(totalMinutes);
  if (!Number.isFinite(normalized) || normalized <= 0) return "";
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
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
  const [viewMode, setViewMode] = useState("operation");
  const [closeGroomerId, setCloseGroomerId] = useState("");
  const [showZeroFinishedRows, setShowZeroFinishedRows] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formStep, setFormStep] = useState("details");
  const [formLoading, setFormLoading] = useState(false);
  const [reminder, setReminder] = useState("");
  const [reminderSaved, setReminderSaved] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("reserved");
  const [showFinishForm, setShowFinishForm] = useState(false);
  const finishFormRef = useRef(null);
  const [durationMode, setDurationMode] = useState("preset");
  const [customDuration, setCustomDuration] = useState("");
  const [finishForm, setFinishForm] = useState({
    groomer_id: "",
    service_type_id: "",
    price: "",
    payment_method_id: "",
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
    base_price: "",
    final_price: "",
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
      payment_method_id: selectedTurno.payment_method_id || "",
    });
  }, [selectedTurno]);

  useEffect(() => {
    if (showFinishForm && finishFormRef.current) {
      finishFormRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showFinishForm]);

  const getServicePrice = useCallback(
    (turno) => {
      const fromCatalog = serviceTypes.find(
        (service) => String(service.id) === String(turno.service_type_id)
      );
      return Number(
        turno.price ||
          fromCatalog?.default_price ||
          turno.service_type?.default_price ||
          turno.service_price ||
          turno.amount ||
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
    const byPaymentMethodMap = new Map();

    items.forEach((turno) => {
      const status = normalizeStatus(turno.status);
      const amount = getServicePrice(turno);
      estimatedIncome += amount;
      totalDeposit += toNumber(turno.deposit_amount);
      if (status === "reserved") reserved += 1;
      if (status === "finished") {
        finished += 1;
        finishedIncome += amount;
        const methodId = turno.payment_method_id || null;
        const methodName = methodId
          ? paymentMethods.find((m) => m.id === methodId)?.name || "Sin método"
          : "Sin método";
        byPaymentMethodMap.set(methodName, (byPaymentMethodMap.get(methodName) || 0) + amount);
      }
      if (status === "cancelled") cancelled += 1;
    });

    const totalScheduled = items.length;
    const completionRate = totalScheduled
      ? Math.round((finished / totalScheduled) * 100)
      : 0;

    const byPaymentMethod = Array.from(byPaymentMethodMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const finishedWithoutPayment = items.filter(
      (t) => normalizeStatus(t.status) === "finished" && !t.payment_method_id
    );

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
      byPaymentMethod,
      finishedWithoutPayment,
    };
  }, [items, getServicePrice, paymentMethods]);

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
    () => serviceTypes.find((service) => String(service.id) === String(form.service_type_id)),
    [serviceTypes, form.service_type_id]
  );
  const computedServicePrice = Number(
    form.final_price && String(form.final_price).trim()
      ? Number(form.final_price)
      : selectedService?.default_price || 0
  );
  const depositAmount = Number(form.deposit_amount || 0);
  const remainingAmount = Math.max(computedServicePrice - depositAmount, 0);
  const durationValue = Number(form.duration);
  const durationPreview = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0;

  const filteredPets = useMemo(() => {
    const term = petSearch.trim().toLowerCase();
    if (!term) return pets;
    return pets.filter((pet) =>
      [pet.name, pet.owner_name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term))
    );
  }, [pets, petSearch]);
  const selectedPetRecord = useMemo(
    () => pets.find((pet) => String(pet.id) === String(form.pet_id)) || null,
    [pets, form.pet_id]
  );



  function openCreate() {
    setSelectedTurno(null);
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
      base_price: "",
      final_price: "",
    });
    setDurationMode("preset");
    setCustomDuration("");
    setPetSearch("");
    setIsPetOpen(false);
    setFormError("");
    setFieldErrors({});
    setFormStep("details");
    setIsCreating(true);
    setIsEditing(false);
  }

  function openEdit(turno) {
    const normalizedDuration = resolveDuration(turno.duration, 60);
    setSelectedTurno(turno);

    // PostgreSQL time columns return "HH:MM:SS" — truncate to "HH:MM" for backend validation
    const normalizedTime = (turno.time || "").slice(0, 5);

    // Use saved price if available, otherwise fall back to catalog default price
    const savedPrice =
      turno.price !== null && turno.price !== undefined
        ? String(turno.price)
        : "";
    const catalogPrice = (() => {
      if (savedPrice) return savedPrice;
      const fromCatalog = serviceTypes.find(
        (s) => String(s.id) === String(turno.service_type_id)
      );
      const p =
        fromCatalog?.default_price ||
        turno.service_type?.default_price ||
        0;
      return p ? String(p) : "";
    })();

    setForm({
      date: normalizeDate(turno.date || selectedDate),
      time: normalizedTime,
      duration: normalizedDuration,
      pet_id: turno.pet_id || "",
      pet_name: turno.pet_name || "",
      breed: turno.breed || "",
      owner_name: turno.owner_name || "",
      service_type_id: turno.service_type_id || "",
      payment_method_id:
        turno.payment_method_id || turno.payment_method?.id || "",
      deposit_amount:
        turno.deposit_amount !== null && turno.deposit_amount !== undefined
          ? String(turno.deposit_amount)
          : "",
      notes: turno.notes || "",
      groomer_id: turno.groomer_id || "",
      status: normalizeStatus(turno.status),
      final_price: catalogPrice,
      base_price: catalogPrice,
    });
    if (DURATION_OPTIONS.includes(normalizedDuration)) {
      setDurationMode("preset");
      setCustomDuration("");
    } else {
      setDurationMode("custom");
      setCustomDuration(formatCustomDuration(normalizedDuration));
    }
    setPetSearch(turno.pet_name || "");
    setIsPetOpen(false);
    setFormError("");
    setFieldErrors({});
    setFormStep("details");
    setIsCreating(true);
    setIsEditing(true);
  }

  function closeForm() {
    setIsCreating(false);
    setIsEditing(false);
    setIsPetOpen(false);
    setFormError("");
    setFieldErrors({});
    setFormStep("details");
  }

  function clearFieldError(fieldName) {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    if (formError) setFormError("");
    clearFieldError(name);
    if (name === "service_type_id") {
      const selected = serviceTypes.find(
        (service) => String(service.id) === String(value)
      );
      const defaultPrice =
        selected?.default_price ?? selected?.service_price ?? selected?.amount ?? 0;
      const priceString = defaultPrice ? String(defaultPrice) : "";
      setForm((prev) => ({
        ...prev,
        service_type_id: value,
        base_price: priceString,
        // Always update final_price when service changes so price stays in sync
        final_price: priceString,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTimeInputChange(e) {
    const rawValue = String(e.target.value || "");
    const compactValue = rawValue.replace(/[^\d]/g, "").slice(0, 4);
    const nextValue =
      compactValue.length > 2
        ? `${compactValue.slice(0, 2)}:${compactValue.slice(2)}`
        : compactValue;

    if (formError) setFormError("");
    clearFieldError("time");
    setForm((prev) => ({ ...prev, time: nextValue }));
  }

  function handleTimeInputBlur() {
    const minutes = parseTimeToMinutes(form.time);
    if (minutes === null) return;
    const hoursPart = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minutesPart = String(minutes % 60).padStart(2, "0");
    const normalized = `${hoursPart}:${minutesPart}`;
    if (normalized !== form.time) {
      setForm((prev) => ({ ...prev, time: normalized }));
    }
  }

  function handleDurationModeChange(e) {
    const nextValue = e.target.value;
    if (formError) setFormError("");
    clearFieldError("duration");
    if (nextValue === CUSTOM_DURATION_OPTION) {
      setDurationMode("custom");
      const current = Number(form.duration);
      if (
        Number.isFinite(current) &&
        current > 0 &&
        !DURATION_OPTIONS.includes(current)
      ) {
        setCustomDuration(formatCustomDuration(current));
      } else {
        setCustomDuration("");
        setForm((prev) => ({ ...prev, duration: "" }));
      }
      return;
    }
    const duration = Number(nextValue);
    setDurationMode("preset");
    setCustomDuration("");
    setForm((prev) => ({ ...prev, duration }));
  }

  function handleDurationPillClick(value) {
    if (formError) setFormError("");
    clearFieldError("duration");
    if (value === CUSTOM_DURATION_OPTION) {
      setDurationMode("custom");
      const current = Number(form.duration);
      if (
        Number.isFinite(current) &&
        current > 0 &&
        !DURATION_OPTIONS.includes(current)
      ) {
        setCustomDuration(formatCustomDuration(current));
      } else {
        setCustomDuration("");
        setForm((prev) => ({ ...prev, duration: "" }));
      }
      return;
    }
    setDurationMode("preset");
    setCustomDuration("");
    setForm((prev) => ({ ...prev, duration: value }));
  }

  function handleCustomDurationChange(e) {
    const next = e.target.value;
    if (formError) setFormError("");
    clearFieldError("duration");
    setCustomDuration(next);
    const parsed = parseCustomDuration(next);
    setForm((prev) => ({ ...prev, duration: parsed === null ? "" : parsed }));
  }

  function handleCustomDurationBlur() {
    const parsed = parseCustomDuration(customDuration);
    if (parsed === null) return;
    setCustomDuration(formatCustomDuration(parsed));
    setForm((prev) => ({ ...prev, duration: parsed }));
  }

  function handlePetSelect(petId) {
    const pet = pets.find((p) => String(p.id) === String(petId));
    const nextPetName = pet?.name || "";
    setForm((prev) => ({
      ...prev,
      pet_id: petId,
      pet_name: nextPetName || prev.pet_name,
      breed: pet?.breed || prev.breed,
      owner_name: pet?.owner_name || prev.owner_name,
    }));
    setPetSearch(nextPetName);
    setIsPetOpen(false);
    if (formError) setFormError("");
    clearFieldError("pet_name");
    clearFieldError("owner_name");
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

  function validateForm(onlyFields) {
    const selectedFields =
      Array.isArray(onlyFields) && onlyFields.length > 0 ? new Set(onlyFields) : null;
    const shouldValidate = (fieldName) => !selectedFields || selectedFields.has(fieldName);
    const errors = {};

    if (shouldValidate("date") && !form.date) {
      errors.date = "Seleccioná la fecha.";
    }
    if (shouldValidate("time")) {
      if (!form.time) {
        errors.time = "Ingresá la hora.";
      } else {
        const [hour, minute] = form.time.split(":").map(Number);
        if (
          Number.isNaN(hour) ||
          Number.isNaN(minute) ||
          hour < 7 ||
          hour > 22 ||
          minute > 59 ||
          minute < 0 ||
          (hour === 22 && minute > 0)
        ) {
          errors.time = "La hora debe estar entre 07:00 y 22:00 (inclusive).";
        }
      }
    }
    const duration = Number(form.duration || 0);
    if (shouldValidate("duration")) {
      if (durationMode === "custom") {
        const parsed = parseCustomDuration(customDuration);
        if (parsed === null) {
          errors.duration = "Ingresá la duración en formato HH:MM (ej: 2:30).";
        } else if (parsed <= 60) {
          errors.duration = "En 'Otro' ingresá una duración mayor a 60 minutos.";
        } else if (parsed % 15 !== 0) {
          errors.duration = "La duración personalizada debe ir en bloques de 15 minutos.";
        }
      } else if (!DURATION_OPTIONS.includes(duration)) {
        errors.duration = "Seleccioná una duración válida.";
      }
    }
    if (shouldValidate("pet_name") && !form.pet_name.trim()) {
      errors.pet_name = "Ingresá la mascota.";
    }
    if (isEditing && shouldValidate("service_type_id") && !form.service_type_id) {
      errors.service_type_id = "Seleccioná el servicio.";
    }
    const amount = Number(form.deposit_amount || 0);
    if (shouldValidate("deposit_amount") && (Number.isNaN(amount) || amount < 0)) {
      errors.deposit_amount = "El monto de pago/seña debe ser mayor o igual a 0.";
    }
    if (
      shouldValidate("status") &&
      !isEditing &&
      normalizeStatus(form.status) === "finished"
    ) {
      errors.status =
        "Un turno nuevo no puede iniciar como finalizado. Guardalo como reservado y finalizalo desde el detalle.";
    }

    return errors;
  }

  function updateFieldErrors(errors, fields) {
    if (!fields) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      fields.forEach((fieldName) => {
        delete next[fieldName];
      });
      fields.forEach((fieldName) => {
        if (errors[fieldName]) next[fieldName] = errors[fieldName];
      });
      return next;
    });
  }

  function getFirstInvalidField(errors) {
    return FORM_FIELD_ORDER.find((fieldName) => errors[fieldName]) || "";
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

  function focusInvalidField(fieldName) {
    if (fieldName === "duration" && durationMode === "custom") {
      focusField("agenda-duration-custom");
      return;
    }
    focusField(FORM_FIELD_IDS[fieldName]);
  }

  function moveToFormStep(nextStep) {
    if (nextStep === formStep) return;
    if (nextStep === "service") {
      const stepErrors = validateForm(FORM_STEP_FIELDS.details);
      if (Object.keys(stepErrors).length > 0) {
        updateFieldErrors(stepErrors, FORM_STEP_FIELDS.details);
        const firstField = getFirstInvalidField(stepErrors);
        setFormError("Completá los campos marcados antes de continuar.");
        setFormStep("details");
        focusInvalidField(firstField);
        return;
      }
    }
    setFormError("");
    setFormStep(nextStep);
  }

  async function handleSubmit() {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = getFirstInvalidField(errors);
      setFormError("Completá los campos marcados para guardar el turno.");
      setFormStep(FORM_STEP_BY_FIELD[firstField] || "details");
      focusInvalidField(firstField);
      return;
    }
    setFormError("");
    setFieldErrors({});
    const normalizedDate = normalizeDate(form.date);
    const priceValue = Number(form.final_price || 0);

    setFormLoading(true);
    try {
      const petId = normalizeId(form.pet_id);
      const serviceTypeId = normalizeId(form.service_type_id);
      const paymentMethodId = normalizeId(form.payment_method_id);
      const groomerId = normalizeId(form.groomer_id);
      const payload = {
        date: normalizedDate,
        time: form.time,
        duration: resolveDuration(form.duration, 60),
        pet_id: petId,
        pet_name: form.pet_name.trim(),
        breed: form.breed.trim(),
        owner_name: form.owner_name.trim(),
        service_type_id: serviceTypeId ?? undefined,
        payment_method_id: paymentMethodId ?? undefined,
        deposit_amount: Number(form.deposit_amount || 0),
        notes: form.notes.trim(),
        groomer_id: groomerId ?? undefined,
        status: normalizeStatus(form.status),
        price: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : undefined,
      };
      if (isEditing && selectedTurno) {
        await updateAgendaTurno(selectedTurno.id, payload);
        await refetch();
        setSelectedTurno((prev) =>
          prev ? { ...prev, ...payload, price: payload.price ?? prev.price } : prev
        );
      } else {
        await createAgendaTurno(payload);
        await refetch();
      }
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
    const turnoLabel = `${turno?.pet_name || "Mascota"} · ${formatDateDisplay(
      turno?.date
    )} ${formatTime(turno?.time)}`;
    const ok = window.confirm(`¿Eliminar este turno?\n${turnoLabel}`);
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
    const deposit = Number(selectedTurno.deposit_amount || 0);
    if (!groomerId) {
      alert("Seleccioná el groomer.");
      return;
    }
    if (!serviceTypeId) {
      alert("Seleccioná el tipo de servicio.");
      return;
    }
    if (!price || Number.isNaN(price) || price < 0) {
      alert("Ingresá el costo total del servicio.");
      return;
    }
    if (price < deposit) {
      alert("El costo total no puede ser menor que la seña registrada.");
      return;
    }
    const paymentMethodId = normalizeId(finishForm.payment_method_id);
    await updateStatusWithDetails(selectedTurno, "finished", {
      groomer_id: groomerId,
      service_type_id: serviceTypeId,
      price,
      ...(paymentMethodId ? { payment_method_id: paymentMethodId } : {}),
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
  const selectedTurnoStatus = selectedTurno
    ? normalizeStatus(selectedTurno.status)
    : "reserved";
  const selectedTurnoPrice = selectedTurno ? getServicePrice(selectedTurno) : 0;
  const selectedTurnoDeposit = Number(selectedTurno?.deposit_amount || 0);
  const selectedTurnoBalance = Math.max(selectedTurnoPrice - selectedTurnoDeposit, 0);
  const finishTotalAmount = Number(finishForm.price || 0);
  const finishRemainingAmount = Math.max(finishTotalAmount - selectedTurnoDeposit, 0);

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
    setFilters({
      status: "reserved",
      without_groomer: false,
    });
    setSearch("");
  }

  function goToOperationFinishedWithoutGroomer() {
    setViewMode("operation");
    setFilters({
      status: "finished",
      without_groomer: true,
    });
    setSearch("");
  }

  return (
    <div className="page-content agenda-page">
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
              onClick={() => setViewMode("close")}
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
          <div className="agenda-day card">
            <div className="agenda-day__header">
              <div>
                <h2 className="card-title">Turnos del dia</h2>
                <p className="card-subtitle">
                  {formatDateDisplay(selectedDate)} · {filteredTurnos.length} turnos
                </p>
              </div>
            </div>
            <div className="agenda-day__note">
              <div className="agenda-reminder__header">
                <div>
                  <h3 className="agenda-day__note-title">
                    <span className="agenda-reminder__icon" aria-hidden="true">
                      📝
                    </span>{" "}
                    Nota del día
                  </h3>
                  <p className="card-subtitle">
                    Observaciones operativas del día (equipo, pagos, ausencias, etc.).
                  </p>
                </div>
                <div className="agenda-reminder__actions">
                  <button type="button" className="btn-secondary" onClick={saveReminder}>
                    {reminderSaved ? "Guardado" : "Guardar nota"}
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                placeholder='Ej: "Hoy Ana no asiste" · "Pagar $20.000 a Marco".'
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                onBlur={saveReminder}
              />
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
                        console.log("[turno detalle]", turno);
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

            {closeSummary.byPaymentMethod.length > 0 && (
              <div className="agenda-close-payment-breakdown">
                <h4 className="agenda-close-payment-breakdown__title">Ingresos por método de pago</h4>
                <div className="agenda-close-payment-breakdown__rows">
                  {closeSummary.byPaymentMethod.map(({ name, total }) => (
                    <div key={name} className="agenda-close-payment-breakdown__row">
                      <span>{name}</span>
                      <strong>{formatCurrency(total)}</strong>
                    </div>
                  ))}
                  <div className="agenda-close-payment-breakdown__row agenda-close-payment-breakdown__row--total">
                    <span>Total facturado</span>
                    <strong>{formatCurrency(closeSummary.finishedIncome)}</strong>
                  </div>
                </div>

                {closeSummary.finishedWithoutPayment.length > 0 && (
                  <div className="agenda-close-payment-breakdown__missing">
                    <span className="agenda-close-payment-breakdown__missing-label">
                      ⚠ {closeSummary.finishedWithoutPayment.length} turno{closeSummary.finishedWithoutPayment.length !== 1 ? "s" : ""} sin método de pago:
                    </span>
                    <div className="agenda-close-payment-breakdown__missing-list">
                      {closeSummary.finishedWithoutPayment.map((turno) => (
                        <button
                          key={turno.id}
                          type="button"
                          className="agenda-close-payment-breakdown__missing-btn"
                          onClick={() => {
                            setSelectedTurno(null);
                            openEdit(turno);
                          }}
                        >
                          {turno.pet_name || "Mascota"} · {turno.owner_name || "Cliente"} · {(turno.time || "").slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            <div className="agenda-turno-modal">
              <div className="agenda-turno-modal__hero">
                <div>
                  <p className="agenda-turno-modal__eyebrow">
                    {formatDateDisplay(selectedTurno.date)} · {formatTime(selectedTurno.time)} -{" "}
                    {getEndTime(selectedTurno.time, selectedTurno.duration || 60)}
                  </p>
                  <h3 className="agenda-turno-modal__title">
                    {selectedTurno.pet_name || "Mascota"} -{" "}
                    {getServiceName(selectedTurno, serviceTypes)}
                  </h3>
                  <p className="agenda-turno-modal__subtitle">
                    {selectedTurno.owner_name || "-"} · {selectedTurno.breed || "-"}
                    {selectedTurno.groomer?.name
                      ? ` · Groomer: ${selectedTurno.groomer.name}`
                      : ""}
                  </p>
                </div>
                <span className={`agenda-badge agenda-badge--${selectedTurnoStatus}`}>
                  {STATUS_LABELS[selectedTurnoStatus]}
                </span>
              </div>

              <div className="agenda-turno-modal__metrics">
                <article className="agenda-turno-modal__metric">
                  <span>Precio del servicio</span>
                  <strong>{formatCurrency(selectedTurnoPrice)}</strong>
                </article>
                <article className="agenda-turno-modal__metric">
                  <span>Seña registrada</span>
                  <strong>{formatCurrency(selectedTurnoDeposit)}</strong>
                </article>
                <article className="agenda-turno-modal__metric">
                  <span>Saldo pendiente</span>
                  <strong
                    className={
                      selectedTurnoBalance > 0
                        ? "agenda-turno-modal__balance--pending"
                        : "agenda-turno-modal__balance--clear"
                    }
                  >
                    {formatCurrency(selectedTurnoBalance)}
                  </strong>
                </article>
              </div>

              <div className="agenda-turno-modal__grid">
                <article className="agenda-turno-modal__panel">
                  <h4>Detalle operativo</h4>
                  <div className="agenda-turno-modal__pairs">
                    <div className="agenda-turno-modal__pair">
                      <span>Mascota</span>
                      <strong>{selectedTurno.pet_name || "-"}</strong>
                    </div>
                    <div className="agenda-turno-modal__pair">
                      <span>Dueño</span>
                      <strong>{selectedTurno.owner_name || "-"}</strong>
                    </div>
                    <div className="agenda-turno-modal__pair">
                      <span>Raza</span>
                      <strong>{selectedTurno.breed || "-"}</strong>
                    </div>
                    <div className="agenda-turno-modal__pair">
                      <span>Método de pago</span>
                      <strong>
                        {paymentMethods.find(
                          (m) => m.id === selectedTurno.payment_method_id
                        )?.name ||
                          selectedTurno.payment_method?.name ||
                          "-"}
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="agenda-turno-modal__panel">
                  <h4>Notas</h4>
                  <p
                    className={`agenda-turno-modal__notes${
                      selectedTurno.notes ? "" : " is-empty"
                    }`}
                  >
                    {selectedTurno.notes ||
                      "Sin notas cargadas para este turno."}
                  </p>
                </article>
              </div>

              {showFinishForm ? (
                <div className="agenda-turno-modal__finish" ref={finishFormRef}>
                  <div className="agenda-turno-modal__finish-header">
                    <h4>Cerrar y facturar turno</h4>
                    <p>Completá los datos para registrar la finalización.</p>
                  </div>
                  <div className="agenda-finish-summary">
                    <div className="agenda-finish-summary__item">
                      <span className="agenda-finish-summary__label">Costo total</span>
                      <strong className="agenda-finish-summary__value">
                        {formatCurrency(finishTotalAmount)}
                      </strong>
                    </div>
                    <div className="agenda-finish-summary__item">
                      <span className="agenda-finish-summary__label">Seña registrada</span>
                      <strong className="agenda-finish-summary__value">
                        {formatCurrency(selectedTurnoDeposit)}
                      </strong>
                    </div>
                    <div className="agenda-finish-summary__item">
                      <span className="agenda-finish-summary__label">Saldo pendiente</span>
                      <strong className={`agenda-finish-summary__value${finishRemainingAmount > 0 ? " agenda-finish-summary__value--pending" : ""}`}>
                        {formatCurrency(finishRemainingAmount)}
                      </strong>
                    </div>
                  </div>
                  <div className="agenda-finish agenda-finish--modal">
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
                    <div className="agenda-finish__price-payment-row">
                      <label className="form-field agenda-finish__price-field">
                        <span>Costo total final</span>
                        <div className="agenda-input-currency">
                          <span>$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={finishForm.price}
                            onChange={(e) =>
                              setFinishForm((prev) => ({ ...prev, price: e.target.value }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <small className="agenda-helper">
                          Precio total para recalcular el saldo.
                        </small>
                      </label>
                      <label className="form-field">
                        <span>Método de pago</span>
                        <select
                          value={finishForm.payment_method_id}
                          onChange={(e) =>
                            setFinishForm((prev) => ({ ...prev, payment_method_id: e.target.value }))
                          }
                        >
                          <option value="">Sin especificar</option>
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={method.id}>
                              {method.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="agenda-turno-modal__finish-actions">
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
                </div>
              ) : null}
            </div>
            <div className="modal-actions agenda-turno-modal__actions">
              <label className="form-field agenda-turno-modal__status-field">
                <span>Estado operativo</span>
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
              <div className="agenda-turno-modal__action-buttons">
                {!showFinishForm && selectedTurnoStatus !== "finished" ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setFinishForm((prev) => {
                        if (String(prev.price || "").trim()) return prev;
                        return {
                          ...prev,
                          price: selectedTurnoPrice > 0 ? String(selectedTurnoPrice) : "",
                        };
                      });
                      setShowFinishForm(true);
                    }}
                  >
                    Dar por finalizado
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedTurno(null);
                    openEdit(selectedTurno);
                  }}
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
          {isEditing ? (
            <div className="agenda-form__steps" role="tablist" aria-label="Pasos del turno">
              {FORM_STEPS.map((step) => (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  className={`agenda-form__step${formStep === step.key ? " is-active" : ""}`}
                  aria-selected={formStep === step.key}
                  onClick={() => moveToFormStep(step.key)}
                >
                  {step.label}
                </button>
              ))}
            </div>
          ) : null}
          {isEditing ? (
            <p className="agenda-form__step-hint">
              {formStep === "details"
                ? "Definí fecha, hora y mascota. En el segundo paso completás servicio y cobro."
                : "Completá servicio, pago y notas antes de guardar."}
            </p>
          ) : null}
          {formError ? <div className="agenda-form__error">{formError}</div> : null}
          {!isEditing || formStep === "details" ? (
            <div className="agenda-form__section">
              <div className="agenda-form__group-label">Cuándo</div>
              <div className="agenda-form__row">
                <label
                  className={`form-field${fieldErrors.date ? " form-field--error" : ""}`}
                >
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
                      aria-invalid={Boolean(fieldErrors.date)}
                    />
                  </div>
                  {fieldErrors.date ? (
                    <small className="agenda-field-error">{fieldErrors.date}</small>
                  ) : null}
                </label>
                <label
                  className={`form-field${fieldErrors.time ? " form-field--error" : ""}`}
                >
                  <span>Hora</span>
                  <input
                    id="agenda-time"
                    type="text"
                    name="time"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    value={form.time}
                    onChange={handleTimeInputChange}
                    onBlur={handleTimeInputBlur}
                    aria-invalid={Boolean(fieldErrors.time)}
                  />
                  <small className="agenda-helper">07:00 a 22:00</small>
                  {fieldErrors.time ? (
                    <small className="agenda-field-error">{fieldErrors.time}</small>
                  ) : null}
                </label>
              </div>
              <label
                className={`form-field${fieldErrors.duration ? " form-field--error" : ""}`}
              >
                <span>Duración</span>
                <div className="agenda-duration-pills">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`agenda-duration-pill${durationMode === "preset" && form.duration === d ? " is-active" : ""}`}
                      onClick={() => handleDurationPillClick(d)}
                    >
                      {DURATION_LABELS[d]}
                    </button>
                  ))}
                </div>
                {form.time && durationPreview ? (
                  <span className="agenda-time-badge">
                    {form.time} → {getEndTime(form.time, durationPreview)} ({durationPreview} min)
                  </span>
                ) : null}
                {fieldErrors.duration ? (
                  <small className="agenda-field-error">{fieldErrors.duration}</small>
                ) : null}
              </label>
              <div className="agenda-form__group-label">Mascota</div>
              <label
                className={`form-field${fieldErrors.pet_name ? " form-field--error" : ""}`}
              >
                <span>Nombre</span>
                <div className="combo-field">
                  <input
                    type="text"
                    name="pet_name"
                    id="agenda-pet"
                    placeholder="Buscá por nombre..."
                    value={petSearch}
                    onChange={(e) => {
                      const nextPetName = e.target.value;
                      if (formError) setFormError("");
                      clearFieldError("pet_name");
                      clearFieldError("owner_name");
                      setPetSearch(nextPetName);
                      setIsPetOpen(true);
                      setForm((prev) => {
                        const selectedName = selectedPetRecord?.name || "";
                        const shouldResetLinked = Boolean(prev.pet_id) && nextPetName !== selectedName;
                        return {
                          ...prev,
                          pet_id: "",
                          pet_name: nextPetName,
                          breed: shouldResetLinked ? "" : prev.breed,
                          owner_name: shouldResetLinked ? "" : prev.owner_name,
                        };
                      });
                    }}
                    onFocus={() => setIsPetOpen(true)}
                    onBlur={() => setTimeout(() => setIsPetOpen(false), 120)}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.pet_name)}
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
                {selectedPetRecord ? (
                  <div className="agenda-pet-chip">
                    <span className="agenda-pet-chip__name">{selectedPetRecord.name}</span>
                    {form.breed ? (
                      <span className="agenda-pet-chip__detail">{form.breed}</span>
                    ) : null}
                    {form.owner_name ? (
                      <span className="agenda-pet-chip__detail">· {form.owner_name}</span>
                    ) : null}
                  </div>
                ) : (
                  <small className="agenda-helper">
                    Si la mascota no existe, podés crearla y volver al turno.
                  </small>
                )}
                {fieldErrors.pet_name ? (
                  <small className="agenda-field-error">{fieldErrors.pet_name}</small>
                ) : null}
                <Link className="agenda-link agenda-link--secondary" to="/pets">
                  Ir a Mascotas para crear una nueva
                </Link>
              </label>
            </div>
          ) : isEditing ? (
            <div className="agenda-form__section">
              <label
                className={`form-field${fieldErrors.service_type_id ? " form-field--error" : ""}`}
              >
                <span>Servicio</span>
                <select
                  id="agenda-service"
                  name="service_type_id"
                  value={form.service_type_id}
                  onChange={handleFormChange}
                  aria-invalid={Boolean(fieldErrors.service_type_id)}
                >
                  <option value="">Seleccionar</option>
                  {serviceTypes.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.service_type_id ? (
                  <small className="agenda-field-error">{fieldErrors.service_type_id}</small>
                ) : null}
              </label>
              <label className="form-field">
                <span>Precio del turno</span>
                <div className="agenda-input-currency">
                  <span>$</span>
                  <input
                    type="number"
                    name="final_price"
                    min="0"
                    step="1"
                    value={form.final_price}
                    onChange={handleFormChange}
                    placeholder="0"
                  />
                </div>
                {selectedService?.default_price && (
                  <span className="agenda-catalog-badge">
                    Catálogo: {formatCurrency(Number(selectedService.default_price))}
                  </span>
                )}
              </label>
              <div className="agenda-price-card">
                <div className="agenda-price-card__deposit">
                  <span className="agenda-price-card__label">Seña / anticipo</span>
                  <div className="agenda-input-currency">
                    <span>$</span>
                    <input
                      id="agenda-deposit"
                      type="number"
                      name="deposit_amount"
                      min="0"
                      step="1"
                      value={form.deposit_amount}
                      onChange={handleFormChange}
                      placeholder="0"
                      aria-invalid={Boolean(fieldErrors.deposit_amount)}
                    />
                  </div>
                  {fieldErrors.deposit_amount && (
                    <small className="agenda-field-error">{fieldErrors.deposit_amount}</small>
                  )}
                </div>
                <div className="agenda-price-card__remaining">
                  <span className="agenda-price-card__label">Saldo a cobrar</span>
                  <strong className={remainingAmount > 0 ? "agenda-price-card__amount--highlight" : ""}>
                    {formatCurrency(remainingAmount)}
                  </strong>
                </div>
              </div>
              <label className="form-field">
                <span>Método de pago</span>
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
              {isEditing ? (
                <label
                  className={`form-field${fieldErrors.status ? " form-field--error" : ""}`}
                >
                  <span>Estado</span>
                  <select
                    id="agenda-status"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    aria-invalid={Boolean(fieldErrors.status)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.status ? (
                    <small className="agenda-field-error">{fieldErrors.status}</small>
                  ) : null}
                </label>
              ) : (
                <div className="agenda-form__readonly-status">
                  <span>Estado inicial</span>
                  <strong>Reservado</strong>
                  <small>Se finaliza o cancela desde el detalle del turno.</small>
                </div>
              )}
              <label className="form-field">
                <span>Notas</span>
                <textarea
                  name="notes"
                  rows={4}
                  value={form.notes}
                  onChange={handleFormChange}
                />
              </label>
            </div>
          ) : null}
          <div className="modal-actions agenda-form__actions">
            {isEditing && formStep === "service" ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => moveToFormStep("details")}
              >
                Volver
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
            {isEditing && formStep === "details" ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => moveToFormStep("service")}
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={formLoading}
              >
                {formLoading ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
