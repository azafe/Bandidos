import assert from "node:assert/strict";
import test from "node:test";
import { gruposDeRuta, moverParada, SIGUIENTE_ESTADO, resumenRuta, coincideVistaRuta, faltantesParada } from "./trasladosRuta.js";
import { bandimovilWhatsAppLink, buildMensajeBandimovil } from "../utils/whatsapp.js";
import { mapsLink } from "./booking/format.js";

test("la hoja de ruta conserva el orden del servidor y separa choferes y móviles", () => {
  const items = [
    { id: "a", chofer_id: "jorge", vehiculo_id: "uno" },
    { id: "b", chofer_id: "cesar", vehiculo_id: "uno" },
    { id: "c", chofer_id: "jorge", vehiculo_id: "dos" },
    { id: "d", chofer_id: "jorge", vehiculo_id: "uno" },
    { id: "e", chofer_id: null, vehiculo_id: null },
  ];
  const groups = gruposDeRuta(items);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups[0].items.map((t) => t.id), ["a", "d"]);
  assert.equal(groups[3].chofer, "Sin chofer");
  assert.equal(groups[3].vehiculo, "Sin móvil");
  assert.deepEqual(moverParada(groups[0].items, 0, 1).map((t) => t.id), ["d", "a"]);
  assert.deepEqual(groups[0].items.map((t) => t.id), ["a", "d"]);
  assert.equal(moverParada(items, 0, -1), items);
  assert.equal(SIGUIENTE_ESTADO.entregado, undefined);
});

test("el avance excluye cancelaciones y diferencia paradas por salir, en viaje y completadas", () => {
  const ready = { direccion: "San Martín 100", chofer_id: "jorge", vehiculo_id: "uno" };
  const items = [
    { id: "a", estado: "pendiente", ...ready },
    { id: "b", estado: "en_camino", ...ready },
    { id: "c", estado: "retirado", ...ready },
    { id: "d", estado: "entregado" },
    { id: "e", estado: "cancelado" },
    { id: "f", estado: "pendiente", direccion: "  " },
  ];
  assert.deepEqual(resumenRuta(items), { total: 5, pendientes: 2, enViaje: 2, completadas: 1, porPreparar: 1 });
  assert.deepEqual(items.filter((t) => coincideVistaRuta(t, "enViaje")).map((t) => t.id), ["b", "c"]);
  assert.deepEqual(items.filter((t) => coincideVistaRuta(t, "completadas")).map((t) => t.id), ["d"]);
  assert.deepEqual(items.filter((t) => coincideVistaRuta(t, "pendientes")).map((t) => t.id), ["a", "f"]);
  assert.deepEqual(items.filter((t) => coincideVistaRuta(t, "todas")).map((t) => t.id), ["a", "b", "c", "d", "f"]);
  assert.deepEqual(resumenRuta([]), { total: 0, pendientes: 0, enViaje: 0, completadas: 0, porPreparar: 0 });
  assert.deepEqual(faltantesParada(items[5]), ["dirección", "chofer", "móvil"]);
  assert.deepEqual(faltantesParada(ready), []);
});

test("Maps y WhatsApp usan el destino del tramo, validan teléfonos y preparan el aviso", () => {
  const address = "San Martín 100 & esquina #2";
  assert.equal(new URL(mapsLink(address)).searchParams.get("query"), address);
  assert.equal(mapsLink(""), null);
  for (const phone of ["011 15-1234-5678", "+54 9 11 1234-5678", "+54 11 1234-5678", "11 1234-5678"]) {
    const url = new URL(bandimovilWhatsAppLink(phone, "Ana Pérez", "Luna & Sol", "busqueda"));
    assert.equal(url.pathname, "/5491112345678");
    assert.equal(url.searchParams.get("text"), "Hola Ana! 🐾 El Bandimóvil está llegando para buscar Luna & Sol.");
  }
  for (const phone of [null, "", "1234", "sin teléfono"]) assert.equal(bandimovilWhatsAppLink(phone, "Ana", "Luna", "entrega"), null);
  assert.match(buildMensajeBandimovil(null, null, "entrega"), /llevar de vuelta a tu mascota/);
});
