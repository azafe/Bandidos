import assert from "node:assert/strict";
import test from "node:test";
import { getTrasladoError, getTrasladoPayload } from "./traslados.js";

const historical = { traslado: true, traslado_direccion: null, traslado_amount: "0.00", traslado_bonificado: null };
const form = { ...historical, traslado_direccion: "", traslado_amount: "0" };

test("un traslado gratis requiere bonificación explícita; un importe válido permite cerrar", () => {
  for (const traslado_amount of ["", "0", 0, "-1", "Infinity", "texto"]) {
    assert.ok(getTrasladoError({ traslado: true, traslado_amount, traslado_bonificado: false }));
  }
  assert.equal(getTrasladoError({ traslado: true, traslado_amount: "7800", traslado_bonificado: false }), "");
  assert.equal(getTrasladoError({ traslado: true, traslado_amount: "0", traslado_bonificado: true }), "");
  assert.ok(getTrasladoError({ traslado: true, traslado_amount: "5000", traslado_bonificado: true }));
  assert.equal(getTrasladoError({ traslado: false }), "");
});

test("editar otros datos mantiene el histórico sin clasificar", () => {
  assert.deepEqual(getTrasladoPayload(form, historical), {});
  const paid = { ...historical, traslado_amount: "5000.00" };
  assert.deepEqual(getTrasladoPayload({ ...form, traslado_amount: "5000" }, paid), {});
});

test("bonificar es una decisión explícita y quitar traslado limpia sus datos", () => {
  assert.deepEqual(getTrasladoPayload({ ...form, traslado_bonificado: true }, historical), { traslado_bonificado: true });
  assert.deepEqual(getTrasladoPayload({ ...form, traslado: false }, { ...historical, traslado_amount: "5000", traslado_direccion: "San Martín 100", traslado_bonificado: true }), {
    traslado: false, traslado_direccion: null, traslado_amount: 0, traslado_bonificado: false,
  });
});

test("altas guardan importe y decisión sin reutilizar datos del servicio", () => {
  assert.deepEqual(getTrasladoPayload({ traslado: true, traslado_direccion: " San Martín 100 ", traslado_amount: "8000", traslado_bonificado: false }), {
    traslado: true, traslado_direccion: "San Martín 100", traslado_amount: 8000, traslado_bonificado: false,
  });
  assert.equal(getTrasladoPayload({ ...form, traslado_bonificado: true, traslado_amount: "9000" }).traslado_amount, 0);
});

test("ida y vuelta comparte un precio: no se duplica ni se reparte en los tramos", async () => {
  const { newTramos, solicitudPayload } = await import("./traslados.js");
  const payload = solicitudPayload({ traslado_amount: "8000.50", traslado_bonificado: false }, newTramos(), "2026-10-16");
  assert.equal(payload.precio_total, 8000.50);
  assert.deepEqual(payload.tramos.map((t) => t.tipo), ["busqueda", "entrega"]);
  assert.ok(payload.tramos.every((t) => !Object.hasOwn(t, "monto")));
  assert.ok(payload.tramos.every((t) => t.hora_programada === null));
  assert.equal(solicitudPayload({ traslado_amount: "", traslado_bonificado: false }, [], "2026-10-16").precio_total, null);
  assert.equal(solicitudPayload({ traslado_amount: "0", traslado_bonificado: false }, [], "2026-10-16").precio_total, 0);
  assert.equal(solicitudPayload({ traslado_amount: "8000", traslado_bonificado: true }, [], "2026-10-16").precio_total, 0);
});

test("chofer socio no se ofrece como groomer; conserva asignaciones históricas y función doble", async () => {
  const { groomerOptions } = await import("./traslados.js");
  const employees = [{ id: "a", name: "Jorge", role: "Socio", is_driver: true, status: "active" }, { id: "b", role: "Groomer", is_driver: true, status: "active" }, { id: "c", role: "Groomer", is_driver: false, status: "inactive" }];
  assert.deepEqual(groomerOptions(employees).map((e) => e.id), ["b"]);
  assert.deepEqual(groomerOptions(employees, "a").map((e) => e.id), ["a", "b"]);
  assert.deepEqual(groomerOptions(employees, "c").map((e) => e.id), ["b", "c"]);
});

test("dashboard muestra cobros reales, sin tratar la cotización como dinero recibido", async () => {
  const { buildDashboardMetrics } = await import("./dashboardMetrics.js");
  const current = { services: [{ id: "a", date: "2026-10-16", status: "finished", price: 27000, traslado: true, traslado_amount: 13000 }], dailyExpenses: [], fixedExpenses: [], employees: [], petshopSales: [], trasladosCobrado: { amount: 8000 } };
  const args = { range: { from: "2026-10-01", to: "2026-10-31" }, current, previous: null, categories: [] };
  const result = buildDashboardMetrics(args);
  assert.equal(result.kpis.trasladosIncome, 8000);
  assert.equal(result.kpis.income, 27000);
  current.trasladosCobrado.amount = 0;
  assert.equal(buildDashboardMetrics(args).kpis.trasladosIncome, 0);
});
