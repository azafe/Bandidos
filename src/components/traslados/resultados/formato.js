export const monto = (value) => value === null || value === undefined ? "Por definir"
  : Number(value).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 });

export const numero = (value) => value === null || value === undefined ? "—"
  : Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 });
