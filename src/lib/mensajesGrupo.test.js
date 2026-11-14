import assert from "node:assert/strict";
import test from "node:test";
import { etiquetaDiaGrupo, textoHorariosLibres, textoTrasladosDia } from "./mensajesGrupo.js";

test("las etiquetas de día marcan hoy y mañana", () => {
  assert.equal(etiquetaDiaGrupo("2026-11-13", "2026-11-13"), "Hoy viernes 13/11");
  assert.equal(etiquetaDiaGrupo("2026-11-14", "2026-11-13"), "Mañana sábado 14/11");
  assert.equal(etiquetaDiaGrupo("2026-12-01", "2026-11-30"), "Mañana martes 1/12");
  assert.equal(etiquetaDiaGrupo("2026-11-18"), "miércoles 18/11");
});

test("los traslados se agrupan por chofer en el orden de la ruta y omiten cancelados", () => {
  const base = { chofer_id: "j", vehiculo_id: "m", chofer_nombre: "Jorge", vehiculo_nombre: "Kangoo" };
  const texto = textoTrasladosDia("2026-11-12", [
    { ...base, tipo: "busqueda", estado: "entregado", hora_programada: "09:00:00", direccion: "Catamarca 1121", owner_name: "Graciela", owner_phone: "381 555-5095", pet_name: "Coco" },
    { ...base, tipo: "entrega", estado: "pendiente", hora_programada: "12:30:00", direccion: "", owner_name: "", owner_phone: "", pet_name: "Bambam", notas: "Caniche nuevo" },
    { ...base, tipo: "busqueda", estado: "cancelado", pet_name: "Olivia" },
    { tipo: "busqueda", estado: "pendiente", pet_name: "Jazmín", direccion: "Pasaje Pío" },
  ]);
  assert.match(texto, /^\*TRASLADOS JUEVES 12\/11\*/);
  assert.match(texto, /🚗 \*Jorge\* · Kangoo/);
  assert.match(texto, /\*09:00\* · Buscar .*✅\nDirección: Catamarca 1121\nDueño: Graciela · 381 555-5095\nBandido: Coco/);
  assert.match(texto, /\*12:30\* · Llevar a casa.*\nDirección: ⚠️ falta cargar\nDueño: Sin registrar\nBandido: Bambam\nNota: Caniche nuevo/);
  assert.doesNotMatch(texto, /Olivia/);
  assert.match(texto, /🚗 \*Sin chofer asignado\*\n\n\*Sin horario\*/);
  assert.ok(texto.indexOf("Jorge") < texto.indexOf("Sin chofer"));
});

test("un día sin traslados lo dice", () => {
  assert.equal(textoTrasladosDia("2026-11-15", [{ estado: "cancelado" }]), "*TRASLADOS DOMINGO 15/11*\n\nNo hay traslados agendados.");
});

test("los horarios libres listan cada día, distinguen cerrado de completo y suman el link", () => {
  const texto = textoHorariosLibres([
    { date: "2026-11-12", status: "open", slots: ["09:00", "10:00", "12:30", "15:00"] },
    { date: "2026-11-13", status: "full", slots: [] },
    { date: "2026-11-15", status: "closed", slots: [] },
  ], { hoyISO: "2026-11-12", servicio: "Baño y corte", link: "https://bandidos.app/reservar/bandidos" });
  assert.equal(texto, [
    "*Horarios libres* · Baño y corte",
    "",
    "*Hoy jueves 12/11:* 09:00 · 10:00 · 12:30 · 15:00",
    "*Mañana viernes 13/11:* Sin lugar",
    "*Domingo 15/11:* Cerrado",
    "",
    "Reservá acá 👉 https://bandidos.app/reservar/bandidos",
  ].join("\n"));
  assert.match(textoHorariosLibres([]), /No hay días disponibles/);
});
