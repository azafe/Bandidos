// Plan de inversión para ofrecer una sucursal nueva a un inversor.
// Parte de la simulación mes a mes de sucursal.js (simulateBranch) y le suma
// lo que esa cuenta deja afuera: impuestos, valor del negocio al final,
// costo del dinero (tasa) y cómo se reparte la plata con el inversor.
//
// Todo va en moneda constante (pesos de hoy o dólares): la tasa que se carga
// tiene que ser real, sin inflación. Si se carga en pesos corrientes, la tasa
// tiene que incluir la inflación esperada.

import { simulateBranch } from "./sucursal.js";

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Tasa anual efectiva → tasa mensual equivalente.
export function monthlyRate(annual) {
  return (1 + num(annual)) ** (1 / 12) - 1;
}

export function annualRate(monthly) {
  return (1 + num(monthly)) ** 12 - 1;
}

// Valor actual neto. flows[0] es el mes 0 (hoy), sin descontar.
export function npv(rateMonthly, flows) {
  return flows.reduce((total, f, t) => total + num(f) / (1 + rateMonthly) ** t, 0);
}

// Tasa interna de retorno mensual por bisección. null si los flujos no
// cambian de signo o no hay una tasa entre −99% y +100% mensual que dé VAN 0.
export function irr(flows) {
  const hasNeg = flows.some((f) => f < 0);
  const hasPos = flows.some((f) => f > 0);
  if (!hasNeg || !hasPos) return null;
  let lo = -0.99;
  let hi = 1;
  let fLo = npv(lo, flows);
  const fHi = npv(hi, flows);
  if (Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// Primer mes en que el acumulado de flujos (descontados si se da una tasa)
// deja de ser negativo. null si no pasa dentro del horizonte.
export function payback(flows, rateMonthly = 0) {
  let acc = 0;
  for (let t = 0; t < flows.length; t += 1) {
    acc += num(flows[t]) / (1 + rateMonthly) ** t;
    if (t > 0 && acc >= 0) return t;
  }
  return null;
}

// Resumen de un flujo desde el punto de vista de quien pone la plata.
export function flowMetrics(flows, tasaAnual) {
  const r = monthlyRate(tasaAnual);
  const puesto = flows.filter((f) => f < 0).reduce((t, f) => t - f, 0);
  const recibido = flows.filter((f) => f > 0).reduce((t, f) => t + f, 0);
  const tirMensual = irr(flows);
  const meses = flows.length - 1;
  return {
    puesto,
    recibido,
    ganancia: recibido - puesto,
    roi: puesto > 0 ? (recibido - puesto) / puesto : null,
    // ROI llevado a un año, para comparar con un plazo fijo o un bono.
    roiAnual: puesto > 0 && meses > 0 && recibido > 0 ? (recibido / puesto) ** (12 / meses) - 1 : null,
    multiplo: puesto > 0 ? recibido / puesto : null,
    van: npv(r, flows),
    tirMensual,
    tirAnual: tirMensual === null ? null : annualRate(tirMensual),
    payback: payback(flows),
    paybackDescontado: payback(flows, r),
  };
}

// Supuestos que suma el plan del inversor sobre los de la sucursal.
export const DEFAULT_PLAN = {
  // Impuestos que la simulación base no incluye.
  iibbPct: 0.04, // Ingresos Brutos y tasas sobre la facturación.
  gananciasPct: 0, // Sobre la ganancia positiva (0 si es monotributo).
  // Valor del negocio al final del horizonte, en meses de ganancia ya
  // arrancada. 0 = conservador, no se vende ni se valúa nada.
  valorFinalMeses: 0,
  // Lo que podría ganar el inversor en otra cosa con riesgo parecido
  // (anual, real). Es la vara para el VAN.
  tasaDescuento: 0.15,
};

// Flujo mensual del proyecto (sin financiación): mes 0 = inversión.
// La inversión sale de inputs.inversion; las pérdidas del arranque ya
// aparecen como meses negativos.
export function projectFlows(inputs, plan = DEFAULT_PLAN, { factor = 1, horizon } = {}) {
  const sim = simulateBranch(inputs, { factor, ...(horizon ? { horizon } : {}) });
  const ticket = num(inputs.ticket);
  const iibb = num(plan.iibbPct);
  const gan = num(plan.gananciasPct);
  const meses = sim.months.map((m) => {
    const ingresos = m.servicios * ticket;
    const antesImpuestos = m.ganancia - ingresos * iibb;
    const impuestoGanancias = antesImpuestos > 0 ? antesImpuestos * gan : 0;
    return {
      month: m.month,
      servicios: m.servicios,
      ingresos,
      ganancia: antesImpuestos - impuestoGanancias,
    };
  });
  const ultima = meses.length ? meses[meses.length - 1].ganancia : 0;
  const valorFinal = Math.max(0, ultima) * num(plan.valorFinalMeses);
  const flows = [-Math.max(0, num(inputs.inversion)), ...meses.map((m) => m.ganancia)];
  if (flows.length > 1) flows[flows.length - 1] += valorFinal;
  return { sim, meses, valorFinal, flows };
}

// Cuota de un préstamo en sistema francés.
export function frenchPayment(capital, rateMonthly, cuotas) {
  if (cuotas <= 0) return 0;
  if (rateMonthly === 0) return capital / cuotas;
  return (capital * rateMonthly) / (1 - (1 + rateMonthly) ** -cuotas);
}

// Préstamo: el inversor presta `monto` a `tasaAnual`, con `gracia` meses
// pagando solo interés y después `cuotas` meses de sistema francés.
// Devuelve lo que paga el local cada mes (índice 1..horizonte).
export function loanSchedule({ monto, tasaAnual, cuotas, gracia = 0 }, horizon) {
  const r = monthlyRate(tasaAnual);
  const capital = Math.max(0, num(monto));
  const n = Math.max(1, Math.round(num(cuotas)));
  const g = Math.max(0, Math.round(num(gracia)));
  const cuota = frenchPayment(capital, r, n);
  const pagos = [];
  let saldo = capital;
  for (let m = 1; m <= Math.max(horizon, g + n); m += 1) {
    let pago = 0;
    if (m <= g) {
      pago = saldo * r;
    } else if (m <= g + n && saldo > 0) {
      const interes = saldo * r;
      pago = Math.min(cuota, saldo + interes);
      saldo -= pago - interes;
    }
    pagos.push({ month: m, pago, saldo: Math.max(0, saldo) });
  }
  return { cuota, pagos };
}

// Participación: el inversor pone `monto` y se lleva `pct` de la ganancia
// mensual positiva. Si `pctHastaRecuperar` está, cobra ese porcentaje mayor
// hasta haber recuperado su aporte y después baja a `pct`. Al final cobra su
// parte del valor del negocio.
function equityPayments({ monto, pct, pctHastaRecuperar }, meses, valorFinal) {
  const aporte = Math.max(0, num(monto));
  let cobrado = 0;
  const pagos = meses.map((m) => {
    const share = pctHastaRecuperar && cobrado < aporte ? num(pctHastaRecuperar) : num(pct);
    const pago = Math.max(0, m.ganancia) * share;
    cobrado += pago;
    return { month: m.month, pago };
  });
  if (pagos.length) pagos[pagos.length - 1].pago += valorFinal * num(pct);
  return pagos;
}

// Arma la propuesta completa: el proyecto, lo del inversor y lo del dueño.
// deal.tipo: "prestamo" | "participacion".
export function investorPlan(inputs, plan = DEFAULT_PLAN, deal, { factor = 1, horizon } = {}) {
  const proyecto = projectFlows(inputs, plan, { factor, horizon });
  const meses = proyecto.meses.length;
  const monto = Math.max(0, num(deal?.monto));

  let pagos;
  let cuota = null;
  if (deal?.tipo === "prestamo") {
    const s = loanSchedule(deal, meses);
    cuota = s.cuota;
    pagos = s.pagos.slice(0, meses);
  } else {
    pagos = equityPayments(deal || {}, proyecto.meses, proyecto.valorFinal);
  }

  const inversorFlows = [-monto, ...pagos.map((p) => p.pago)];
  const duenoFlows = proyecto.flows.map((f, t) => f + (t === 0 ? monto : -pagos[t - 1].pago));

  // Cobertura de la deuda (solo préstamo; en participación el pago ya es una
  // parte de la ganancia): cuántas veces cubre la ganancia del mes lo que hay
  // que pagar. Se mira el peor mes y cuántos meses la ganancia no alcanza y
  // el dueño tiene que poner de su bolsillo.
  const conPago = deal?.tipo === "prestamo"
    ? proyecto.meses.map((m, i) => ({ ganancia: m.ganancia, pago: pagos[i].pago })).filter((x) => x.pago > 0)
    : [];
  const coberturas = conPago.map((x) => x.ganancia / x.pago);

  // Mínimo de caja del dueño: cuánta plata propia tiene que tener además de
  // lo que pone el inversor.
  let acc = 0;
  let peor = 0;
  duenoFlows.forEach((f) => {
    acc += f;
    peor = Math.min(peor, acc);
  });

  return {
    proyecto: { ...flowMetrics(proyecto.flows, plan.tasaDescuento), valorFinal: proyecto.valorFinal, flows: proyecto.flows, meses: proyecto.meses },
    inversor: { ...flowMetrics(inversorFlows, deal?.tasaExigida ?? plan.tasaDescuento), flows: inversorFlows, cuota },
    dueno: { ...flowMetrics(duenoFlows, plan.tasaDescuento), flows: duenoFlows, capitalPropio: peor < 0 ? -peor : 0 },
    coberturaMinima: coberturas.length ? Math.min(...coberturas) : null,
    mesesSinCubrir: deal?.tipo === "prestamo" ? conPago.filter((x) => x.ganancia < x.pago).length : null,
  };
}
