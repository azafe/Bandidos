// Cálculo para abrir otra sucursal.
// 1) diagnoseLocal: con los números reales del local actual, ¿está listo para
//    abrir otro? Mira rentabilidad, agenda, crecimiento y ahorro.
// 2) simulateBranch: con los supuestos de la sucursal nueva, mes a mes,
//    cuándo llega al equilibrio y cuándo recupera la inversión.
// Son cuentas de gestión para decidir, no un plan contable: no incluyen
// impuestos, inflación ni financiación.

export const HORIZON_MONTHS = 36;

export const SCENARIOS = [
  { id: "pesimista", label: "Si va peor", factor: 0.7 },
  { id: "esperado", label: "Esperado", factor: 1 },
  { id: "optimista", label: "Si va mejor", factor: 1.2 },
];

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Ganancia por servicio después de pagar comisión e insumos.
export function unitMargin({ ticket, comision, variablePorServicio }) {
  return num(ticket) * (1 - num(comision)) - num(variablePorServicio);
}

// Proporción de la demanda esperada en el mes m (1 = primer mes abierto).
// Arranca en `arranquePct` y sube en línea recta hasta 100% en el mes
// mesesRampa + 1.
export function rampFactor(month, { arranquePct, mesesRampa }) {
  const ramp = Math.max(0, Math.round(num(mesesRampa)));
  const start = Math.min(1, Math.max(0, num(arranquePct)));
  if (ramp === 0) return 1;
  return start + (1 - start) * Math.min(1, (month - 1) / ramp);
}

export function simulateBranch(inputs, { factor = 1, horizon = HORIZON_MONTHS } = {}) {
  const inversion = Math.max(0, num(inputs.inversion));
  const fijos = Math.max(0, num(inputs.fijosMes));
  const margen = unitMargin(inputs);
  const serviciosRegimen = Math.max(0, num(inputs.serviciosMes)) * factor;

  const equilibrio = margen > 0 ? Math.ceil(fijos / margen) : null;
  const gananciaRegimen = serviciosRegimen * margen - fijos;

  const months = [];
  let acumulado = -inversion;
  let peorCaja = acumulado;
  let recupero = null;
  let primerMesPositivo = null;
  for (let m = 1; m <= horizon; m += 1) {
    const servicios = serviciosRegimen * rampFactor(m, inputs);
    const ganancia = servicios * margen - fijos;
    acumulado += ganancia;
    peorCaja = Math.min(peorCaja, acumulado);
    if (primerMesPositivo === null && ganancia >= 0) primerMesPositivo = m;
    if (recupero === null && acumulado >= 0 && (inversion > 0 || ganancia > 0)) recupero = m;
    months.push({ month: m, servicios, ganancia, acumulado });
  }

  const capacidad = num(inputs.capacidadMes);
  return {
    margen,
    equilibrio,
    equilibrioDiario: equilibrio !== null && num(inputs.diasMes) > 0 ? equilibrio / num(inputs.diasMes) : null,
    serviciosRegimen,
    gananciaRegimen,
    // Plata que hay que tener: la inversión más lo que se pierde mientras la
    // sucursal arranca, hasta que deja de restar.
    capitalNecesario: Math.max(inversion, -peorCaja),
    primerMesPositivo,
    recupero,
    excedeCapacidad: capacidad > 0 && serviciosRegimen > capacidad,
    capacidad: capacidad > 0 ? capacidad : null,
    months,
  };
}

export function simulateScenarios(inputs) {
  return SCENARIOS.map((scenario) => ({ ...scenario, ...simulateBranch(inputs, { factor: scenario.factor }) }));
}

// Valores iniciales del simulador a partir del local actual (por mes).
export function defaultBranchInputs(local) {
  const servicios = num(local?.serviciosMes);
  return {
    inversion: 0,
    fijosMes: Math.round(num(local?.fijosMes)),
    ticket: Math.round(num(local?.ticket)),
    comision: local?.comision ?? 0.4,
    variablePorServicio: servicios > 0 ? Math.round(num(local?.gastosDiariosMes) / servicios) : 0,
    serviciosMes: Math.round(servicios),
    arranquePct: 0.4,
    mesesRampa: 6,
    groomers: Math.max(1, Math.round(num(local?.groomers)) || 1),
    turnosPorGroomer: num(local?.turnosPorGroomer) || 6,
    diasMes: Math.round(num(local?.diasMes)) || 24,
  };
}

export function branchCapacity({ groomers, turnosPorGroomer, diasMes }) {
  return Math.max(0, num(groomers)) * Math.max(0, num(turnosPorGroomer)) * Math.max(0, num(diasMes));
}

// status: ok | warn | bad | unknown
function check(id, title, status, detail) {
  return { id, title, status, detail };
}

