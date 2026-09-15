// src/utils/colorPalette.js
// Paleta compartida para los "avatares" de color: por nombre (mascotas,
// proveedores, empleados, hash estable) o por posición (categorías, tipos
// de servicio). Antes vivía duplicada -mismos 8 a 10 hex- en 9 páginas
// distintas, con la función de hash copiada y pegada en 6 de ellas.
export const COLOR_PALETTE = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
  "#6366f1", "#ec4899",
];

export function colorForName(name) {
  if (!name) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}
