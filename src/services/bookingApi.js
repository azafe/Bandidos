// src/services/bookingApi.js
// Web de reservas: configuración del local y bloqueos de horario de la agenda.
import { apiRequest } from "./apiClient";

export const BOOKING_SIZES = [
  { value: "chico", label: "Chico" },
  { value: "mediano", label: "Mediano" },
  { value: "grande", label: "Grande" },
  { value: "gigante", label: "Gigante" },
];

// Link público de la página de reservas de un local.
export function bookingPublicUrl(slug) {
  return slug ? `${window.location.origin}/reservar/${slug}` : "";
}

export function getBookingConfig() {
  return apiRequest("/v2/booking/settings");
}

export function saveBookingSettings(payload) {
  return apiRequest("/v2/booking/settings", { method: "PUT", body: payload });
}

export function saveBookingHours(hours) {
  return apiRequest("/v2/booking/hours", { method: "PUT", body: { hours } });
}

export function addClosedDay(payload) {
  return apiRequest("/v2/booking/closed-days", { method: "POST", body: payload });
}

export function removeClosedDay(id) {
  return apiRequest(`/v2/booking/closed-days/${id}`, { method: "DELETE" });
}

export function getBookingLink() {
  return apiRequest("/v2/booking/link");
}

export async function listAgendaBlocks({ from, to }) {
  const data = await apiRequest("/v2/agenda/blocks", { params: { from, to } });
  return Array.isArray(data) ? data : [];
}

export function createAgendaBlock(payload) {
  return apiRequest("/v2/agenda/blocks", { method: "POST", body: payload });
}

export function deleteAgendaBlock(id) {
  return apiRequest(`/v2/agenda/blocks/${id}`, { method: "DELETE" });
}

// Copia al portapapeles; devuelve false si el navegador no lo permite.
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
