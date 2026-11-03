export function paymentRows(record) {
  if (record.payments?.length) return record.payments.map(p => ({ ...p }));
  return [{ payment_method_id: record.payment_method_id || null,
    amount: Math.max(0, Math.round((Number(record.price || 0) - Number(record.deposit_amount || 0)) * 100) / 100) }];
}

export function paymentError(payments, balance) {
  if (!payments?.length) return null;
  if (payments.some(p => !p.payment_method_id || !Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0))
    return "Seleccioná un medio e ingresá un importe mayor a cero en cada pago.";
  if (new Set(payments.map(p => p.payment_method_id)).size !== payments.length)
    return "Usá una sola fila por medio de pago.";
  if (payments.some(p => Math.abs(Number(p.amount) * 100 - Math.round(Number(p.amount) * 100)) > 0.001))
    return "Los importes admiten hasta dos decimales.";
  if (payments.reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0) !== Math.round(Number(balance) * 100))
    return "Los pagos deben sumar el saldo del servicio, descontando la seña.";
  return null;
}

export function paymentDescription(record, methods, formatAmount) {
  if (!record.payments?.length) return methods.find(m => String(m.id) === String(record.payment_method_id))?.name || record.payment_method?.name || "Sin método";
  return record.payments.map(p => `${methods.find(m => String(m.id) === String(p.payment_method_id))?.name || "Sin método"}: ${formatAmount(p.amount)}`).join(" + ");
}
