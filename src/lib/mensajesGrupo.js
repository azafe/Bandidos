// Textos listos para pegar en el grupo de WhatsApp del equipo.
// Usan el formato de WhatsApp (*negrita*, _cursiva_) y no inventan datos:
// lo que falta se dice que falta.

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function partesFecha(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { dia: DIAS[weekday], fecha: `${d}/${m}` };
}

function sumarDia(iso, dias) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// «jueves 13/11», con «hoy» o «mañana» adelante cuando corresponde.
export function etiquetaDiaGrupo(iso, hoyISO) {
  const { dia, fecha } = partesFecha(iso);
  const prefijo = iso === hoyISO ? "Hoy " : hoyISO && iso === sumarDia(hoyISO, 1) ? "Mañana " : "";
  return `${prefijo}${dia} ${fecha}`;
}

const limpio = (v) => String(v ?? "").trim();
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function lineaTramo(t) {
  const busqueda = t.tipo === "busqueda";
  const hora = t.hora_programada ? t.hora_programada.slice(0, 5) : "Sin horario";
  const dueno = [limpio(t.owner_name) || "Sin registrar", limpio(t.owner_phone)].filter(Boolean).join(" · ");
  const lineas = [
    `*${hora}* · ${busqueda ? "Buscar 🏠➡️✂️" : "Llevar a casa ✂️➡️🏠"}${t.estado === "entregado" ? " ✅" : ""}`,
    `Dirección: ${limpio(t.direccion) || "⚠️ falta cargar"}`,
    `Dueño: ${dueno}`,
    `Bandido: ${limpio(t.pet_name) || "Sin nombre"}`,
  ];
  if (limpio(t.notas)) lineas.push(`Nota: ${limpio(t.notas)}`);
  return lineas.join("\n");
}

// Lista de traslados del día, agrupada por chofer y móvil en el orden de la
// ruta. Los cancelados no se incluyen.
export function textoTrasladosDia(fechaISO, tramos) {
  const titulo = `*TRASLADOS ${capitalizar(etiquetaDiaGrupo(fechaISO)).toUpperCase()}*`;
  const operativos = (tramos || []).filter((t) => t.estado !== "cancelado");
  if (!operativos.length) return `${titulo}\n\nNo hay traslados agendados.`;
  const grupos = new Map();
  for (const t of operativos) {
    const key = `${t.chofer_id || "-"}/${t.vehiculo_id || "-"}`;
    if (!grupos.has(key)) grupos.set(key, { chofer: limpio(t.chofer_nombre) || "Sin chofer asignado", movil: limpio(t.vehiculo_nombre), items: [] });
    grupos.get(key).items.push(t);
  }
  const bloques = [...grupos.values()].map((g) => {
    const encabezado = `🚗 *${g.chofer}*${g.movil ? ` · ${g.movil}` : ""}`;
    return [encabezado, ...g.items.map(lineaTramo)].join("\n\n");
  });
  return [titulo, ...bloques].join("\n\n");
}

// Horarios libres de uno o más días, como los devuelve la disponibilidad de
// la web de reservas: [{ date, status, slots: ["09:00", ...] }].
export function textoHorariosLibres(dias, { hoyISO, servicio, link } = {}) {
  const lineas = [`*Horarios libres*${limpio(servicio) ? ` · ${limpio(servicio)}` : ""}`, ""];
  for (const d of dias || []) {
    const etiqueta = capitalizar(etiquetaDiaGrupo(d.date, hoyISO));
    const slots = d.slots || [];
    const detalle = slots.length ? slots.join(" · ") : d.status === "closed" ? "Cerrado" : "Sin lugar";
    lineas.push(`*${etiqueta}:* ${detalle}`);
  }
  if (!(dias || []).length) lineas.push("No hay días disponibles para mostrar.");
  if (limpio(link)) lineas.push("", `Reservá acá 👉 ${limpio(link)}`);
  return lineas.join("\n");
}