const pctText = (value) => `${Math.round(value * 100)}%`;

// local: promedios mensuales del local actual.
//   ingresosMes, gananciaMes, margen, serviciosMes, diasMes, groomers,
//   turnosPorGroomer, ingresosMesAnterior (de los 3 meses previos, o null).
// capitalNecesario: lo que pide la sucursal simulada (0 si no se cargó).
export function diagnoseLocal(local, { capitalNecesario = 0 } = {}) {
  const checks = [];
  const ingresos = num(local.ingresosMes);
  const ganancia = num(local.gananciaMes);
  const margen = num(local.margen);

  if (ingresos <= 0) {
    checks.push(check("rentabilidad", "Gana plata", "unknown", "Sin ingresos registrados en estos meses."));
  } else {
    const status = margen >= 0.15 ? "ok" : margen >= 0.05 ? "warn" : "bad";
    const detail = {
      ok: `Queda ${pctText(margen)} de cada peso que entra. Hay margen para absorber el arranque de otra sucursal.`,
      warn: `Queda ${pctText(margen)} de cada peso que entra. Es poco colchón si la nueva tarda en arrancar.`,
      bad: margen < 0
        ? `Hoy el local pierde plata (${pctText(margen)}). Conviene ordenarlo antes de abrir otro.`
        : `Queda solo ${pctText(margen)} de cada peso que entra. Conviene mejorar precios o costos primero.`,
    }[status];
    checks.push(check("rentabilidad", "Gana plata", status, detail));
  }

  const capacidad = branchCapacity(local);
  const ocupacion = capacidad > 0 ? num(local.serviciosMes) / capacidad : null;
  if (ocupacion === null) {
    checks.push(check("agenda", "Agenda llena", "unknown", "Cargá peluqueros y turnos por día para calcular la ocupación."));
  } else {
    const status = ocupacion >= 0.8 ? "ok" : ocupacion >= 0.6 ? "warn" : "bad";
    const detail = {
      ok: `La agenda está al ${pctText(ocupacion)}. Probablemente hay clientes que no entran.`,
      warn: `La agenda está al ${pctText(ocupacion)}. Todavía hay lugar para crecer en este local.`,
      bad: `La agenda está al ${pctText(ocupacion)}. Antes de abrir otro, conviene llenar este.`,
    }[status];
    checks.push(check("agenda", "Agenda llena", status, detail));
  }

  const anterior = local.ingresosMesAnterior === null || local.ingresosMesAnterior === undefined
    ? null
    : num(local.ingresosMesAnterior);
  const crecimiento = anterior && anterior > 0 ? ingresos / anterior - 1 : null;
  if (crecimiento === null) {
    checks.push(check("crecimiento", "Viene creciendo", "unknown", "No hay datos de los 3 meses anteriores para comparar."));
  } else {
    const status = crecimiento >= 0.05 ? "ok" : crecimiento >= -0.05 ? "warn" : "bad";
    const signed = `${crecimiento >= 0 ? "+" : ""}${pctText(crecimiento)}`;
    const detail = {
      ok: `Los ingresos crecieron ${signed} contra los 3 meses anteriores.`,
      warn: `Los ingresos están estables (${signed}) contra los 3 meses anteriores.`,
      bad: `Los ingresos bajaron ${signed} contra los 3 meses anteriores.`,
    }[status];
    checks.push(check("crecimiento", "Viene creciendo", status, detail));
  }

  let mesesAhorro = null;
  if (num(capitalNecesario) <= 0) {
    checks.push(check("ahorro", "Puede bancar la inversión", "unknown", "Cargá la inversión en el simulador para saber cuánto tarda en juntarla."));
  } else if (ganancia <= 0) {
    checks.push(check("ahorro", "Puede bancar la inversión", "bad", "Con la ganancia actual no se puede ahorrar para la sucursal nueva."));
  } else {
    mesesAhorro = Math.ceil(num(capitalNecesario) / ganancia);
    const status = mesesAhorro <= 12 ? "ok" : mesesAhorro <= 24 ? "warn" : "bad";
    checks.push(check("ahorro", "Puede bancar la inversión", status,
      `Con la ganancia actual, juntar el capital necesario lleva ${mesesAhorro} ${mesesAhorro === 1 ? "mes" : "meses"} de ganancia completa.`));
  }

  const known = checks.filter((c) => c.status !== "unknown");
  let verdict;
  if (known.length === 0) verdict = "unknown";
  else if (known.some((c) => c.status === "bad")) verdict = "bad";
  else if (known.some((c) => c.status === "warn") || known.length < checks.length) verdict = "warn";
  else verdict = "ok";

  return { checks, verdict, ocupacion, crecimiento, mesesAhorro };
}
