export function guiaKey(user) {
  return `bandidos:bandimoviles:guia:v1:${user.tenant_id}:${user.id}`;
}

export function leerGuia(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (Number.isInteger(value?.paso) && value.paso >= 0 && value.paso <= 3
      && ["activa", "pausada", "terminada"].includes(value.estado)) return value;
  } catch { /* El almacenamiento puede estar deshabilitado. */ }
  return { paso: 0, estado: "activa" };
}

export function guardarGuia(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* La guía sigue funcionando en esta visita. */ }
}

export const NUEVO_TRASLADO = "/agenda?nuevoTurno=1&traslado=1";
