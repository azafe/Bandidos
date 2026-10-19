import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardMetrics } from "./dashboardMetrics.js";

const range = { from: "2026-10-01", to: "2026-10-19" };
function metrics(report) {
  return buildDashboardMetrics({ range, categories: [], current: {
    services: [
      { id: "anterior", date: "2026-10-10", status: "finished", final_price: 20000, traslado: true, traslado_amount: 8000 },
      { id: "actual", date: "2026-10-18", status: "finished", final_price: 20000, traslado: true, traslado_amount: 10000 },
      { id: "cancelado", date: "2026-10-11", status: "cancelled", traslado: true, traslado_amount: 5000 },
    ], dailyExpenses: [], fixedExpenses: [], employees: [], trasladosResultado: report,
  } }).kpis;
}

test("Inicio conserva los históricos separados del cobro explícito y del resultado incompleto", () => {
  const report = { total: { resultado: null, ingresos: 0, realizados: 0, pendientes: ["historicos_sin_costos"] },
    historicos: { cantidad: 1, importe_registrado: 8000 } };
  const kpis = metrics(report);
  assert.deepEqual(kpis.trasladosHistoricos, { cantidad: 1, importe_registrado: 8000 });
  assert.equal(kpis.trasladosCount, 2); // Finalizar el grooming no finaliza el recorrido.
  assert.equal(kpis.trasladosResultado.realizados, 0);
  assert.equal(kpis.trasladosResultado.ingresos, 0);
  assert.equal(kpis.trasladosResultado.resultado, null);
  assert.deepEqual(kpis.trasladosResultado.pendientes, ["historicos_sin_costos"]);
  assert.equal(kpis.trasladosMes, "2026-10");
});

test("Inicio conserva el resultado cero y los cobros nuevos sin sumar importes anteriores", () => {
  const kpis = metrics({ total: { resultado: 0, ingresos: 10000, realizados: 1, pendientes: [] },
    historicos: { cantidad: 1, importe_registrado: 8000 } });
  assert.equal(kpis.trasladosResultado.resultado, 0);
  assert.equal(kpis.trasladosResultado.ingresos, 10000);
  assert.equal(kpis.trasladosHistoricos.importe_registrado, 8000);
});

test("Una consulta fallida no se transforma en cero cobrado ni en un resultado financiero", () => {
  const kpis = metrics(null);
  assert.equal(kpis.trasladosResultado, null);
  assert.equal(kpis.trasladosHistoricos, null);
  assert.equal(kpis.trasladosCount, 2);
  assert.equal(kpis.servicesCount, 2);
  assert.equal(kpis.income, 40000);
});
