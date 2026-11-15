import assert from "node:assert/strict";
import test from "node:test";
import {
  branchFromSimulator,
  currencyOf,
  dealSummary,
  defaultCompromisos,
  mergeInvestors,
  newInvestor,
  normalizeInvestor,
  parseStore,
  proposalView,
  serializeStore,
} from "./inversores.js";

const branch = {
  inversion: 30_000_000,
  fijosMes: 4_000_000,
  ticket: 35_000,
  comision: 0.4,
  variablePorServicio: 3_000,
  serviciosMes: 360,
  arranquePct: 0.4,
  mesesRampa: 6,
  diasMes: 24,
};
const proyecto = { iibbPct: 0.04, gananciasPct: 0 };

test("un inversor nuevo toma la propuesta de su perfil y pide el 75%", () => {
  const inv = newInvestor("familiar", { plataNecesaria: 33_000_000 });
  assert.equal(inv.deal.tipo, "prestamo");
  assert.equal(inv.deal.monto, 24_800_000);
  assert.equal(inv.horizonte, 36);
  assert.match(inv.compromisos, /Garantía/);
  assert.notEqual(newInvestor("privado").id, inv.id);
});

test("normalizar completa datos viejos o rotos", () => {
  const inv = normalizeInvestor({ id: "x", deal: { tipo: "raro", monto: "-5" }, horizonte: 48, moneda: "EUR" });
  assert.equal(inv.deal.tipo, "participacion");
  assert.equal(inv.deal.monto, 0);
  assert.equal(inv.horizonte, 60);
  assert.equal(inv.moneda, "ARS");
});

test("guardar, leer e importar", () => {
  const a = newInvestor("privado");
  const store = { proyecto, inversores: [a] };
  const back = parseStore(serializeStore(store));
  assert.equal(back.inversores[0].id, a.id);
  assert.equal(back.proyecto.iibbPct, 0.04);
  assert.deepEqual(parseStore("no es json").inversores, []);
  // Un archivo con solo la lista también sirve.
  assert.equal(parseStore([a]).inversores.length, 1);
  const editado = { ...a, nombre: "Otro" };
  const b = newInvestor("banco");
  const merged = mergeInvestors([a], [editado, b]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].nombre, "Otro");
});

test("la sucursal sale de lo guardado en el simulador", () => {
  assert.equal(branchFromSimulator(null), null);
  const b = branchFromSimulator({
    inputs: { ...branch, inversionPartes: { obra: 10, equipos: 5 }, groomers: 2, turnosPorGroomer: 5, diasMes: 20 },
  });
  assert.equal(b.inversion, 15);
  assert.equal(b.capacidadMes, 200);
});

test("dólares solo con tipo de cambio", () => {
  assert.equal(currencyOf({ moneda: "USD", tipoCambio: 0 }).usd, false);
  assert.deepEqual(currencyOf({ moneda: "USD", tipoCambio: 1000 }), { usd: true, divisor: 1000, simbolo: "US$" });
});

test("la vista de la propuesta arma escenarios, fondos y series", () => {
  const inv = {
    ...newInvestor("privado"),
    deal: { tipo: "participacion", monto: 30_000_000, pct: 0.3, pctHastaRecuperar: 0.6 },
  };
  const v = proposalView(branch, proyecto, inv);
  assert.equal(v.escenarios.length, 3);
  assert.equal(v.meses.length, 60);
  // Equilibrio con IIBB: 4.000.000 / (18.000 − 1.400).
  assert.equal(v.sucursal.equilibrio, 241);
  assert.ok(v.sucursal.plataNecesaria > 30_000_000);
  assert.equal(v.sucursal.aporteBandidos, v.sucursal.plataNecesaria - 30_000_000);
  const fondos = v.sucursal.usoFondos.reduce((t, f) => t + f.monto, 0);
  assert.equal(Math.round(fondos), Math.round(v.sucursal.plataNecesaria));
  // El cobrado acumulado del esperado termina en lo que recibe el inversor.
  assert.ok(Math.abs(v.meses[59].cobrado - v.esperado.inversor.recibido) < 1e-6);
  assert.ok(v.meses[59].peor < v.meses[59].cobrado && v.meses[59].cobrado < v.meses[59].mejor);
});

test("la propuesta en palabras", () => {
  const money = (n) => `$${n}`;
  const pct = (n) => `${Math.round(n * 100)}%`;
  assert.equal(
    dealSummary({ deal: { tipo: "prestamo", monto: 10, tasaAnual: 0.1, cuotas: 30, gracia: 6 } }, money, pct),
    "Préstamo de $10 al 10% anual, en 30 cuotas con 6 meses de gracia (solo interés)."
  );
  assert.match(
    dealSummary({ deal: { tipo: "participacion", monto: 10, pct: 0.3, pctHastaRecuperar: 0.6 } }, money, pct),
    /60% .* hasta recuperarlo y el 30%/
  );
  assert.match(defaultCompromisos("participacion"), /recompra/);
});
