// Reglas del stock del PetShop, adaptadas del módulo de stock de la ONG.
// Funciones puras: las usan la lista, el conteo, el historial y la revisión,
// así todas las pantallas cuentan lo mismo.

export const RECOUNT_DAYS = 30;

// Cinco estados, no dos: "sin contar" no es lo mismo que "sin stock". El
// primero dice que no sabemos si el número es real, el segundo que no queda.
export const STOCK_STATUS = {
  negativo: { label: "En negativo", tone: "bad" },
  vacio: { label: "Sin stock", tone: "bad" },
  bajo: { label: "Bajo mínimo", tone: "warn" },
  sin_contar: { label: "Sin contar", tone: "muted" },
  ok: { label: "OK", tone: "ok" },
};

// Lo que pide acción primero.
const PRIORITY = { negativo: 0, vacio: 1, bajo: 2, sin_contar: 3, ok: 4 };

export function stockStatus(product) {
  const stock = Number(product.stock) || 0;
  if (stock < 0) return "negativo";
  if (stock === 0) return "vacio";
  if (Number(product.stock_min) > 0 && stock <= Number(product.stock_min)) return "bajo";
  if (!product.last_counted_at) return "sin_contar";
  return "ok";
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysSince(iso, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
}

// Con stock, pero contado hace mucho (o nunca): el número ya no es confiable.
export function needsRecount(product, now = new Date()) {
  if ((Number(product.stock) || 0) <= 0) return false;
  return !product.last_counted_at || daysSince(product.last_counted_at, now) > RECOUNT_DAYS;
}

// "hoy", "ayer", "hace 3 días", "hace 2 meses".
export function agoText(iso, now = new Date()) {
  const days = daysSince(iso, now);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 60) return `hace ${days} días`;
  return `hace ${Math.round(days / 30)} meses`;
}

export function countedText(product, now = new Date()) {
  return product.last_counted_at ? `contado ${agoText(product.last_counted_at, now)}` : "nunca contado";
}

