// src/services/publicBookingApi.js
// Web de reservas del lado del cliente: sin login.
import { publicRequest } from "./apiClient";

const base = (slug) => `/public/booking/${encodeURIComponent(slug)}`;

export function getBookingPage(slug) {
  return publicRequest(base(slug));
}

export function getAvailability(slug, { serviceTypeId, size, from, days }) {
  return publicRequest(`${base(slug)}/availability`, {
    params: { service_type_id: serviceTypeId, size, from, days },
  });
}

export function createReservation(slug, payload) {
  return publicRequest(`${base(slug)}/reservations`, { method: "POST", body: payload });
}

export function getReservation(slug, token) {
  return publicRequest(`${base(slug)}/reservations/${encodeURIComponent(token)}`);
}

export function cancelReservation(slug, token) {
  return publicRequest(`${base(slug)}/reservations/${encodeURIComponent(token)}/cancel`, { method: "POST" });
}

// ── Formato ──────────────────────────────────────────────────────────────

export function formatMoney(value) {
  if (value === null || value === undefined) return null;
  return `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function formatMinutes(minutes) {
  const m = Number(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest} min`;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

function isoToLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "lunes 28 de septiembre"
export function formatLongDate(iso) {
  return isoToLocalDate(iso)
    .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    .replace(",", "");
}

export function formatWeekdayShort(iso) {
  return isoToLocalDate(iso).toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}

export function formatMonthName(iso) {
  return isoToLocalDate(iso).toLocaleDateString("es-AR", { month: "long" });
}

// Link "Agregar a Google Calendar". Argentina es UTC-3 todo el año.
export function googleCalendarUrl({ title, details, location, date, time, duration }) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, hh + 3, mm));
  const end = new Date(start.getTime() + Number(duration) * 60000);
  const fmt = (dt) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: details || "",
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
