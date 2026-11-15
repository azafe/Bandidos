import assert from "node:assert/strict";
import test from "node:test";
import {
  annualRate,
  frenchPayment,
  investorPlan,
  irr,
  loanSchedule,
  monthlyRate,
  npv,
  payback,
  projectFlows,
} from "./inversion.js";

const base = {
  inversion: 3_000_000,
  fijosMes: 900_000,
  ticket: 20_000,
  comision: 0.4,
  variablePorServicio: 2_000,
  serviciosMes: 150,
  arranquePct: 1,
  mesesRampa: 0,
  diasMes: 24,
};
const sinImpuestos = { iibbPct: 0, gananciasPct: 0, valorFinalMeses: 0, tasaDescuento: 0.12 };

test("tasa anual y mensual son equivalentes", () => {
  const m = monthlyRate(0.12);
  assert.ok(Math.abs(annualRate(m) - 0.12) < 1e-12);
  assert.ok(Math.abs(m - 0.009489) < 1e-6);
});

test("VAN y TIR de un flujo conocido", () => {
  const flows = [-1000, 1100];
  assert.ok(Math.abs(irr(flows) - 0.1) < 1e-6);
  assert.ok(Math.abs(npv(0.1, flows)) < 1e-9);
  assert.equal(irr([100, 200]), null); // nunca se pone plata
});

test("payback simple y descontado", () => {
  const flows = [-300, 100, 100, 100, 100];
  assert.equal(payback(flows), 3);
  assert.equal(payback(flows, 0.05), 4);
  assert.equal(payback([-300, 100]), null);
});

test("sin impuestos el flujo del proyecto coincide con la simulación base", () => {
  const p = projectFlows(base, sinImpuestos);
  assert.equal(p.flows[0], -3_000_000);
  assert.equal(p.flows[1], 600_000);
  assert.equal(p.flows.length, 37);
});

test("Ingresos Brutos se descuenta sobre lo facturado", () => {
  const p = projectFlows(base, { ...sinImpuestos, iibbPct: 0.04 });
  // 150 × 20.000 = 3.000.000 facturado → 120.000 de IIBB.
  assert.equal(p.flows[1], 480_000);
});

test("cuota francesa", () => {
  assert.equal(frenchPayment(1200, 0, 12), 100);
  const c = frenchPayment(1_000_000, 0.02, 12);
  assert.ok(Math.abs(c - 94_559.6) < 1);
});

test("el préstamo se cancela y con gracia primero paga solo interés", () => {
  const s = loanSchedule({ monto: 1_000_000, tasaAnual: 0.12, cuotas: 12, gracia: 3 }, 36);
  const r = monthlyRate(0.12);
  assert.ok(Math.abs(s.pagos[0].pago - 1_000_000 * r) < 1e-6);
  assert.equal(s.pagos[2].saldo, 1_000_000);
  assert.ok(s.pagos[14].saldo < 1e-6);
  assert.equal(s.pagos[15].pago, 0);
});

test("en un préstamo la TIR del inversor es la tasa pactada", () => {
  const plan = investorPlan(base, sinImpuestos, { tipo: "prestamo", monto: 2_000_000, tasaAnual: 0.18, cuotas: 24 });
  assert.ok(Math.abs(plan.inversor.tirAnual - 0.18) < 1e-6);
  // Lo que pone el inversor no lo pone el dueño.
  assert.equal(plan.dueno.flows[0], -1_000_000);
  assert.ok(plan.coberturaMinima > 1);
  assert.equal(plan.mesesSinCubrir, 0);
});

test("si la sucursal arranca de a poco, hay meses en que la ganancia no cubre la cuota", () => {
  const plan = investorPlan({ ...base, arranquePct: 0.4, mesesRampa: 6 }, sinImpuestos, {
    tipo: "prestamo", monto: 3_000_000, tasaAnual: 0.18, cuotas: 6,
  });
  assert.ok(plan.coberturaMinima < 1);
  assert.ok(plan.mesesSinCubrir > 0);
});

test("participación: cobra más hasta recuperar y después su porcentaje", () => {
  const plan = investorPlan(base, sinImpuestos, {
    tipo: "participacion",
    monto: 3_000_000,
    pct: 0.3,
    pctHastaRecuperar: 0.6,
  });
  const pagos = plan.inversor.flows.slice(1);
  assert.equal(pagos[0], 360_000); // 60% de 600.000
  assert.equal(pagos[pagos.length - 1], 180_000); // 30% una vez recuperado
  assert.equal(plan.inversor.payback, 9); // 9 × 360.000 ≥ 3.000.000
  assert.equal(plan.dueno.capitalPropio, 0);
  assert.equal(plan.coberturaMinima, null);
});

test("el valor final suma al último mes y se reparte por participación", () => {
  const plan = investorPlan(base, { ...sinImpuestos, valorFinalMeses: 12 }, { tipo: "participacion", monto: 3_000_000, pct: 0.3 });
  assert.equal(plan.proyecto.valorFinal, 7_200_000);
  const last = plan.inversor.flows[plan.inversor.flows.length - 1];
  assert.equal(last, 180_000 + 7_200_000 * 0.3);
});

test("se puede mirar a más años que los 36 meses de la simulación", () => {
  const plan = investorPlan(base, sinImpuestos, { tipo: "participacion", monto: 3_000_000, pct: 0.3 }, { horizon: 60 });
  assert.equal(plan.inversor.flows.length, 61);
});
