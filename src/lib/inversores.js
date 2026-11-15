// Inversores y sus propuestas para la sucursal nueva.
// La sucursal es una sola (la que se arma en /nueva-sucursal); cada inversor
// tiene su propia propuesta: cuánto pone, cómo cobra, a qué plazo y contra qué
// tasa compara. Las cuentas están en inversion.js.
//
// Todo se guarda en pesos de hoy. El dólar es solo para mostrar.

import { branchCapacity, resolveBranchInputs, SCENARIOS, simulateBranch } from "./sucursal.js";
import { DEFAULT_PLAN, investorPlan } from "./inversion.js";

export const INVERSORES_STORAGE_KEY = "bandidos:inversores:v1";

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const DEAL_TIPOS = [
  { id: "participacion", label: "Participación en ganancias", corto: "Participación" },
  { id: "prestamo", label: "Préstamo con cuotas", corto: "Préstamo" },
  { id: "mixto", label: "Préstamo participativo", corto: "Mixto" },
];

export const ESTADOS = [
  { id: "borrador", label: "Borrador" },
  { id: "presentada", label: "Presentada" },
  { id: "negociando", label: "Negociando" },
  { id: "aceptada", label: "Aceptada" },
  { id: "rechazada", label: "No avanzó" },
];

// Perfiles con la propuesta que mejor les suele cerrar (ver el debate en
// docs/plan-inversion-sucursal.md).
export const PERFILES = [
  {
    id: "privado",
    label: "Inversor privado",
    hint: "Quiere ganarle claramente a un bono y ser algo socio.",
    deal: { tipo: "participacion", pct: 0.3, pctHastaRecuperar: 0.6 },
    tasaExigida: 0.2,
    horizonte: 60,
    valorFinalMeses: 12,
  },
  {
    id: "familiar",
    label: "Familia o amigo",
    hint: "Quiere que le devuelvan la plata y ganarle a un plazo fijo.",
    deal: { tipo: "prestamo", tasaAnual: 0.1, cuotas: 30, gracia: 6 },
    tasaExigida: 0.08,
    horizonte: 36,
    valorFinalMeses: 0,
  },
  {
    id: "banco",
    label: "Banco o crédito PyME",
    hint: "Mira que la cuota esté cubierta y pide garantía.",
    deal: { tipo: "prestamo", tasaAnual: 0.14, cuotas: 36, gracia: 3 },
    tasaExigida: 0.14,
    horizonte: 60,
    valorFinalMeses: 0,
  },
  {
    id: "mixto",
    label: "Socio con renta",
    hint: "Prefiere cobrar algo fijo todos los meses y una parte del resultado.",
    deal: { tipo: "mixto", tasaAnual: 0.07, cuotas: 36, gracia: 6, pct: 0.12 },
    tasaExigida: 0.15,
    horizonte: 60,
    valorFinalMeses: 12,
  },
];

export const DEFAULT_PROYECTO = { iibbPct: DEFAULT_PLAN.iibbPct, gananciasPct: DEFAULT_PLAN.gananciasPct };

// Compromisos que se le muestran al inversor al final, según la propuesta.
export function defaultCompromisos(tipo) {
  const comunes = [
    "Reporte mensual con ingresos, servicios, ocupación de agenda y lo que te corresponde, sacado del sistema de gestión.",
    "Acceso a los números de la sucursal cuando los quieras ver.",
  ];
  if (tipo === "prestamo") {
    return [
      "Cuotas fijas todos los meses, con los primeros meses de gracia mientras la sucursal arranca.",
      "Garantía del local que ya funciona: si la sucursal no llega, la cuota la cubre Bandidos.",
      ...comunes,
    ].join("\n");
  }
  if (tipo === "mixto") {
    return [
      "Una cuota fija baja todos los meses, más tu parte de la ganancia de la sucursal.",
      "La cuota fija tiene la garantía del local que ya funciona.",
      ...comunes,
      "Opción de recompra de tu parte al final del plazo, a un valor pactado de antemano.",
    ].join("\n");
  }
  return [
    "Cobrás primero: el porcentaje mayor hasta recuperar lo que pusiste, después el porcentaje acordado.",
    ...comunes,
    "Opción de recompra de tu parte al final del plazo, a un valor pactado de antemano.",
    "Los gastos que la sucursal comparte con el local actual (administración, Bandimóviles, marca) se reparten con una regla escrita desde el día uno.",
  ].join("\n");
}

let counter = 0;
function newId() {
  counter += 1;
  return `inv-${Date.now().toString(36)}-${counter}`;
}

