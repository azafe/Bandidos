// src/services/agendaApi.js
import { apiRequest } from "./apiClient";
import * as agendaMock from "./agendaMock";

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

export async function listAgendaRange({ from, to }) {
  try {
    const params = { from, to };
    debugLog("[agenda] GET", { url: AGENDA_CONTRACT.listRange, params });
    const data = await apiRequest(AGENDA_CONTRACT.listRange, { params });
    return { items: Array.isArray(data) ? data : data?.items || [], fallback: false };
  } catch (err) {
    if (isNotFound(err)) {
      const items = agendaMock.listByRange(from, to);
      return { items, fallback: true, error: err };
    }
    throw err;
  }
}

function turnoDateKey(value) {
  return String(value || "").split("T")[0];
}

function countsFromItems(items) {
  const byDate = new Map();
  items.forEach((turno) => {
    const date = turnoDateKey(turno.date);
    if (!date) return;
    const entry = byDate.get(date) || { date, total: 0, finished: 0, reserved: 0, cancelled: 0 };
    entry.total += 1;
    if (entry[turno.status] !== undefined) entry[turno.status] += 1;
    byDate.set(date, entry);
  });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function listAgendaCounts({ from, to }) {
  try {
    const params = { from, to };
    debugLog("[agenda] GET", { url: AGENDA_CONTRACT.counts, params });
    const data = await apiRequest(AGENDA_CONTRACT.counts, { params });
    return { rows: Array.isArray(data) ? data : [], fallback: false };
  } catch (err) {
    if (isNotFound(err)) {
      const rows = countsFromItems(agendaMock.listByRange(from, to));
      return { rows, fallback: true, error: err };
    }
    throw err;
  }
}

export async function listAgendaSummary({ from, to }) {
  try {
    const params = { from, to };
    debugLog("[agenda] GET", { url: AGENDA_CONTRACT.summary, params });
    const data = await apiRequest(AGENDA_CONTRACT.summary, { params });
    return {
      totalEstimated: Number(data?.total_estimated ?? data?.totalEstimated ?? 0),
      totalDeposit: Number(data?.total_deposit ?? data?.totalDeposit ?? 0),
      fallback: false,
    };
  } catch (err) {
    if (isNotFound(err)) {
      const items = agendaMock.listByRange(from, to);
      const totalEstimated = items.reduce(
        (sum, turno) =>
          sum +
          Number(
            turno.service_type?.default_price ||
              turno.service_price ||
              turno.amount ||
              turno.price ||
              0
          ),
        0
      );
      const totalDeposit = items.reduce(
        (sum, turno) => sum + (Number(turno.deposit_amount || 0) || 0),
        0
      );
      return { totalEstimated, totalDeposit, fallback: true, error: err };
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

export async function getAgendaDayNote(date) {
  try {
    debugLog("[agenda] GET", { url: AGENDA_CONTRACT.dayNote, params: { date } });
    const data = await apiRequest(AGENDA_CONTRACT.dayNote, { params: { date } });
    return {
      note: data?.note || "",
      updatedAt: data?.updated_at || null,
      updatedByEmail: data?.updated_by_email || null,
      fallback: false,
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        note: agendaMock.getDayNote(date),
        updatedAt: null,
        updatedByEmail: null,
        fallback: true,
        error: err,
      };
    }
    throw err;
  }
}

export async function saveAgendaDayNote(date, note) {
  try {
    debugLog("[agenda] PUT", { url: AGENDA_CONTRACT.dayNote, payload: { date, note } });
    const data = await apiRequest(AGENDA_CONTRACT.dayNote, {
      method: "PUT",
      body: { date, note },
    });
    return {
      note: data?.note ?? note,
      updatedAt: data?.updated_at || null,
      updatedByEmail: data?.updated_by_email || null,
      fallback: false,
    };
  } catch (err) {
    if (isNotFound(err)) {
      agendaMock.setDayNote(date, note);
      return { note, updatedAt: null, updatedByEmail: null, fallback: true, error: err };
    }
    throw err;
  }
}
