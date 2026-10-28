// The service is billed once. A shared service splits the principal groomer's
// commission equally; the second groomer's own rate does not change that pool.
export function groomerShares(record) {
  const primary = record.groomer_id ?? record.groomer?.id ?? record.groomerId ?? null;
  const second = record.second_groomer_id ?? null;
  if (!primary || !second || String(primary) === String(second)) {
    return [{ groomerId: primary, share: 1 }];
  }
  return [{ groomerId: primary, share: 0.5 }, { groomerId: second, share: 0.5 }];
}

export function groomerShare(record, groomerId) {
  return groomerShares(record).find((part) => String(part.groomerId) === String(groomerId))?.share ?? 0;
}

export function employeeCommissionRate(employee) {
  const raw = employee?.commission_rate ?? employee?.commissionRate ?? 0.4;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0) return 0.4;
  return Math.min(rate > 1 ? rate / 100 : rate, 1);
}

export function groomerPayout(record, amount, employees, groomerId) {
  const primaryId = record.groomer_id ?? record.groomer?.id;
  const primary = employees.find((employee) => String(employee.id) === String(primaryId));
  return Number(amount) * employeeCommissionRate(primary) * groomerShare(record, groomerId);
}
