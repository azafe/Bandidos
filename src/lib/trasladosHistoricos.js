export function importeHistorico(value) {
  return value == null ? "Sin importe registrado" : `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function estadoTurnoHistorico(status) {
  return { finished: "Finalizado", reserved: "Reservado", cancelled: "Cancelado", no_show: "Ausente" }[status] || "Sin estado registrado";
}
