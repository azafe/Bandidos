const TRASLADO_FIELDS = ["traslado", "traslado_direccion", "traslado_amount", "traslado_bonificado"];

export function getTrasladoError(turno) {
  if (!turno.traslado) return "";
  const amount = Number(turno.traslado_amount);
  if (!Number.isFinite(amount) || amount < 0) return "Cargá un monto válido para el traslado.";
  if (turno.traslado_bonificado === true) {
    return amount === 0 ? "" : "Un traslado bonificado debe tener monto cero.";
  }
  return amount > 0 ? "" : "Cargá el monto del traslado o marcá Bonificado.";
}

export function getTrasladoPayload(form, previous) {
  const payload = {
    traslado: form.traslado,
    traslado_direccion: form.traslado ? form.traslado_direccion.trim() || null : null,
    traslado_amount: form.traslado && !form.traslado_bonificado ? Number(form.traslado_amount || 0) : 0,
    traslado_bonificado: form.traslado ? form.traslado_bonificado : false,
  };
  // Una edición de notas o del servicio no debe reclasificar ceros históricos.
  // El NULL se omite: la API solo recibe una decisión cuando el usuario la toma.
  return Object.fromEntries(TRASLADO_FIELDS.filter((field) => {
    if (field === "traslado_bonificado" && payload[field] == null) return false;
    if (!previous) return true;
    const old = field === "traslado_amount" ? Number(previous[field] || 0) : previous[field];
    return payload[field] !== old;
  }).map((field) => [field, payload[field]]));
}
