// src/services/agendaMock.js
const STORAGE_KEY = "bandidos_agenda_mock";

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let cache = load();

function ensureCache() {
  if (!Array.isArray(cache)) cache = [];
}

export function listByDate(date) {
  ensureCache();
  return cache.filter((item) => item.date === date);
}

export function createTurno(payload) {
  ensureCache();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const item = { id, ...payload };
  cache = [item, ...cache];
  save(cache);
  return item;
}

export function updateTurno(id, payload) {
  ensureCache();
  cache = cache.map((item) => (item.id === id ? { ...item, ...payload } : item));
  save(cache);
  return cache.find((item) => item.id === id);
}

export function deleteTurno(id) {
  ensureCache();
  cache = cache.filter((item) => item.id !== id);
  save(cache);
  return true;
}
