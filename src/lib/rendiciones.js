export const formatoRendicion = (v) => v === null || v === undefined ? "Pendiente" : Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
export const sentidoSaldo = (v) => v === null || v === undefined ? "Saldo pendiente de revisión" : v > 0 ? "Debe entregar al local" : v < 0 ? "El local debe pagarle" : "Sin saldo pendiente";
export const fechaRendicion = (v) => v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—";
