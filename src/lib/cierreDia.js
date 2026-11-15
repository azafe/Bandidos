// Cierre del día de la agenda: cobros por medio de pago y liquidación por
// peluquero. Lo usan la agenda clásica y la planilla, para que den lo mismo.
import { paymentRows } from "./servicePayments.js";
import { groomerPayout, groomerShares } from "./sharedGroomer.js";

const ESTADOS = new Set(["reserved", "finished", "cancelled", "no_show"]);
export const estadoTurno = (status) => (ESTADOS.has(status) ? status : "reserved");

const aNumero = (value) => {
  const n = typeof value === "string" ? Number(value.trim().replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Mismo id que espera la API: los números como número, el resto como texto.
export function normalizarId(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

// Precio de un turno: el cargado al terminar o, si no hay, el del catálogo.
export function precioServicio(turno, servicios = []) {
  const catalogo = servicios.find((s) => String(s.id) === String(turno.service_type_id));
  return Number(turno.price || catalogo?.default_price || turno.service_type?.default_price || turno.service_price || turno.amount || 0);
}

// La comisión se guarda como fracción (0.40 = 40%). Un valor > 1 viene cargado como porcentaje.
export const COMISION_POR_DEFECTO = 0.4;
export function tasaComision(empleado) {
  if (!empleado) return COMISION_POR_DEFECTO;
  const raw = empleado.commission_rate ?? empleado.commissionRate ?? empleado.commission ?? empleado.comision ??
    empleado.comision_porcentaje ?? empleado.percentage ?? COMISION_POR_DEFECTO;
  const rate = Number(raw);
  if (!Number.isFinite(rate)) return COMISION_POR_DEFECTO;
  return Math.max(0, Math.min(1, rate > 1 ? rate / 100 : rate));
}

export function resumenCierre(turnos, servicios = [], medios = []) {
  let reserved = 0;
  let finished = 0;
  let cancelled = 0;
  let estimatedIncome = 0;
  let finishedIncome = 0;
  let totalDeposit = 0;
  const porMedio = new Map();
  for (const turno of turnos) {
    const status = estadoTurno(turno.status);
    const amount = precioServicio(turno, servicios);
    estimatedIncome += amount;
    totalDeposit += aNumero(turno.deposit_amount);
    if (status === "reserved") reserved += 1;
    if (status === "finished") {
      finished += 1;
      finishedIncome += amount;
      const rows = paymentRows({ ...turno, price: amount });
      if (Number(turno.deposit_amount) > 0) rows.push({ payment_method_id: turno.deposit_payment_method_id || turno.payment_method_id, amount: Number(turno.deposit_amount) });
      for (const pago of rows) {
        const nombre = medios.find((m) => String(m.id) === String(pago.payment_method_id))?.name || "Sin método";
        porMedio.set(nombre, (porMedio.get(nombre) || 0) + Number(pago.amount));
      }
    }
    if (status === "cancelled") cancelled += 1;
  }
  const totalScheduled = turnos.length;
  return {
    totalScheduled,
    reserved,
    finished,
    cancelled,
    completionRate: totalScheduled ? Math.round((finished / totalScheduled) * 100) : 0,
    estimatedIncome,
    finishedIncome,
    totalDeposit,
    pendingCollection: Math.max(estimatedIncome - totalDeposit, 0),
    byPaymentMethod: [...porMedio.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    finishedWithoutPayment: turnos.filter((t) => estadoTurno(t.status) === "finished" && !t.payment_method_id && !t.payments?.length),
  };
}

// Liquidación por peluquero: un servicio compartido reparte la comisión del principal en partes iguales.
export function liquidacionPeluqueros(turnos, servicios = [], empleados = [], { groomerId = "" } = {}) {
  const porId = new Map(empleados.map((e) => [String(e.id), e]));
  const grupos = new Map();
  for (const turno of turnos) {
    for (const { groomerId: rawId, share } of groomerShares(turno)) {
      if (groomerId && String(rawId) !== String(groomerId)) continue;
      const tieneId = rawId !== null && rawId !== undefined && rawId !== "";
      const key = tieneId ? String(rawId) : "unassigned";
      const empleado = tieneId ? porId.get(key) : null;
      if (!grupos.has(key)) {
        grupos.set(key, {
          groomerId: key,
          groomerName: empleado?.name || (tieneId ? `Groomer #${key}` : "Sin groomer asignado"),
          commissionRate: tieneId ? tasaComision(empleado) : 0,
          scheduledCount: 0,
          finishedCount: 0,
          estimatedIncome: 0,
          finishedIncome: 0,
          payout: 0,
        });
      }
      const row = grupos.get(key);
      const precio = precioServicio(turno, servicios);
      const amount = precio * share;
      row.scheduledCount += share;
      row.estimatedIncome += amount;
      if (estadoTurno(turno.status) === "finished") {
        row.finishedCount += share;
        row.finishedIncome += amount;
        row.payout += tieneId ? groomerPayout(turno, precio, empleados, rawId) : 0;
      }
    }
  }
  return [...grupos.values()]
    .map((row) => ({
      ...row,
      commissionRate: row.finishedIncome ? row.payout / row.finishedIncome : row.commissionRate,
      completionRate: row.scheduledCount ? Math.round((row.finishedCount / row.scheduledCount) * 100) : 0,
    }))
    .sort((a, b) => b.payout - a.payout || b.finishedIncome - a.finishedIncome);
}

export const totalesLiquidacion = (rows) => rows.reduce((acc, row) => ({
  scheduledCount: acc.scheduledCount + row.scheduledCount,
  finishedCount: acc.finishedCount + row.finishedCount,
  finishedIncome: acc.finishedIncome + row.finishedIncome,
  payout: acc.payout + row.payout,
}), { scheduledCount: 0, finishedCount: 0, finishedIncome: 0, payout: 0 });

// Lo que la planilla manda al terminar un turno: el mismo pedido que el cierre de la agenda clásica.
// Un solo medio va en payment_method_id (sin lista); dos o más van en payments.
export function pedidoTerminar({ peluqueras, servicioId, precio, pagos, sena, depositoMedioId, traslado }) {
  const [g1, g2, g3] = peluqueras.map(normalizarId);
  const payments = pagos.length > 1 ? pagos.map((p) => ({ payment_method_id: normalizarId(p.payment_method_id), amount: aNumero(p.amount) })) : [];
  const unico = pagos.length === 1 ? normalizarId(pagos[0].payment_method_id) : null;
  const saldo = Math.max(0, precio - aNumero(sena));
  return {
    status: "finished",
    groomer_id: g1,
    second_groomer_id: g2 ?? null,
    third_groomer_id: g3 ?? null,
    service_type_id: normalizarId(servicioId),
    price: precio,
    payments,
    payment_method_id: payments.length > 1 ? null : unico || (saldo === 0 ? normalizarId(depositoMedioId) : null),
    traslado_amount: traslado.traslado_amount,
    traslado_bonificado: traslado.traslado_bonificado,
  };
}
