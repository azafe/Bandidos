import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentRows, paymentError, paymentDescription } from './servicePayments.js';
import { groomerPayout } from './sharedGroomer.js';
test('saldo combinado y seña sin mutar los pagos', () => {
  const record = { price: 70000, deposit_amount: 10000, payments: [{ payment_method_id: 'cash', amount: 20000 }, { payment_method_id: 'card', amount: 40000 }] };
  assert.equal(paymentError(record.payments, 60000), null); assert.ok(paymentError(record.payments, 70000));
  const rows = paymentRows(record); rows.push({ amount: 10000 }); assert.equal(record.payments.length, 2);
  assert.equal(paymentDescription(record, [{ id: 'cash', name: 'Efectivo' }, { id: 'card', name: 'Tarjeta' }], String), 'Efectivo: 20000 + Tarjeta: 40000');
});
test('compatibilidad y validaciones de importes', () => {
  assert.deepEqual(paymentRows({ price: 70000, deposit_amount: 10000, payment_method_id: 'cash' }), [{ payment_method_id: 'cash', amount: 60000 }]);
  for (const payments of [[{ payment_method_id: 'cash', amount: -1 }], [{ payment_method_id: 'cash', amount: 1.001 }], [{ payment_method_id: '', amount: 1 }], [{ payment_method_id: 'cash', amount: 1 }, { payment_method_id: 'cash', amount: 1 }]]) assert.ok(paymentError(payments, 2));
});
test('70000 compartidos conservan la comisión total de 28000', () => {
  const record = { groomer_id: 'a', second_groomer_id: 'b', commission_rate_snapshot: .4 };
  assert.equal(groomerPayout(record, 70000, [], 'a'), 14000); assert.equal(groomerPayout(record, 70000, [], 'b'), 14000);
});
