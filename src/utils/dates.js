// src/utils/dates.js
// Helpers de fecha para las vistas Semana/Mes de la agenda.
// Trabajan sobre strings ISO "YYYY-MM-DD" construyendo Date locales
// (new Date(y, m-1, d)) — nunca new Date(str), que interpreta UTC.

function parseISO(dateStr) {
  const [yyyy, mm, dd] = String(dateStr).split("-").map(Number);
  if (!yyyy || !mm || !dd) return null;
  return new Date(yyyy, mm - 1, dd);
}

function toISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysISO(dateStr, delta) {
  const d = parseISO(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

export function addWeeksISO(dateStr, delta) {
  return addDaysISO(dateStr, delta * 7);
}

export function addMonthsISO(dateStr, delta) {
  const [yyyy, mm, dd] = String(dateStr).split("-").map(Number);
  if (!yyyy || !mm || !dd) return dateStr;
  const lastOfTarget = new Date(yyyy, mm - 1 + delta + 1, 0).getDate();
  return toISO(new Date(yyyy, mm - 1 + delta, Math.min(dd, lastOfTarget)));
}

export function startOfWeekISO(dateStr) {
  const d = parseISO(dateStr);
  if (!d) return dateStr;
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return toISO(d);
}

export function monthBoundsISO(dateStr) {
  const [yyyy, mm] = String(dateStr).split("-").map(Number);
  if (!yyyy || !mm) return { first: dateStr, last: dateStr };
  const first = toISO(new Date(yyyy, mm - 1, 1));
  const last = toISO(new Date(yyyy, mm, 0));
  return { first, last };
}

// Grilla calendario del mes: array de semanas (5 o 6), cada una con 7 celdas
// { iso, day, inMonth }, desde el lunes <= día 1 hasta el domingo >= último día.
export function getMonthGrid(dateStr) {
  const [yyyy, mm] = String(dateStr).split("-").map(Number);
  if (!yyyy || !mm) return [];
  const first = new Date(yyyy, mm - 1, 1);
  const gridStart = parseISO(startOfWeekISO(toISO(first)));
  const weeks = [];
  const cursor = new Date(gridStart);
  do {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        iso: toISO(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === mm - 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === mm - 1);
  return weeks;
}

// "6 al 11 de julio" / "30 de junio al 5 de julio" si cruza mes.
export function formatWeekLabel(weekStartISO, weekEndISO = addDaysISO(weekStartISO, 5)) {
  const start = parseISO(weekStartISO);
  const end = parseISO(weekEndISO);
  if (!start || !end) return weekStartISO;
  const endLabel = end.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} al ${endLabel}`;
  }
  const startLabel = start.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `${startLabel} al ${endLabel}`;
}

// "Julio 2026"
export function formatMonthLabel(dateStr) {
  const d = parseISO(dateStr);
  if (!d) return dateStr;
  const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Clave "YYYY-MM-DD" de un turno; pg puede serializar date como ISO con hora.
export function turnoDateKey(value) {
  return String(value || "").split("T")[0];
}
