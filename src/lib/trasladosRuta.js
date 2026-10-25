export const ESTADOS_TRAMO = {
  pendiente: "Pendiente", en_camino: "En camino", retirado: "Retirado",
  entregado: "Entregado", cancelado: "Cancelado",
};
export const SIGUIENTE_ESTADO = { pendiente: "en_camino", en_camino: "retirado", retirado: "entregado" };

export function faltantesParada(tramo) {
  return [!tramo.direccion?.trim() && "dirección", !tramo.chofer_id && "chofer", !tramo.vehiculo_id && "móvil"].filter(Boolean);
}

export function resumenRuta(items) {
  const operativas = items.filter((t) => t.estado !== "cancelado");
  return {
    total: operativas.length,
    pendientes: operativas.filter((t) => t.estado === "pendiente").length,
    enViaje: operativas.filter((t) => t.estado === "en_camino" || t.estado === "retirado").length,
    completadas: operativas.filter((t) => t.estado === "entregado").length,
    porPreparar: operativas.filter((t) => t.estado !== "entregado" && faltantesParada(t).length > 0).length,
  };
}

export function coincideVistaRuta(tramo, vista) {
  if (tramo.estado === "cancelado") return false;
  if (vista === "pendientes") return tramo.estado === "pendiente";
  if (vista === "enViaje") return tramo.estado === "en_camino" || tramo.estado === "retirado";
  if (vista === "completadas") return tramo.estado === "entregado";
  return true;
}

export function gruposDeRuta(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.chofer_id || "sin-chofer"}/${item.vehiculo_id || "sin-movil"}`;
    if (!groups.has(key)) groups.set(key, { key, chofer: item.chofer_nombre || "Sin chofer", vehiculo: item.vehiculo_nombre || "Sin móvil", chofer_id: item.chofer_id, vehiculo_id: item.vehiculo_id, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

export function moverParada(items, index, delta) {
  const target = index + delta;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
