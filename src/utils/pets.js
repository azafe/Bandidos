// src/utils/pets.js
// Helpers compartidos del módulo Mascotas (lista, vista rápida, ficha y
// formulario). Las estadísticas las calcula el backend con una sola consulta
// para la lista y la ficha; acá solo se normalizan, así los números coinciden
// siempre en las dos pantallas.
import { calcularEdad, diasHastaCumple } from "./cumpleanos";
import { colorForName } from "./colorPalette";
import { todayISO } from "./dates";

export const petColor = colorForName;

// Desde cuántos servicios una mascota se muestra como "Cliente fiel".
export const LOYAL_CLIENT_THRESHOLD = 10;

// Dónde guarda la lista sus filtros para que la ficha vuelva a la misma vista.
export const PETS_LIST_SEARCH_KEY = "pets:listSearch";

export const PET_SIZES = ["Mini", "Chico", "Mediano", "Grande", "Gigante"];

// ── Texto ────────────────────────────────────────────────────────────────

function isAllCaps(text) {
  return /\p{L}/u.test(text) && text === text.toUpperCase() && text !== text.toLowerCase();
}

// "SE BAÑA CON AGUA TIBIA. MUERDE" → "Se baña con agua tibia. Muerde".
// Solo cambia cómo se muestra: los datos guardados no se tocan.
export function displayText(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!isAllCaps(text)) return text;
  return text
    .toLowerCase()
    .replace(/(^|[.!?¡¿]\s*|\n\s*)(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// "JUAN PEREZ" → "Juan Perez". Para nombres de mascota, dueño y raza.
export function displayName(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!isAllCaps(text)) return text;
  return text.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

export function petInitial(name) {
  const clean = displayName(name);
  return clean ? clean.charAt(0).toUpperCase() : "?";
}

// Tamaños ya cargados que no son de la lista ("pequeño", "Mediana") se
// muestran tal cual, solo con mayúscula inicial.
export function sizeLabel(size) {
  const text = displayName(size);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── Fechas y montos ──────────────────────────────────────────────────────

function parseISODate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDate(value) {
  const d = parseISODate(value);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatShortDate(value) {
  const d = parseISODate(value);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function weekdayName(value) {
  const d = parseISODate(value);
  return d ? WEEKDAYS[d.getDay()] : "";
}

export function daysBetween(fromISO, toISO = todayISO()) {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISO);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

export function formatDaysAgo(value) {
  const days = daysBetween(value);
  if (days === null) return "";
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 60) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months < 24 ? `hace ${months} meses` : `hace ${Math.round(days / 365)} años`;
}

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

export function formatDuration(minutes) {
  const m = Number(minutes);
  if (!m || !Number.isFinite(m)) return "";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

// ── Edad y cumpleaños ────────────────────────────────────────────────────

export function petAgeLabel(pet) {
  if (pet?.birth_date) {
    const age = calcularEdad(pet.birth_date);
    if (age !== null) return age === 0 ? "Menos de 1 año" : `${age} ${age === 1 ? "año" : "años"}`;
  }
  return displayText(pet?.age);
}

export function birthdayLabel(birthDate) {
  if (!birthDate) return "";
  const days = diasHastaCumple(birthDate);
  const date = formatShortDate(birthDate);
  if (days === null) return date;
  if (days === 0) return `${date} · ¡cumple hoy!`;
  if (days === 1) return `${date} · cumple mañana`;
  return `${date} · cumple en ${days} días`;
}

// "Caniche · Chico · 5 años · Castrado": solo lo que tiene dato.
export function petSummaryLine(pet, { age = true, neutered = true } = {}) {
  return [
    displayName(pet?.breed),
    sizeLabel(pet?.size),
    age ? petAgeLabel(pet) : "",
    neutered ? (pet?.neutered ? "Castrado" : "Sin castrar") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// ── Estadísticas ─────────────────────────────────────────────────────────

// Normaliza las estadísticas que devuelve el backend (GET /v2/pets y
// GET /v2/pets/:id usan la misma consulta). Servicio = turno finalizado.
export function getPetStats(pet) {
  const servicios = Number(pet?.services_count ?? pet?.pet_service_count ?? 0) || 0;
  const ingresos = Number(pet?.revenue_total ?? 0) || 0;
  return {
    servicios,
    ingresos,
    promedio: servicios > 0 ? ingresos / servicios : 0,
    ultimaVisita: pet?.last_visit_date || null,
    proximoTurno: pet?.next_turno_date || null,
    reservados: Number(pet?.upcoming_count ?? 0) || 0,
    cancelados: Number(pet?.cancelled_count ?? 0) || 0,
    frecuenciaDias: pet?.frequency_days ? Number(pet.frequency_days) : null,
    turnosTotal: Number(pet?.turnos_count ?? 0) || 0,
  };
}

export function isLoyalClient(pet) {
  return getPetStats(pet).servicios >= LOYAL_CLIENT_THRESHOLD;
}

// ── Ficha incompleta ─────────────────────────────────────────────────────

const TRACKED_FIELDS = [
  { key: "breed", label: "raza", has: (p) => Boolean(p.breed) },
  { key: "size", label: "tamaño", has: (p) => Boolean(p.size) },
  { key: "age", label: "edad o fecha de nacimiento", has: (p) => Boolean(p.age || p.birth_date) },
  { key: "owner_phone", label: "celular", has: (p) => Boolean(p.owner_phone) },
  { key: "address", label: "dirección", has: (p) => Boolean(p.address) },
];

export function missingFields(pet) {
  if (!pet) return [];
  return TRACKED_FIELDS.filter((f) => !f.has(pet)).map(({ key, label }) => ({ key, label }));
}

// Incompleta = le falta tamaño o edad (lo que más importa para atenderla).
export function isIncomplete(pet) {
  return missingFields(pet).some((f) => f.key === "size" || f.key === "age");
}

export function completionRatio(pet) {
  return (TRACKED_FIELDS.length - missingFields(pet).length) / TRACKED_FIELDS.length;
}

// ── Búsqueda ─────────────────────────────────────────────────────────────

function normalizeSearch(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Misma regla que el backend: nombre, raza, dueño y celular (solo dígitos).
export function matchesPetSearch(pet, query) {
  const q = normalizeSearch(query).trim();
  if (!q) return true;
  const text = [pet.name, pet.breed, pet.owner_name].map(normalizeSearch).join(" ");
  if (text.includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3) {
    return String(pet.owner_phone || "").replace(/\D/g, "").includes(digits);
  }
  return false;
}

// ── WhatsApp ─────────────────────────────────────────────────────────────

// Lleva un celular argentino a formato internacional para wa.me: 549 +
// característica + número, sin el 0 de larga distancia ni el 15.
export function whatsappNumber(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12) {
    // "381 15 6882577": el 15 va después de la característica (2 a 4 dígitos).
    for (const areaLen of [3, 2, 4]) {
      if (digits.slice(areaLen, areaLen + 2) === "15") {
        digits = digits.slice(0, areaLen) + digits.slice(areaLen + 2);
        break;
      }
    }
  }
  if (digits.length < 8) return null;
  return `549${digits}`;
}

export function whatsappUrl(phone, text) {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// ── Estados de turno ─────────────────────────────────────────────────────

export const TURNO_STATUS = {
  reserved: { label: "Reservado", tone: "info" },
  finished: { label: "Finalizado", tone: "ok" },
  cancelled: { label: "Cancelado", tone: "err" },
};
