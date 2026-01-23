// src/services/agendaApi.js
import { apiRequest } from "./apiClient";
import * as agendaMock from "./agendaMock";

export const AGENDA_CONTRACT = {
  listDay: "/agenda",
  create: "/agenda",
  update: (id) => `/agenda/${id}`,
  remove: (id) => `/agenda/${id}`,
};

const isDev = import.meta.env.DEV;

function debugLog(message, payload) {
  if (!isDev) return;
  console.debug(message, payload);
}

function isNotFound(error) {
  return error?.status === 404;
}

export async function listAgendaDay(date) {
  try {
    const params = { date };
    debugLog("[agenda] GET", { url: AGENDA_CONTRACT.listDay, params });
    const data = await apiRequest(AGENDA_CONTRACT.listDay, { params });
    return { items: Array.isArray(data) ? data : data?.items || [], fallback: false };
  } catch (err) {
    if (isNotFound(err)) {
      const items = agendaMock.listByDate(date);
      return { items, fallback: true, error: err };
    }
    throw err;
  }
}

export async function createAgendaTurno(payload) {
  try {
    debugLog("[agenda] POST", { url: AGENDA_CONTRACT.create, payload });
    return await apiRequest(AGENDA_CONTRACT.create, { method: "POST", body: payload });
  } catch (err) {
    if (isNotFound(err)) {
      return { item: agendaMock.createTurno(payload), fallback: true, error: err };
    }
    throw err;
  }
}

export async function updateAgendaTurno(id, payload) {
  try {
    debugLog("[agenda] PUT", { url: AGENDA_CONTRACT.update(id), payload });
    return await apiRequest(AGENDA_CONTRACT.update(id), { method: "PUT", body: payload });
  } catch (err) {
    if (isNotFound(err)) {
      return { item: agendaMock.updateTurno(id, payload), fallback: true, error: err };
    }
    throw err;
  }
}

export async function deleteAgendaTurno(id) {
  try {
    debugLog("[agenda] DELETE", { url: AGENDA_CONTRACT.remove(id) });
    return await apiRequest(AGENDA_CONTRACT.remove(id), { method: "DELETE" });
  } catch (err) {
    if (isNotFound(err)) {
      return { ok: agendaMock.deleteTurno(id), fallback: true, error: err };
    }
    throw err;
  }
}
