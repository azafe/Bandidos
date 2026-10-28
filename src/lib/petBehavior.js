// Comportamiento de la mascota: etiquetas rápidas + una nota libre.
// Se guardan en el mismo campo de texto `behavior` que ya existía, con las
// etiquetas primero y separadas por " · " ("Muerde · Usar bozal · Se calma con
// premios"). Así no hace falta cambiar la base y cualquier pantalla que muestre
// el texto tal cual lo sigue leyendo bien. Un texto viejo que no empieza con
// etiquetas conocidas queda entero como nota.

export const BEHAVIOR_SEPARATOR = " · ";

// tone: "danger" (riesgo para quien atiende), "warn" (atender con cuidado),
// "ok" (dato tranquilizador).
export const BEHAVIOR_TAGS = [
  { label: "Muerde", tone: "danger" },
  { label: "Usar bozal", tone: "danger" },
  { label: "Agresivo con perros", tone: "danger" },
  { label: "Agresivo con personas", tone: "danger" },
  { label: "Nervioso con el secador", tone: "warn" },
  { label: "Miedoso", tone: "warn" },
  { label: "No se deja tocar las patas", tone: "warn" },
  { label: "Sensible en las orejas", tone: "warn" },
  { label: "Se mueve mucho", tone: "warn" },
  { label: "Ladra mucho", tone: "warn" },
  { label: "Intenta escaparse", tone: "warn" },
  { label: "Tranquilo", tone: "ok" },
  { label: "Sociable", tone: "ok" },
];

export const BEHAVIOR_GROUPS = [
  { tone: "danger", label: "Precaución" },
  { tone: "warn", label: "Con cuidado" },
  { tone: "ok", label: "Tranquilidad" },
];

const TONE_RANK = { danger: 3, warn: 2, ok: 1 };

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.\s]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

const TAGS_BY_KEY = new Map(BEHAVIOR_TAGS.map((tag) => [normalize(tag.label), tag]));

export function findBehaviorTag(label) {
  return TAGS_BY_KEY.get(normalize(label)) || null;
}

// "Muerde · Usar bozal · Se calma con premios"
//   → { tags: ["Muerde", "Usar bozal"], note: "Se calma con premios" }
export function parseBehavior(value) {
  const text = String(value ?? "").trim();
  if (!text) return { tags: [], note: "" };
  const parts = text.split(BEHAVIOR_SEPARATOR.trim()).map((part) => part.trim());
  const tags = [];
  let i = 0;
  for (; i < parts.length; i += 1) {
    const tag = findBehaviorTag(parts[i]);
    if (!tag) break;
    if (!tags.includes(tag.label)) tags.push(tag.label);
  }
  // La nota conserva el texto original desde el primer segmento que no es
  // etiqueta, para no alterar separadores que la persona haya escrito.
  if (i === 0) return { tags, note: text };
  const rest = parts.slice(i).filter(Boolean).join(BEHAVIOR_SEPARATOR);
  return { tags, note: rest };
}

// Siempre en el orden de BEHAVIOR_TAGS, sin repetidos ni etiquetas desconocidas.
export function serializeBehavior(tags, note) {
  const chosen = new Set((tags || []).map((label) => findBehaviorTag(label)?.label).filter(Boolean));
  const ordered = BEHAVIOR_TAGS.filter((tag) => chosen.has(tag.label)).map((tag) => tag.label);
  const cleanNote = String(note ?? "").trim();
  return [...ordered, cleanNote].filter(Boolean).join(BEHAVIOR_SEPARATOR);
}

export function behaviorTagTone(label) {
  return findBehaviorTag(label)?.tone || "warn";
}

// El tono del aviso es el de la etiqueta más delicada. Una nota sin
// etiquetas se trata como "warn", igual que se mostraba antes.
export function behaviorLevel({ tags, note }) {
  let level = null;
  for (const label of tags || []) {
    const tone = behaviorTagTone(label);
    if (!level || TONE_RANK[tone] > TONE_RANK[level]) level = tone;
  }
  if (!level && String(note ?? "").trim()) return "warn";
  if (level === "ok" && String(note ?? "").trim()) return "warn";
  return level;
}
