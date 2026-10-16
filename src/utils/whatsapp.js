import { isValidArPhone, normalizeArPhone } from "../lib/booking/format.js";

export const limpiarTelefono = (tel) => {
  if (!tel) return "";
  const limpio = String(tel).replace(/[\s\-\(\)\+]/g, "");
  return limpio.startsWith("549") ? limpio : `549${limpio}`;
};

export const buildMensajeTurno = (ownerName, petName, dias) =>
  `Hola ${ownerName.split(" ")[0]}! 🐾 Hace ${dias} días que ${petName} no visita Bandidos Peluquería. ¿Querés reservar un turno? Escribinos y coordinamos! 😊`;

export const buildMensajeCumpleanos = (ownerName, petName, edad) =>
  `Hola ${ownerName.split(" ")[0]}! 🎂 Hoy ${petName} ${edad ? `cumple ${edad} años` : "está de cumpleaños"} y desde Bandidos Peluquería queremos felicitarlos! 🐾 Como regalo de cumpleaños te ofrecemos un descuento especial en su próximo baño. ¡Escribinos para coordinar! 🎉`;

export function buildMensajeBandimovil(ownerName, petName, tipo) {
  const nombre = String(ownerName || "").trim().split(/\s+/)[0];
  const mascota = String(petName || "tu mascota").trim();
  return `Hola${nombre ? ` ${nombre}` : ""}! 🐾 El Bandimóvil está llegando para ${tipo === "busqueda" ? "buscar" : "llevar de vuelta a"} ${mascota}.`;
}

export function bandimovilWhatsAppLink(phone, ownerName, petName, tipo) {
  if (!isValidArPhone(phone)) return null;
  return `https://wa.me/${limpiarTelefono(normalizeArPhone(phone))}?text=${encodeURIComponent(buildMensajeBandimovil(ownerName, petName, tipo))}`;
}
