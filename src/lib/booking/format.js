// src/lib/booking/format.js
// Formatos y validaciones de la página pública de reservas. Sin React ni
// fetch, para poder testearlos con node --test.

const moneyFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  return `$${moneyFormat.format(Number(value))}`;
}

// "$22.000 a $32.000", o "$5.000" si es precio único.
export function formatPriceRange(min, max) {
  if (min === null || min === undefined) return null;
  if (max === null || max === undefined || Number(max) === Number(min)) return formatMoney(min);
  return `${formatMoney(min)} a ${formatMoney(max)}`;
}

// 90 -> "1 h 30", 60 -> "1 h", 15 -> "15 min".
export function formatMinutes(total) {
  const minutes = Number(total);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatDurationRange(min, max) {
  if (max === null || max === undefined || Number(max) === Number(min)) return formatMinutes(min);
  return `${formatMinutes(min)} a ${formatMinutes(max)}`;
}

export const isSinglePrice = (service) =>
  service?.price_to === null || service?.price_to === undefined || Number(service.price_to) === Number(service.price_from);

// ── Fechas (siempre en hora de Argentina) ─────────────────────────────────

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const fmt = (iso, options) =>
  parseISO(iso).toLocaleDateString("es-AR", { timeZone: "UTC", ...options }).replace(",", "");

// "miércoles 30 de septiembre"
export function formatLongDate(iso) {
  return fmt(iso, { weekday: "long", day: "numeric", month: "long" });
}

// "Miércoles 30 de septiembre"
export function formatLongDateCap(iso) {
  const text = formatLongDate(iso);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Mié 30 sep"
export function formatShortDate(iso) {
  const { weekday, day, month } = dayChipParts(iso);
  return `${weekday} ${day} ${month}`;
}

// Partes para el chip de día: { weekday: "Mié", day: 30, month: "sep" }.
export function dayChipParts(iso) {
  const weekday = fmt(iso, { weekday: "short" }).replace(".", "");
  // Las tres primeras letras: según el navegador "short" da "sep" o "sept".
  const month = fmt(iso, { month: "long" }).slice(0, 3);
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: parseISO(iso).getUTCDate(),
    month,
  };
}

export function monthShort(iso) {
  return fmt(iso, { month: "long" }).slice(0, 3).toUpperCase();
}

export function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(iso) {
  return parseISO(iso).getUTCDay();
}

// Fecha de hoy en Argentina, "YYYY-MM-DD".
export function argentinaToday(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// ── Horarios ──────────────────────────────────────────────────────────────

export const SLOT_GROUPS = [
  { key: "morning", label: "Mañana", test: (h) => h < 13 },
  { key: "afternoon", label: "Tarde", test: (h) => h >= 13 && h < 20 },
  { key: "evening", label: "Noche", test: (h) => h >= 20 },
];

// Agrupa en Mañana (<13), Tarde (13 a 19:59) y Noche (≥20). Los grupos
// vacíos no se devuelven.
export function groupSlots(slots) {
  return SLOT_GROUPS.map((group) => {
    const items = slots.filter((slot) => group.test(Number(slot.slice(0, 2))));
    return {
      key: group.key,
      label: group.label,
      slots: items,
      range: items.length ? `${items[0]} a ${items[items.length - 1]}` : "",
    };
  }).filter((g) => g.slots.length);
}

// ── Celular argentino ─────────────────────────────────────────────────────

// Deja 10 dígitos (característica + número): saca +54, 9, 0 y el 15 que va
// después de la característica. Si no llega a 10, devuelve lo que haya.
export function normalizeArPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (digits.slice(areaLen, areaLen + 2) === "15") {
        digits = digits.slice(0, areaLen) + digits.slice(areaLen + 2);
        break;
      }
    }
  }
  // "15 2345 678": empezó con el 15 sin característica.
  if (digits.length === 10 && digits.startsWith("15")) return digits.slice(2);
  return digits;
}

export function isValidArPhone(input) {
  return normalizeArPhone(input).length === 10;
}

// Link de WhatsApp a un celular argentino.
export function whatsappLink(phone, text) {
  const digits = normalizeArPhone(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/549${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mapsLink(address) {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}
