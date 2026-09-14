// src/services/agendaApi.js
import { apiRequest } from "./apiClient";

export const AGENDA_CONTRACT = {
  listDay: "/agenda",
  listRange: "/agenda",
  summary: "/agenda/summary",
  counts: "/agenda/counts",
  create: "/agenda",
  update: (id) => `/agenda/${id}`,
  remove: (id) => `/agenda/${id}`,
  dayNote: "/agenda/day-note",
};

const isDev = import.meta.env.DEV;

function debugLog(message, payload) {
  if (!isDev) return;
  console.debug(message, payload);
}

export async function listAgendaDay(date) {
  const params = { date };
  debugLog("[agenda] GET", { url: AGENDA_CONTRACT.listDay, params });
  const data = await apiRequest(AGENDA_CONTRACT.listDay, { params });
  return { items: Array.isArray(data) ? data : data?.items || [] };
}

export async function listAgendaRange({ from, to }) {
  const params = { from, to };
  debugLog("[agenda] GET", { url: AGENDA_CONTRACT.listRange, params });
  const data = await apiRequest(AGENDA_CONTRACT.listRange, { params });
  return { items: Array.isArray(data) ? data : data?.items || [] };
}

export async function listAgendaCounts({ from, to }) {
  const params = { from, to };
  debugLog("[agenda] GET", { url: AGENDA_CONTRACT.counts, params });
  const data = await apiRequest(AGENDA_CONTRACT.counts, { params });
  return { rows: Array.isArray(data) ? data : [] };
}

export async function listAgendaSummary({ from, to }) {
  const params = { from, to };
  debugLog("[agenda] GET", { url: AGENDA_CONTRACT.summary, params });
  const data = await apiRequest(AGENDA_CONTRACT.summary, { params });
  return {
    totalEstimated: Number(data?.total_estimated ?? data?.totalEstimated ?? 0),
    totalDeposit: Number(data?.total_deposit ?? data?.totalDeposit ?? 0),
  };
}

export async function createAgendaTurno(payload) {
  debugLog("[agenda] POST", { url: AGENDA_CONTRACT.create, payload });
  return apiRequest(AGENDA_CONTRACT.create, { method: "POST", body: payload });
}

export async function updateAgendaTurno(id, payload) {
  debugLog("[agenda] PUT", { url: AGENDA_CONTRACT.update(id), payload });
  return apiRequest(AGENDA_CONTRACT.update(id), { method: "PUT", body: payload });
}

export async function deleteAgendaTurno(id) {
  debugLog("[agenda] DELETE", { url: AGENDA_CONTRACT.remove(id) });
  return apiRequest(AGENDA_CONTRACT.remove(id), { method: "DELETE" });
}

export async function getAgendaDayNote(date) {
  debugLog("[agenda] GET", { url: AGENDA_CONTRACT.dayNote, params: { date } });
  const data = await apiRequest(AGENDA_CONTRACT.dayNote, { params: { date } });
  return {
    note: data?.note || "",
    updatedAt: data?.updated_at || null,
    updatedByEmail: data?.updated_by_email || null,
  };
}

export async function saveAgendaDayNote(date, note) {
  debugLog("[agenda] PUT", { url: AGENDA_CONTRACT.dayNote, payload: { date, note } });
  const data = await apiRequest(AGENDA_CONTRACT.dayNote, {
    method: "PUT",
    body: { date, note },
  });
  return {
    note: data?.note ?? note,
    updatedAt: data?.updated_at || null,
    updatedByEmail: data?.updated_by_email || null,
  };
}
