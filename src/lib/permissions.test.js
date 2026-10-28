import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_ONLY, canAccess, fallbackModules, landingPath, roleLabel, visibleNav } from "./permissions.js";

const admin = { is_admin: true, modules: [] };
const staff = { is_admin: false, modules: fallbackModules("staff") };
const peluquero = { is_admin: false, modules: ["agenda", "mascotas"] };

test("el admin ve todo; los demás, lo de su rol", () => {
  assert.equal(canAccess(admin, ADMIN_ONLY), true);
  assert.equal(canAccess(admin, "gastos_fijos"), true);
  assert.equal(canAccess(staff, ADMIN_ONLY), false);
  assert.equal(canAccess(staff, "caja"), true);
  assert.equal(canAccess(staff, "inicio"), false);
  assert.equal(canAccess(null, "agenda"), false);
  assert.equal(canAccess({ driver: true, modules: [] }, "bandimoviles"), true);
  assert.equal(canAccess({ driver: true, modules: ["agenda"] }, "agenda"), false);
});

test("el menú de Staff es el mismo que veía antes", () => {
  assert.deepEqual(visibleNav(staff).map((i) => i.label), [
    "Agenda", "Bandimóviles", "Comunicaciones", "Mascotas", "PetShop",
    "Rendición de Caja", "Gastos Diarios", "Tipos de Servicio",
  ]);
  assert.ok(visibleNav(admin).some((i) => i.to === "/admin/permisos"));
});

test("el interruptor del local también apaga ítems", () => {
  assert.deepEqual(visibleNav(peluquero, { agenda: false }).map((i) => i.to), ["/pets"]);
});

test("cada uno entra a la primera pantalla que puede abrir", () => {
  assert.equal(landingPath(admin), "/");
  assert.equal(landingPath(staff), "/agenda");
  assert.equal(landingPath(peluquero, { agenda: false }), "/pets");
  assert.equal(landingPath({ is_admin: false, modules: [] }), null);
  assert.deepEqual(fallbackModules("user"), fallbackModules("staff"));
  assert.equal(roleLabel("peluquero"), "Peluquero/a");
  assert.equal(roleLabel("otro"), "otro");
});
