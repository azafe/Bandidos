// Cálculo para abrir otra sucursal.
// 1) diagnoseLocal: con los números reales del local actual, ¿está listo para
//    abrir otro? Mira rentabilidad, agenda, crecimiento y ahorro.
// 2) simulateBranch: con los supuestos de la sucursal nueva, mes a mes,
//    cuándo llega al equilibrio y cuándo recupera la inversión.
// Son cuentas de gestión para decidir, no un plan contable: no incluyen
// impuestos, inflación ni financiación.

export const HORIZON_MONTHS = 36;

// Sin agenda para medir, lo que suele atender un peluquero en un día.
export const DEFAULT_TURNOS = 6;
// Quien trabajó menos de esta parte de los días abiertos no cuenta como
// peluquero del local (reemplazos, pruebas, alguien que se fue).
const MIN_PARTE_DIAS = 0.25;

const SUPPLY_CATEGORY = /insumo|afilad|cuchill/i;

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
    // Solo insumos de peluquería cuando se pueden separar: los gastos diarios
    // también traen mercadería del PetShop y personal.
    variablePorServicio: servicios > 0 ? Math.round(num(local?.insumosMes ?? local?.gastosDiariosMes) / servicios) : 0,
    serviciosMes: Math.round(servicios),
    arranquePct: 0.4,
    mesesRampa: 6,
    groomers: Math.max(1, Math.round(num(local?.groomers)) || 1),
    turnosPorGroomer: num(local?.turnosPorGroomer) || DEFAULT_TURNOS,
    diasMes: Math.round(num(local?.diasMes)) || 24,
  };
}

// Gastos que dependen de cada servicio: las categorías de insumos y afilado.
// Si el local no usa esas categorías, se toman todos los gastos diarios.
export function supplyExpenses(expenses, categories) {
  const names = new Map((categories || []).map((c) => [String(c.id), c.name || ""]));
  const nameOf = (e) => e.category?.name || e.category_name || names.get(String(e.category_id ?? e.category?.id)) || "";
  const matched = (expenses || []).filter((e) => SUPPLY_CATEGORY.test(nameOf(e)));
  if (matched.length === 0) {
    return { total: (expenses || []).reduce((t, e) => t + num(e.amount), 0), categorias: [], separado: false };
  }
  return {
    total: matched.reduce((t, e) => t + num(e.amount), 0),
    categorias: [...new Set(matched.map(nameOf))],
    separado: true,
  };
}

// Cómo trabajó cada peluquero en el período, a partir de los turnos hechos.
// turnos: [{ date, groomerId, secondGroomerId }]; un turno compartido ocupa a los dos.
// people: [{ id, name }]. diasAbiertos: días con turnos en el período.
// turnosTope: lo que hacen en sus días más cargados (percentil 90 de turnos
// por peluquero por día), para usar como capacidad realista.
export function groomerLoad(turnos, people, { diasAbiertos }) {
  const byPerson = new Map((people || []).map((p) => [String(p.id), { id: String(p.id), name: p.name, porDia: new Map() }]));
  (turnos || []).forEach((t) => {
    [t.groomerId, t.secondGroomerId].forEach((id) => {
      const person = id === null || id === undefined ? null : byPerson.get(String(id));
      if (person) person.porDia.set(t.date, (person.porDia.get(t.date) || 0) + 1);
    });
  });

  const minDias = Math.max(1, Math.ceil(num(diasAbiertos) * MIN_PARTE_DIAS));
  const detalle = [...byPerson.values()]
    .filter((p) => p.porDia.size > 0)
    .map((p) => {
      const counts = [...p.porDia.values()];
      return {
        id: p.id,
        name: p.name,
        dias: counts.length,
        promedio: counts.reduce((a, b) => a + b, 0) / counts.length,
        maximo: Math.max(...counts),
        cuenta: counts.length >= minDias,
      };
    })
    .sort((a, b) => b.dias - a.dias);

  const activos = detalle.filter((p) => p.cuenta);
  const dias = activos.flatMap((p) => [...byPerson.get(p.id).porDia.values()]).sort((a, b) => a - b);
  const turnosTope = dias.length > 0 ? dias[Math.ceil(dias.length * 0.9) - 1] : null;
  return {
    detalle,
    peluqueros: activos.length,
    turnosTope,
    minDias,
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
    const g = Math.round(num(local.groomers));
    const cuenta = `Hacen ${Math.round(num(local.serviciosMes))} turnos por mes y entran ${Math.round(capacidad)} `
      + `(${g} ${g === 1 ? "peluquero" : "peluqueros"} × ${Number(num(local.turnosPorGroomer).toFixed(1))} turnos × ${Math.round(num(local.diasMes))} días).`;
    const detail = {
      ok: `${cuenta} La agenda está al ${pctText(ocupacion)}: probablemente hay clientes que no entran.`,
      warn: `${cuenta} La agenda está al ${pctText(ocupacion)}: todavía hay lugar para crecer en este local.`,
      bad: `${cuenta} La agenda está al ${pctText(ocupacion)}: antes de abrir otro, conviene llenar este.`,
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

  // Los puntos que explican el veredicto: los rojos si hay, si no los amarillos
  // y los que no tienen datos.
  const motivos = verdict === "bad"
    ? checks.filter((c) => c.status === "bad")
    : verdict === "warn" ? checks.filter((c) => c.status !== "ok") : [];

  return { checks, verdict, motivos, ocupacion, crecimiento, mesesAhorro };
}
