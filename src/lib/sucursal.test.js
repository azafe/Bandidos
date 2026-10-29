import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultBranchInputs,
  diagnoseLocal,
  groomerLoad,
  INVERSION_PARTES,
  parseNumberInput,
  partsFromTotal,
  rampFactor,
  resolveBranchInputs,
  simulateBranch,
  simulateScenarios,
  sumParts,
  supplyExpenses,
} from "./sucursal.js";

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

test("la capacidad sale de la agenda y deja afuera a quien casi no trabajó", () => {
  const turnos = [];
  for (let d = 1; d <= 20; d += 1) {
    const date = `2026-09-${String(d).padStart(2, "0")}`;
    for (let n = 0; n < (d % 5 === 0 ? 6 : 4); n += 1) turnos.push({ date, groomerId: "a" });
    for (let n = 0; n < 3; n += 1) turnos.push({ date, groomerId: "b" });
  }
  turnos.push({ date: "2026-09-01", groomerId: "c" });
  // Compartido: ocupa a los dos.
  turnos.push({ date: "2026-09-02", groomerId: "a", secondGroomerId: "b" });
  const load = groomerLoad(turnos, [{ id: "a", name: "Ana" }, { id: "b", name: "Bea" }, { id: "c", name: "Ceci" }], { diasAbiertos: 20 });
  assert.equal(load.peluqueros, 2);
  assert.equal(load.minDias, 5);
  assert.deepEqual(load.detalle.map((p) => [p.name, p.dias, p.cuenta]), [["Ana", 20, true], ["Bea", 20, true], ["Ceci", 1, false]]);
  assert.equal(load.detalle[1].maximo, 4);
  assert.equal(load.turnosTope, 5);
});

test("los insumos por servicio usan solo las categorías de insumos si existen", () => {
  const categories = [{ id: 1, name: "Insumos" }, { id: 2, name: "Afilado de Cuchillas" }, { id: 3, name: "Personal" }];
  const expenses = [{ category_id: 1, amount: 1000 }, { category_id: 2, amount: 200 }, { category_id: 3, amount: 5000 }];
  assert.deepEqual(supplyExpenses(expenses, categories), { total: 1200, categorias: ["Insumos", "Afilado de Cuchillas"], separado: true });
  assert.equal(supplyExpenses([{ category_id: 3, amount: 5000 }], categories).total, 5000);
  const d = defaultBranchInputs({ serviciosMes: 100, gastosDiariosMes: 900_000, insumosMes: 400_000 });
  assert.equal(d.variablePorServicio, 4_000);
});

test("el diagnóstico dice qué punto lo frena y muestra la cuenta de la agenda", () => {
  const d = diagnoseLocal({ ...local, serviciosMes: 100 }, { capitalNecesario: 1 });
  assert.deepEqual(d.motivos.map((c) => c.id), ["agenda"]);
  assert.match(d.checks.find((c) => c.id === "agenda").detail, /Hacen 100 turnos por mes y entran 288 \(2 peluqueros × 6 turnos × 24 días\)/);
  assert.deepEqual(diagnoseLocal(local, { capitalNecesario: 4_000_000 }).motivos, []);
});

test("los campos numéricos aceptan miles con punto y decimales con coma", () => {
  assert.equal(parseNumberInput("3.606.721", { money: true }), 3_606_721);
  assert.equal(parseNumberInput("$ 15.000.000", { money: true }), 15_000_000);
  assert.equal(parseNumberInput("", { money: true }), null);
  assert.equal(parseNumberInput("4,5"), 4.5);
  assert.equal(parseNumberInput("6"), 6);
  assert.equal(parseNumberInput("abc"), null);
});

test("la inversión y los fijos por partes mandan la suma", () => {
  const partes = partsFromTotal(INVERSION_PARTES, 2_000_000);
  assert.equal(partes.otros, 2_000_000);
  assert.equal(sumParts(partes), 2_000_000);
  const r = resolveBranchInputs({ ...base, inversion: 1, inversionPartes: { ...partes, obra: 500_000 }, fijosPartes: { alquiler: 700_000, sueldos: 300_000 } });
  assert.equal(r.inversion, 2_500_000);
  assert.equal(r.fijosMes, 1_000_000);
  assert.equal(resolveBranchInputs({ ...base, inversionPartes: null }).inversion, base.inversion);
});
