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
