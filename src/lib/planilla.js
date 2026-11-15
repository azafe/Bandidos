// Lógica de la Planilla del día (Agenda). Sin React: se prueba con node --test.

// Horas que se escriben en el cuaderno antes de empezar el día. Cada una es un
// lugar: si hay dos «09:00», entran dos perros a esa hora.
export const MOLDE = ["09:00", "09:00", "09:00", "10:00", "10:00", "11:00", "11:00", "12:00", "12:30",
  "15:00", "15:00", "16:00", "16:00", "17:00", "17:00", "18:00", "18:00", "19:00"];

// Colores de resaltador, en el orden en que se asignan a las peluqueras.
export const COLORES = ["#ff9fc4", "#8be08f", "#f6e75a", "#ffb56b", "#7fd0f0", "#c7a6ff", "#ffcf9e", "#9fe3d6"];

export const ESTADOS = [
  { value: "reserved", label: "Agendado" },
  { value: "finished", label: "Terminado ✓" },
  { value: "no_show", label: "No vino", danger: true },
  { value: "cancelled", label: "Canceló", danger: true },
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const hora = (t) => String(t || "").slice(0, 5);
export const ocupaLugar = (turno) => turno.status !== "cancelled" && turno.status !== "no_show";

function fechaUTC(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function sumarDias(iso, n) {
  const d = fechaUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const diaSemana = (iso) => DIAS[fechaUTC(iso).getUTCDay()];
export function fechaCorta(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  return `${d}/${m}`;
}
export function fechaLarga(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  const dia = diaSemana(iso);
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d} de ${MESES[m - 1]}`;
}
export function distanciaDias(iso, hoyISO) {
  const dif = Math.round((fechaUTC(iso) - fechaUTC(hoyISO)) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === 1) return "Mañana";
  if (dif === -1) return "Ayer";
  return dif > 0 ? `En ${dif} días` : `Hace ${-dif} días`;
}

// Renglones del día: los turnos en orden de hora y, entre ellos, los lugares
// del molde (más los agregados a mano) que todavía no ocupa ningún turno.
// Un turno cancelado o que no vino se muestra pero libera su lugar.
export function armarRenglones(turnos, { molde = MOLDE, extras = [] } = {}) {
  const ocupados = {};
  for (const t of turnos) if (ocupaLugar(t)) ocupados[hora(t.time)] = (ocupados[hora(t.time)] || 0) + 1;
  const lugares = {};
  for (const t of [...molde, ...extras]) lugares[t] = (lugares[t] || 0) + 1;
  const libres = [];
  for (const [t, n] of Object.entries(lugares)) {
    for (let i = (ocupados[t] || 0); i < n; i += 1) libres.push({ tipo: "libre", time: t, key: `libre-${t}-${i}` });
  }
  const filas = [
    ...turnos.map((t, i) => ({ tipo: "turno", time: hora(t.time), key: `turno-${t.id}`, turno: t, orden: i })),
    ...libres.map((l, i) => ({ ...l, orden: turnos.length + i })),
  ];
  return filas.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.orden - b.orden));
}

// «09:00 (3) · 10:00 · 12:30»
export function libresAgrupados(renglones) {
  const orden = [];
  const cuenta = {};
  for (const r of renglones) {
    if (r.tipo !== "libre") continue;
    if (!cuenta[r.time]) { cuenta[r.time] = 0; orden.push(r.time); }
    cuenta[r.time] += 1;
  }
  return orden.map((t) => (cuenta[t] > 1 ? `${t} (${cuenta[t]})` : t)).join(" · ");
}

export function textoLibres(iso, renglones) {
  const libres = libresAgrupados(renglones);
  return `*Horarios libres · ${diaSemana(iso)} ${fechaCorta(iso)}*\n${libres || "Sin lugar"}`;
}

export const peluquerasDeTurno = (turno) =>
  [turno.groomer_id ?? turno.groomer?.id, turno.second_groomer_id, turno.third_groomer_id]
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map(String);

// Color de cada peluquera: el elegido en este dispositivo o, si no, el de su
// posición en la lista ordenada por nombre.
export function coloresPeluqueras(peluqueras, elegidos = {}) {
  const ordenadas = [...peluqueras].sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  const mapa = {};
  ordenadas.forEach((p, i) => { mapa[String(p.id)] = elegidos[String(p.id)] || COLORES[i % COLORES.length]; });
  return mapa;
}

// Fondo de un renglón: una parte igual por peluquera, a lo largo (eje x).
export function fondoRenglon(colores, tinte = 0.42) {
  if (!colores.length) return null;
  const mezcla = (c) => `color-mix(in srgb, ${c} ${Math.round(tinte * 100)}%, var(--pl-surface))`;
  if (colores.length === 1) return mezcla(colores[0]);
  const partes = colores.map((c, i) => `${mezcla(c)} ${(i * 100) / colores.length}% ${((i + 1) * 100) / colores.length}%`);
  return `linear-gradient(90deg, ${partes.join(", ")})`;
}

const aNumero = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (/^\s*-?\d+(\.\d+)?\s*$/.test(String(v ?? ""))) return Number(v); // como viene de la API: "27000.00"
  const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
export const montoDe = aNumero;

// Cobro de un turno terminado: los pagos tienen que cubrir el precio menos la seña.
// El traslado se registra aparte, como en la agenda.
export function resumenCobro({ precio, sena, pagos }) {
  const p = aNumero(precio);
  const s = aNumero(sena);
  const saldo = Math.max(0, p - s);
  const pagado = (pagos || []).reduce((a, x) => a + aNumero(x.amount), 0);
  return { precio: p, sena: s, saldo, pagado, diferencia: Math.round((saldo - pagado) * 100) / 100 };
}

export function horaCorta(t) {
  const [h, m] = String(t).split(":");
  return `${Number(h)}${m && m !== "00" ? `:${m}` : ""}`;
}
export const rangoHorario = (r) => `${horaCorta(r[0])} a ${horaCorta(r[1])}`;

export const HORAS = (() => {
  const out = [];
  for (let h = 7; h <= 22; h += 1) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export const formatoPlata = (v) => `$${Math.round(aNumero(v)).toLocaleString("es-AR")}`;

// Coincidencias para el buscador: primero por nombre de la mascota, después por dueño.
export function buscarBandidos(mascotas, texto, limite = 12) {
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(texto).trim();
  if (!q) return [];
  const porNombre = [];
  const porDueno = [];
  for (const m of mascotas) {
    if (m.archived_at) continue;
    if (norm(m.name).startsWith(q)) porNombre.push(m);
    else if (norm(m.owner_name).split(/\s+/).some((w) => w.startsWith(q))) porDueno.push(m);
  }
  const orden = (a, b) => String(a.name).localeCompare(String(b.name), "es") || String(a.owner_name || "").localeCompare(String(b.owner_name || ""), "es");
  return [...porNombre.sort(orden), ...porDueno.sort(orden)].slice(0, limite);
}
