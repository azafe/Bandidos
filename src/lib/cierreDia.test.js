import assert from "node:assert/strict";
import test from "node:test";
import { liquidacionPeluqueros, normalizarId, pedidoTerminar, precioServicio, resumenCierre, tasaComision, totalesLiquidacion } from "./cierreDia.js";

const servicios = [{ id: 1, name: "Baño", default_price: "20000" }, { id: 2, name: "Corte y baño", default_price: "27000" }];
const medios = [{ id: 1, name: "Efectivo" }, { id: 2, name: "Transferencia" }];
const empleados = [{ id: 10, name: "Jime", commission_rate: "0.40" }, { id: 11, name: "Meli", commission_rate: 50 }, { id: 12, name: "Flor" }];

// Un día con: un turno de una peluquera pagado en efectivo, uno compartido con
// seña y pago combinado, uno de tres peluqueras, uno reservado y uno cancelado.
const turnos = [
  { id: 1, status: "finished", service_type_id: 1, price: "20000.00", groomer_id: 10, payment_method_id: 1, payments: [] },
  { id: 2, status: "finished", service_type_id: 2, price: "27000.00", deposit_amount: "5000.00", deposit_payment_method_id: 2, groomer_id: 10, second_groomer_id: 12,
    payments: [{ payment_method_id: 1, amount: "12000.00" }, { payment_method_id: 2, amount: "10000.00" }] },
  { id: 3, status: "finished", service_type_id: 2, price: "30000", groomer_id: 11, second_groomer_id: 10, third_groomer_id: 12, payment_method_id: 2 },
  { id: 4, status: "reserved", service_type_id: 1, groomer_id: 12 },
  { id: 5, status: "cancelled", service_type_id: 1 },
];

test("los cobros del día se agrupan por medio, con la seña incluida", () => {
  const r = resumenCierre(turnos, servicios, medios);
  assert.equal(r.finished, 3);
  assert.equal(r.finishedIncome, 77000);
  assert.deepEqual(r.byPaymentMethod, [{ name: "Transferencia", total: 45000 }, { name: "Efectivo", total: 32000 }]);
  assert.equal(r.byPaymentMethod.reduce((a, x) => a + x.total, 0), r.finishedIncome);
  assert.equal(r.finishedWithoutPayment.length, 0);
});

test("la liquidación reparte la comisión del principal y suma lo mismo que cada servicio", () => {
  const rows = liquidacionPeluqueros(turnos, servicios, empleados);
  const por = Object.fromEntries(rows.map((r) => [r.groomerName, r.payout]));
  // T1: 20000 × 40% = 8000 para Jime. T2: 27000 × 40% = 10800 / 2 = 5400 c/u.
  // T3: principal Meli 50% → 15000 / 3 = 5000 c/u.
  assert.equal(por.Jime, 8000 + 5400 + 5000);
  assert.equal(por.Flor, 5400 + 5000);
  assert.equal(por.Meli, 5000);
  assert.equal(totalesLiquidacion(rows).payout, 8000 + 10800 + 15000);
  assert.equal(liquidacionPeluqueros(turnos, servicios, empleados, { groomerId: 12 }).length, 1);
});

test("el reparto de centavos no pierde ni agrega plata", () => {
  const t = [{ status: "finished", price: "10000.01", groomer_id: 10, second_groomer_id: 11, third_groomer_id: 12 }];
  const rows = liquidacionPeluqueros(t, [], empleados);
  assert.equal(Math.round(totalesLiquidacion(rows).payout * 100), 400000);
});

test("precio y comisión", () => {
  assert.equal(precioServicio({ service_type_id: 2 }, servicios), 27000);
  assert.equal(precioServicio({ service_type_id: 2, price: "25000" }, servicios), 25000);
  assert.equal(tasaComision(null), 0.4);
  assert.equal(tasaComision({ commission_rate: 35 }), 0.35);
  assert.equal(normalizarId("12"), 12);
  assert.equal(normalizarId("a-b"), "a-b");
  assert.equal(normalizarId(""), null);
});

test("el pedido de terminar es el mismo que arma la agenda clásica", () => {
  const traslado = { traslado_amount: 5000, traslado_bonificado: false };
  assert.deepEqual(pedidoTerminar({ peluqueras: ["10"], servicioId: "2", precio: 27000, pagos: [{ payment_method_id: "1", amount: "22000" }], sena: 5000, traslado }), {
    status: "finished", groomer_id: 10, second_groomer_id: null, third_groomer_id: null, service_type_id: 2, price: 27000,
    payments: [], payment_method_id: 1, traslado_amount: 5000, traslado_bonificado: false,
  });
  const split = pedidoTerminar({ peluqueras: ["10", "12"], servicioId: 2, precio: 27000, pagos: [{ payment_method_id: "1", amount: "12000" }, { payment_method_id: "2", amount: "10000" }], sena: 5000, traslado });
  assert.deepEqual(split.payments, [{ payment_method_id: 1, amount: 12000 }, { payment_method_id: 2, amount: 10000 }]);
  assert.equal(split.payment_method_id, null);
  assert.equal(split.second_groomer_id, 12);
  // Pagado todo con la seña: queda el medio de la seña para que no figure «sin método».
  assert.equal(pedidoTerminar({ peluqueras: ["10"], servicioId: 1, precio: 5000, pagos: [], sena: 5000, depositoMedioId: "2", traslado }).payment_method_id, 2);
});