// Inversor nuevo a partir de un perfil. El monto arranca en el 75% de la plata
// necesaria: conviene que Bandidos ponga una parte.
export function newInvestor(perfilId, { plataNecesaria = 0, now = new Date() } = {}) {
  const perfil = PERFILES.find((p) => p.id === perfilId) || PERFILES[0];
  const monto = Math.round((num(plataNecesaria) * 0.75) / 100_000) * 100_000;
  const fecha = now.toISOString();
  return normalizeInvestor({
    id: newId(),
    nombre: "",
    perfil: perfil.id,
    estado: "borrador",
    deal: { ...perfil.deal, monto },
    tasaExigida: perfil.tasaExigida,
    horizonte: perfil.horizonte,
    valorFinalMeses: perfil.valorFinalMeses,
    moneda: "ARS",
    tipoCambio: 0,
    compromisos: defaultCompromisos(perfil.deal.tipo),
    notas: "",
    creado: fecha,
    actualizado: fecha,
  });
}

// Completa lo que falte (datos viejos o importados) con valores razonables.
export function normalizeInvestor(raw) {
  const r = raw || {};
  const d = r.deal || {};
  const tipo = DEAL_TIPOS.some((t) => t.id === d.tipo) ? d.tipo : "participacion";
  return {
    id: String(r.id || newId()),
    nombre: String(r.nombre || ""),
    perfil: PERFILES.some((p) => p.id === r.perfil) ? r.perfil : "privado",
    estado: ESTADOS.some((e) => e.id === r.estado) ? r.estado : "borrador",
    deal: {
      tipo,
      monto: Math.max(0, num(d.monto)),
      tasaAnual: Math.max(0, num(d.tasaAnual ?? 0.12)),
      cuotas: Math.max(1, Math.round(num(d.cuotas) || 24)),
      gracia: Math.max(0, Math.round(num(d.gracia))),
      pct: Math.min(1, Math.max(0, num(d.pct ?? 0.3))),
      pctHastaRecuperar: d.pctHastaRecuperar === null ? null : Math.min(1, Math.max(0, num(d.pctHastaRecuperar ?? 0))) || null,
    },
    tasaExigida: Math.max(0, num(r.tasaExigida ?? 0.15)),
    horizonte: [36, 60].includes(Number(r.horizonte)) ? Number(r.horizonte) : 60,
    valorFinalMeses: Math.max(0, num(r.valorFinalMeses)),
    moneda: r.moneda === "USD" ? "USD" : "ARS",
    tipoCambio: Math.max(0, num(r.tipoCambio)),
    compromisos: typeof r.compromisos === "string" ? r.compromisos : defaultCompromisos(tipo),
    notas: String(r.notas || ""),
    creado: r.creado || null,
    actualizado: r.actualizado || null,
  };
}

export function parseStore(raw) {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") throw new Error("vacío");
    const lista = Array.isArray(data) ? data : data.inversores;
    return {
      proyecto: { ...DEFAULT_PROYECTO, ...(data.proyecto || {}) },
      inversores: (Array.isArray(lista) ? lista : []).map(normalizeInvestor),
    };
  } catch {
    return { proyecto: { ...DEFAULT_PROYECTO }, inversores: [] };
  }
}

export function serializeStore(store) {
  return JSON.stringify({ version: 1, proyecto: store.proyecto, inversores: store.inversores }, null, 2);
}

// Junta dos listas (importar): lo importado pisa al que tiene el mismo id.
export function mergeInvestors(actuales, importados) {
  const byId = new Map(actuales.map((i) => [i.id, i]));
  importados.forEach((i) => byId.set(i.id, i));
  return [...byId.values()];
}

// Supuestos de la sucursal tal como los usa la simulación.
export function branchFromSimulator(saved) {
  if (!saved?.inputs) return null;
  return { ...resolveBranchInputs(saved.inputs), capacidadMes: branchCapacity(saved.inputs) };
}

// Divisor para mostrar en dólares: con moneda USD y un tipo de cambio cargado.
export function currencyOf(investor) {
  const usd = investor?.moneda === "USD" && num(investor.tipoCambio) > 0;
  return { usd, divisor: usd ? num(investor.tipoCambio) : 1, simbolo: usd ? "US$" : "$" };
}

const cumulative = (values) => {
  let acc = 0;
  return values.map((v) => (acc += v));
};

