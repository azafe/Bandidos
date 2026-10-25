import { newTramos } from "./traslados.js";

const SHARED = ["direccion", "chofer_id", "vehiculo_id"];
export function compartirTramo(origen, destino) {
  return { ...destino, ...Object.fromEntries(SHARED.map((key) => [key, origen[key] ?? (key === "direccion" ? "" : null)])) };
}

export function patchTramosDraft(tramos, tipo, cambios, compartir) {
  return tramos.map((t) => t.tipo === tipo || compartir ? { ...t, ...cambios } : t);
}

export function seleccionarTramos(tramos, guardados, modo, diferentes) {
  const tipos = modo === "ambos" ? ["busqueda", "entrega"] : [modo];
  const base = tramos.find((t) => t.tipo === "busqueda") || tramos[0];
  const defaults = newTramos();
  return tipos.map((tipo) => {
    const tramo = tramos.find((t) => t.tipo === tipo) || guardados[tipo] || defaults.find((t) => t.tipo === tipo);
    return modo === "ambos" && !diferentes && base ? compartirTramo(base, tramo) : { ...tramo };
  });
}