// "−5" con el menos tipográfico.
export function formatStock(value) {
  const n = Number(value) || 0;
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

// "+10", "−2", "±0".
export function formatDelta(delta) {
  const n = Number(delta) || 0;
  if (n === 0) return "±0";
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

export const KIND_LABEL = {
  inicial: "Stock inicial",
  ingreso: "Ingreso",
  venta: "Venta",
  devolucion: "Devolución",
  ajuste: "Ajuste",
  merma: "Baja",
  conteo: "Conteo",
};

// Cuando lo contado no coincide con el sistema hay que decir por qué. La lista
// corta cubre lo que pasa en el local; "Otro" pide escribirlo.
export const DIFFERENCE_REASONS = [
  "Venta sin registrar",
  "Entró sin registrar",
  "Se rompió o se perdió",
  "Consumo del local",
  "El conteo anterior estaba mal",
  "Otro",
];

export const LOSS_REASONS = ["Vencido", "Roto", "Consumo del local", "Robo o pérdida", "Otro"];

// La nota que se guarda. null = falta completar.
export function reasonNote(reason, detail, prefix = "Diferencia") {
  if (!reason) return null;
  const text = String(detail ?? "").trim();
  if (reason === "Otro") return text ? `${prefix}: ${text}` : null;
  return `${prefix}: ${reason}${text ? ` · ${text}` : ""}`;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function sortProducts(products) {
  return [...products].sort(
    (a, b) =>
      PRIORITY[stockStatus(a)] - PRIORITY[stockStatus(b)] ||
      String(a.name).localeCompare(String(b.name), "es")
  );
}

export function filterProducts(products, { status = "todos", search = "", category = "" } = {}, now = new Date()) {
  const q = normalizeText(search);
  return products.filter((p) => {
    if (category && (p.category || "") !== category) return false;
    if (q && !normalizeText(`${p.name} ${p.sku ?? ""} ${p.category ?? ""}`).includes(q)) return false;
    if (status === "todos") return true;
    if (status === "recontar") return needsRecount(p, now);
    return stockStatus(p) === status;
  });
}

export function statusCounts(products, now = new Date()) {
  const counts = { negativo: 0, vacio: 0, bajo: 0, sin_contar: 0, ok: 0, recontar: 0 };
  for (const p of products) {
    counts[stockStatus(p)] += 1;
    if (needsRecount(p, now)) counts.recontar += 1;
  }
  return counts;
}

// Valor del stock al costo (lo que hay en el estante, en plata). Los
// negativos no restan: no hay mercadería que valga menos que cero.
export function stockValue(products) {
  return products.reduce((sum, p) => sum + Math.max(0, Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
}

// ─── Sesión de conteo ────────────────────────────────────────────────────

// Qué contar: todo, lo que hace mucho no se cuenta, lo que nunca se contó o
// una categoría. Ordenado por categoría y nombre, como están en el estante.
export const COUNT_SCOPES = [
  { id: "recontar", label: "Lo que hace falta contar", hint: `Nunca contado o contado hace más de ${RECOUNT_DAYS} días` },
  { id: "todos", label: "Todo el PetShop", hint: "Recorré el estante completo" },
  { id: "categoria", label: "Una categoría", hint: "Elegí cuál" },
];

export function countQueue(products, scope, category = "", now = new Date()) {
  return products
    .filter((p) => {
      if (scope === "recontar") return !p.last_counted_at || daysSince(p.last_counted_at, now) > RECOUNT_DAYS || Number(p.stock) < 0;
      if (scope === "categoria") return (p.category || "") === category;
      return true;
    })
    .sort(
      (a, b) =>
        // Sin categoría, al final.
        Number(!a.category) - Number(!b.category) ||
        String(a.category || "").localeCompare(String(b.category || ""), "es") ||
        String(a.name).localeCompare(String(b.name), "es")
    )
    .map((p) => p.id);
}

export function newSession(queue, scope, category = "", now = new Date()) {
  return { version: 1, startedAt: now.toISOString(), scope, category, queue, position: 0, results: [], skipped: [] };
}

// Guarda el resultado de un producto y avanza. Si se corrige uno ya contado,
// la diferencia se sigue midiendo contra lo que había antes del conteo.
export function recordResult(session, { productId, name, before, counted, note }, now = new Date()) {
  const previous = session.results.find((r) => r.productId === productId);
  const result = {
    productId,
    name,
    before: previous ? previous.before : before,
    counted,
    note: note ?? null,
    at: now.toISOString(),
  };
  return {
    ...session,
    position: session.position + 1,
    results: [...session.results.filter((r) => r.productId !== productId), result],
    skipped: session.skipped.filter((id) => id !== productId),
  };
}

export function skipCurrent(session) {
  const id = session.queue[session.position];
  return {
    ...session,
    position: session.position + 1,
    skipped: session.skipped.includes(id) ? session.skipped : [...session.skipped, id],
  };
}

export function goBack(session) {
  return session.position > 0 ? { ...session, position: session.position - 1 } : session;
}

export function sessionSummary(session) {
  const differences = session.results.filter((r) => r.counted !== r.before);
  return {
    counted: session.results.length,
    skipped: session.skipped.length,
    pending: Math.max(0, session.queue.length - session.position),
    differences,
    netDifference: differences.reduce((sum, r) => sum + (r.counted - r.before), 0),
  };
}

// ─── Historial ───────────────────────────────────────────────────────────

// Clave local "2026-09-21" para agrupar por día sin que el UTC corra la fecha.
export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(key, now = new Date()) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = Math.round((startOfDay(now) - date.getTime()) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  const text = date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(y !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/\./g, "").replace(",", "");
}

export function groupByDay(movements) {
  const groups = new Map();
  for (const m of movements) {
    const key = dayKey(m.created_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}