// Todo lo que muestra una propuesta: lo del inversor, lo de Bandidos, la
// sucursal y los tres escenarios, con las series para los gráficos.
export function proposalView(branch, proyecto, investor) {
  const inv = normalizeInvestor(investor);
  const plan = {
    iibbPct: num(proyecto?.iibbPct),
    gananciasPct: num(proyecto?.gananciasPct),
    valorFinalMeses: inv.valorFinalMeses,
    tasaDescuento: DEFAULT_PLAN.tasaDescuento,
  };
  const deal = { ...inv.deal, tasaExigida: inv.tasaExigida };
  const horizon = inv.horizonte;

  const escenarios = SCENARIOS.map((s) => {
    const r = investorPlan(branch, plan, deal, { factor: s.factor, horizon });
    return { ...s, ...r, cobradoAcum: cumulative(r.pagos) };
  });
  const esperado = escenarios.find((s) => s.id === "esperado");
  const base = simulateBranch(branch, { horizon });

  const ticket = num(branch.ticket);
  const margenNeto = base.margen - ticket * plan.iibbPct;
  const equilibrio = margenNeto > 0 ? Math.ceil(num(branch.fijosMes) / margenNeto) : null;
  const inversion = Math.max(0, num(branch.inversion));
  // Plata necesaria: el peor momento de la caja acumulada (inversión más las
  // pérdidas del arranque).
  const plataNecesaria = Math.max(inversion, -Math.min(0, ...cumulative(esperado.proyecto.flows)));
  const monto = inv.deal.monto;
  const aporteBandidos = Math.max(0, plataNecesaria - monto);

  const meses = esperado.proyecto.meses.map((m, i) => ({
    month: m.month,
    servicios: m.servicios,
    ingresos: m.ingresos,
    ganancia: m.ganancia,
    cobro: esperado.pagos[i],
    cobrado: esperado.cobradoAcum[i],
    peor: escenarios[0].cobradoAcum[i],
    mejor: escenarios[2].cobradoAcum[i],
  }));

  const partes = branch.inversionPartes
    ? Object.entries(branch.inversionPartes).filter(([, v]) => num(v) > 0).map(([id, v]) => ({ id, monto: num(v) }))
    : inversion > 0 ? [{ id: "inversion", monto: inversion }] : [];
  const arranque = Math.max(0, plataNecesaria - inversion);
  const usoFondos = arranque > 0 ? [...partes, { id: "capitalArranque", monto: arranque }] : partes;

  return {
    investor: inv,
    plan,
    horizon,
    escenarios,
    esperado,
    meses,
    sucursal: {
      equilibrio,
      equilibrioDiario: equilibrio && num(branch.diasMes) > 0 ? equilibrio / num(branch.diasMes) : null,
      serviciosRegimen: base.serviciosRegimen,
      capacidad: base.capacidad,
      gananciaRegimen: esperado.proyecto.meses[esperado.proyecto.meses.length - 1]?.ganancia ?? 0,
      inversion,
      plataNecesaria,
      aporteInversor: Math.min(monto, plataNecesaria),
      aporteBandidos,
      usoFondos,
    },
    // Ganancia que le queda a Bandidos en el horizonte, después de pagarle al
    // inversor y contando la plata propia que puso.
    paraBandidos: {
      capitalPropio: esperado.dueno.capitalPropio,
      gananciaTotal: esperado.dueno.flows.reduce((t, f) => t + f, 0),
      cedido: esperado.inversor.recibido,
      coberturaMinima: esperado.coberturaMinima,
      mesesSinCubrir: esperado.mesesSinCubrir,
      capitalPropioPeor: escenarios[0].dueno.capitalPropio,
    },
  };
}

// La propuesta en palabras, para la diapositiva y la tarjeta.
export function dealSummary(investor, fmtMoney, fmtPct) {
  const d = investor.deal;
  if (d.tipo === "prestamo") {
    return `Préstamo de ${fmtMoney(d.monto)} al ${fmtPct(d.tasaAnual)} anual, en ${d.cuotas} cuotas`
      + (d.gracia > 0 ? ` con ${d.gracia} meses de gracia (solo interés).` : ".");
  }
  if (d.tipo === "mixto") {
    return `Aporte de ${fmtMoney(d.monto)}: cuota fija al ${fmtPct(d.tasaAnual)} anual en ${d.cuotas} cuotas`
      + `${d.gracia > 0 ? ` (${d.gracia} meses de gracia)` : ""} más el ${fmtPct(d.pct)} de la ganancia de la sucursal.`;
  }
  return d.pctHastaRecuperar
    ? `Aporte de ${fmtMoney(d.monto)} por el ${fmtPct(d.pctHastaRecuperar)} de la ganancia de la sucursal hasta recuperarlo y el ${fmtPct(d.pct)} después.`
    : `Aporte de ${fmtMoney(d.monto)} por el ${fmtPct(d.pct)} de la ganancia de la sucursal.`;
}
