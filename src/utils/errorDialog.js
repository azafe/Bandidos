// src/utils/errorDialog.js
// Reemplaza al alert() nativo del navegador para los errores de la API,
// mostrando un cartel propio del panel con opción de avisarle a soporte.
const SUPPORT_WHATSAPP = "5493813846340";

let listener = null;

export function setErrorDialogListener(fn) {
  listener = fn;
}

// err viene de apiClient (Error con .message / .status). fallbackMessage es
// el texto que antes se usaba como segundo argumento de alert(err.message || "...").
export function showApiError(err, fallbackMessage) {
  const message = err?.message || fallbackMessage || "Ocurrió un error inesperado.";
  const status = err?.status ?? null;
  if (listener) {
    listener({ message, status });
  } else {
    // Por si el cartel todavía no montó (raro, pero mejor no perder el aviso).
    window.alert(message);
  }
}

export function buildSupportWhatsAppUrl({ message, status }) {
  const lines = [
    "Hola! Encontré un error en el panel de Bandidos.",
    `Mensaje: "${message}"`,
  ];
  if (status) lines.push(`Código: ${status}`);
  lines.push(`Pantalla: ${window.location.pathname}`);
  lines.push(`Fecha: ${new Date().toLocaleString("es-AR")}`);
  const text = lines.join("\n");
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
