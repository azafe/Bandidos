export const MOTIVOS_RESULTADO = {
  categorias_sin_elegir: "Elegí las categorías que contienen gastos del vehículo.",
  gastos_sin_revisar: "Revisá y confirmá que están cargados los gastos del mes, incluidos los que pagaron los socios.",
  gastos_fijos_estimados: "Hay gastos fijos históricos estimados. Revisá sus importes antes de evaluar el resultado.",
  historicos_sin_costos: "Hay traslados del formato anterior sin condiciones económicas conocidas; su importe figura aparte.",
  pago_sin_definir: "Hay traslados sin modelo de pago al chofer definido.",
  cobros_con_operacion_pendiente: "Hay cobros de traslados cuya operación todavía no terminó.",
  operaciones_en_curso: "Hay viajes con tramos realizados que todavía no terminaron. Su costo completo sigue pendiente.",
  traslados_sin_cobrar: "Hay traslados realizados que todavía no tienen un cobro registrado.",
  jornales_sin_chofer: "Hay tramos con jornal pero sin chofer asignado.",
  jornales_sin_registrar: "Falta registrar al menos un jornal por chofer y día trabajado.",
  referencia_sin_definir: "Hay traslados sin costo de chofer de referencia.",
  referencia_sin_chofer: "Falta el chofer para calcular la referencia por día.",
  referencias_diarias_incompatibles: "Un mismo chofer y día tiene distintas referencias. Hace falta revisar esas condiciones.",
  importes_sin_distribuir: "Hay ingresos, jornales o gastos sin distribuir entre móviles.",
  referencia_sin_distribuir: "Hay costos de referencia compartidos entre móviles sin un reparto definido.",
};

// El simulador trabaja con un mes y un precio por viaje completo. Los campos
// vacíos siguen pendientes: convertirlos a cero inventaría un escenario.
export function simularMovil({ precio, dias, costoFijo, costoVariable, modelo, valorChofer }) {
  const raw = [precio, dias, costoFijo, costoVariable, ...(modelo === "ninguno" ? [] : [valorChofer])];
  if (raw.some((v) => v === "" || v === null || v === undefined)) return { estado: "pendiente" };
  const [p, d, fijo, variable] = raw.slice(0, 4).map(Number);
  const chofer = modelo === "ninguno" ? 0 : Number(valorChofer);
  if (![p, d, fijo, variable, chofer].every(Number.isFinite) || p <= 0 || !Number.isInteger(d) || d < 1 || d > 31 || fijo < 0 || variable < 0 || chofer < 0 || !["ninguno", "porcentaje", "jornal"].includes(modelo) || (modelo === "porcentaje" && chofer > 100)) return { estado: "invalido" };
  const margen = p - variable - (modelo === "porcentaje" ? p * chofer / 100 : 0);
  const fijos = fijo + (modelo === "jornal" ? d * chofer : 0);
  if (margen <= 0) return { estado: "sin_margen", margen, fijos };
  const porMes = Math.ceil(Math.max(0, fijos / margen - 1e-10));
  return { estado: "calculado", margen, fijos, porMes, promedioDiario: porMes / d, porDia: Math.ceil(porMes / d) };
}
