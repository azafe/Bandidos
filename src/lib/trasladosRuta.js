export const ESTADOS_TRAMO = {
  pendiente: "Pendiente", en_camino: "En camino", retirado: "Retirado",
  entregado: "Entregado", cancelado: "Cancelado",
};
export const SIGUIENTE_ESTADO = { pendiente: "en_camino", en_camino: "retirado", retirado: "entregado" };

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
