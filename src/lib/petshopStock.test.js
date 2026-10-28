import assert from "node:assert/strict";
import test from "node:test";
import {
  countQueue,
  filterProducts,
  formatDelta,
  formatStock,
  goBack,
  groupByDay,
  needsRecount,
  newSession,
  reasonNote,
  recordResult,
  sessionSummary,
  skipCurrent,
  sortProducts,
  statusCounts,
  stockStatus,
  stockValue,
} from "./petshopStock.js";

const now = new Date(2026, 9, 28, 12);
const daysAgo = (n) => new Date(2026, 9, 28 - n, 10).toISOString();

const products = [
  { id: "a", name: "Shampoo", category: "Higiene", stock: 10, stock_min: 3, cost: 2000, last_counted_at: daysAgo(2) },
  { id: "b", name: "Collar", category: "Accesorios", stock: -2, stock_min: 0, cost: 1000, last_counted_at: daysAgo(5) },
  { id: "c", name: "Alimento", category: "Alimentos", stock: 0, stock_min: 2, cost: 9000, last_counted_at: null },
  { id: "d", name: "Cepillo", category: "Higiene", stock: 2, stock_min: 2, cost: 1500, last_counted_at: daysAgo(40) },
  { id: "e", name: "Juguete", category: null, stock: 5, stock_min: 0, cost: 800, last_counted_at: null },
];

test("sin contar no es lo mismo que sin stock", () => {
  assert.deepEqual(products.map(stockStatus), ["ok", "negativo", "vacio", "bajo", "sin_contar"]);
  assert.equal(needsRecount(products[0], now), false);
  assert.equal(needsRecount(products[3], now), true);
  assert.equal(needsRecount(products[4], now), true);
  assert.equal(needsRecount(products[2], now), false); // sin stock no se recuenta
});

test("la lista pone primero lo que pide acción y filtra por estado y texto", () => {
  assert.deepEqual(sortProducts(products).map((p) => p.id), ["b", "c", "d", "e", "a"]);
  assert.deepEqual(filterProducts(products, { status: "recontar" }, now).map((p) => p.id), ["d", "e"]);
  assert.deepEqual(filterProducts(products, { search: "HIGIENE" }).map((p) => p.id), ["a", "d"]);
  assert.deepEqual(filterProducts(products, { search: "alimento", status: "vacio" }).map((p) => p.id), ["c"]);
  assert.deepEqual(statusCounts(products, now), { negativo: 1, vacio: 1, bajo: 1, sin_contar: 1, ok: 1, recontar: 2 });
  // Los negativos no restan valor.
  assert.equal(stockValue(products), 10 * 2000 + 2 * 1500 + 5 * 800);
});

test("formatos con el menos tipográfico", () => {
  assert.equal(formatStock(-5), "−5");
  assert.equal(formatDelta(3), "+3");
  assert.equal(formatDelta(-2), "−2");
  assert.equal(formatDelta(0), "±0");
});

test("el motivo es obligatorio y Otro pide texto", () => {
  assert.equal(reasonNote(null, "x"), null);
  assert.equal(reasonNote("Otro", "  "), null);
  assert.equal(reasonNote("Otro", "Se lo llevó un cliente"), "Diferencia: Se lo llevó un cliente");
  assert.equal(reasonNote("Venta sin registrar", ""), "Diferencia: Venta sin registrar");
  assert.equal(reasonNote("Vencido", "lote 3", "Baja"), "Baja: Vencido · lote 3");
});

test("la cola de conteo sigue el orden del estante", () => {
  assert.deepEqual(countQueue(products, "todos", "", now), ["b", "c", "d", "a", "e"]);
  assert.deepEqual(countQueue(products, "recontar", "", now), ["b", "c", "d", "e"]);
  assert.deepEqual(countQueue(products, "categoria", "Higiene", now), ["d", "a"]);
});

test("la sesión avanza, saltea, vuelve y mide la diferencia contra lo de antes", () => {
  let s = newSession(["a", "d", "e"], "todos", "", now);
  s = recordResult(s, { productId: "a", name: "Shampoo", before: 10, counted: 9, note: "Diferencia: Roto" }, now);
  s = skipCurrent(s);
  assert.equal(s.position, 2);
  assert.deepEqual(s.skipped, ["d"]);
  s = goBack(goBack(s));
  // Corregir "a": la diferencia sigue contra 10, no contra el 9 guardado.
  s = recordResult(s, { productId: "a", name: "Shampoo", before: 9, counted: 8, note: "Diferencia: Roto" }, now);
  assert.equal(s.results.length, 1);
  assert.equal(s.results[0].before, 10);
  s = recordResult(s, { productId: "d", name: "Cepillo", before: 2, counted: 2 }, now);
  assert.deepEqual(s.skipped, []);
  const summary = sessionSummary(s);
  assert.equal(summary.counted, 2);
  assert.equal(summary.pending, 1);
  assert.equal(summary.netDifference, -2);
  assert.equal(summary.differences.length, 1);
});

test("el historial se agrupa por día local", () => {
  const groups = groupByDay([
    { id: 1, created_at: new Date(2026, 9, 28, 9).toISOString() },
    { id: 2, created_at: new Date(2026, 9, 28, 8).toISOString() },
    { id: 3, created_at: new Date(2026, 9, 27, 23, 30).toISOString() },
  ]);
  assert.deepEqual(groups.map((g) => [g.key, g.items.length]), [["2026-10-28", 2], ["2026-10-27", 1]]);
});
