import assert from "node:assert/strict";
import test from "node:test";
import { simularMovil } from "./trasladosResultados.js";

const base = { precio: "8000", dias: "20", costoFijo: "200000", costoVariable: "1000", modelo: "jornal", valorChofer: "15000" };
test("simulador: jornal mensual, margen y punto de equilibrio sin redondear hacia abajo", () => {
  const r = simularMovil(base);
  assert.equal(r.estado, "calculado"); assert.equal(r.fijos, 500000); assert.equal(r.margen, 7000);
  assert.equal(r.porMes, 72); assert.equal(r.promedioDiario, 3.6); assert.equal(r.porDia, 4);
  assert.ok((r.porMes - 1) * r.margen < r.fijos); assert.ok(r.porMes * r.margen >= r.fijos);
});
test("simulador: porcentaje se descuenta por viaje y los costos cero son explícitos", () => {
  const r = simularMovil({ ...base, modelo: "porcentaje", valorChofer: "25" });
  assert.equal(r.margen, 5000); assert.equal(r.porMes, 40); assert.equal(r.porDia, 2);
  assert.equal(simularMovil({ ...base, modelo: "ninguno", costoFijo: "0", valorChofer: "" }).porMes, 0);
});
test("simulador: costos desconocidos, modelos pendientes y valores inválidos no producen una ganancia", () => {
  for (const key of ["precio", "dias", "costoFijo", "costoVariable", "valorChofer"]) assert.equal(simularMovil({ ...base, [key]: "" }).estado, "pendiente");
  for (const patch of [{ dias: "0" }, { dias: "32" }, { dias: "1.5" }, { precio: "0" }, { costoVariable: "-1" }, { precio: "Infinity" }, { modelo: "" }, { modelo: "porcentaje", valorChofer: "101" }]) assert.equal(simularMovil({ ...base, ...patch }).estado, "invalido");
  assert.equal(simularMovil({ ...base, modelo: "porcentaje", valorChofer: "100" }).estado, "sin_margen");
  assert.equal(simularMovil({ ...base, costoVariable: "8000" }).estado, "sin_margen");
});
