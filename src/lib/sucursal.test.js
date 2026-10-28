import assert from "node:assert/strict";
import test from "node:test";
import { defaultBranchInputs, diagnoseLocal, rampFactor, simulateBranch, simulateScenarios } from "./sucursal.js";

const base = {
  inversion: 3_000_000,
  fijosMes: 900_000,
  ticket: 20_000,
  comision: 0.4,
  variablePorServicio: 2_000,
  serviciosMes: 150,
  arranquePct: 0.4,
  mesesRampa: 6,
  diasMes: 24,
};

test("el equilibrio sale de los fijos sobre lo que deja cada servicio", () => {
  const r = simulateBranch({ ...base, arranquePct: 1, mesesRampa: 0 });
  assert.equal(r.margen, 10_000); // 20.000 − 40% − 2.000 de insumos
  assert.equal(r.equilibrio, 90);
  assert.equal(r.equilibrioDiario, 90 / 24);
  assert.equal(r.gananciaRegimen, 600_000);
  // Sin arranque gradual: 3.000.000 / 600.000 = 5 meses.
  assert.equal(r.recupero, 5);
  assert.equal(r.capitalNecesario, 3_000_000);
});

test("el arranque gradual suma pérdidas al capital necesario y atrasa el recupero", () => {
  assert.equal(rampFactor(1, base), 0.4);
  assert.equal(rampFactor(7, base), 1);
  assert.equal(rampFactor(20, base), 1);
  const r = simulateBranch(base);
  assert.equal(r.months[0].ganancia, 60 * 10_000 - 900_000); // pierde 300.000 el primer mes
  assert.ok(r.capitalNecesario > base.inversion);
  assert.ok(r.recupero > 5);
  assert.ok(r.primerMesPositivo > 1);
});

test("si cada servicio no cubre comisión e insumos no hay equilibrio ni recupero", () => {
  const r = simulateBranch({ ...base, ticket: 3_000 });
  assert.ok(r.margen < 0);
  assert.equal(r.equilibrio, null);
  assert.equal(r.recupero, null);
});

test("los escenarios mueven la demanda y avisan si no entra en la capacidad", () => {
  const [peor, esperado, mejor] = simulateScenarios({ ...base, capacidadMes: 160 });
  assert.equal(peor.serviciosRegimen, 105);
  assert.equal(esperado.excedeCapacidad, false);
  assert.equal(mejor.excedeCapacidad, true);
  assert.ok(peor.recupero > esperado.recupero && esperado.recupero > mejor.recupero);
});

test("los valores iniciales salen del promedio mensual del local", () => {
  const d = defaultBranchInputs({ serviciosMes: 120, gastosDiariosMes: 240_000, ticket: 18_500.4, fijosMes: 700_000, comision: 0.35, groomers: 2, diasMes: 23.6 });
  assert.equal(d.variablePorServicio, 2_000);
  assert.equal(d.ticket, 18_500);
  assert.equal(d.comision, 0.35);
  assert.equal(d.diasMes, 24);
  assert.equal(d.inversion, 0);
});

const local = { ingresosMes: 4_000_000, gananciaMes: 800_000, margen: 0.2, serviciosMes: 240, groomers: 2, turnosPorGroomer: 6, diasMes: 24, ingresosMesAnterior: 3_600_000 };

test("un local rentable, lleno y creciendo está listo", () => {
  const d = diagnoseLocal(local, { capitalNecesario: 4_000_000 });
  assert.equal(d.verdict, "ok");
  assert.equal(d.mesesAhorro, 5);
  assert.equal(d.ocupacion, 240 / 288);
  assert.ok(Math.abs(d.crecimiento - 0.111) < 0.001);
});

test("con agenda vacía o pérdida el diagnóstico frena", () => {
  assert.equal(diagnoseLocal({ ...local, serviciosMes: 100 }, { capitalNecesario: 1 }).verdict, "bad");
  const perdiendo = diagnoseLocal({ ...local, gananciaMes: -100, margen: -0.01 }, { capitalNecesario: 1 });
  assert.equal(perdiendo.verdict, "bad");
  assert.equal(perdiendo.checks.find((c) => c.id === "ahorro").status, "bad");
});

test("los datos faltantes no se cuentan como aprobados", () => {
  const d = diagnoseLocal({ ...local, ingresosMesAnterior: null });
  assert.equal(d.checks.find((c) => c.id === "crecimiento").status, "unknown");
  assert.equal(d.checks.find((c) => c.id === "ahorro").status, "unknown");
  assert.equal(d.verdict, "warn");
  assert.equal(diagnoseLocal({ ingresosMes: 0 }).verdict, "unknown");
});
