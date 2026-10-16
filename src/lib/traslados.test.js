import assert from "node:assert/strict";
import test from "node:test";
import { getTrasladoError, getTrasladoPayload } from "./traslados.js";

const historical = { traslado: true, traslado_direccion: null, traslado_amount: "0.00", traslado_bonificado: null };
const form = { ...historical, traslado_direccion: "", traslado_amount: "0" };

test("un traslado gratis requiere bonificación explícita; un importe válido permite cerrar", () => {
  for (const traslado_amount of ["", "0", 0, "-1", "Infinity", "texto"]) {
    assert.ok(getTrasladoError({ traslado: true, traslado_amount, traslado_bonificado: false }));
  }
  assert.equal(getTrasladoError({ traslado: true, traslado_amount: "7800", traslado_bonificado: false }), "");
  assert.equal(getTrasladoError({ traslado: true, traslado_amount: "0", traslado_bonificado: true }), "");
  assert.ok(getTrasladoError({ traslado: true, traslado_amount: "5000", traslado_bonificado: true }));
  assert.equal(getTrasladoError({ traslado: false }), "");
});

test("editar otros datos mantiene el histórico sin clasificar", () => {
  assert.deepEqual(getTrasladoPayload(form, historical), {});
  const paid = { ...historical, traslado_amount: "5000.00" };
  assert.deepEqual(getTrasladoPayload({ ...form, traslado_amount: "5000" }, paid), {});
});

test("bonificar es una decisión explícita y quitar traslado limpia sus datos", () => {
  assert.deepEqual(getTrasladoPayload({ ...form, traslado_bonificado: true }, historical), { traslado_bonificado: true });
  assert.deepEqual(getTrasladoPayload({ ...form, traslado: false }, { ...historical, traslado_amount: "5000", traslado_direccion: "San Martín 100", traslado_bonificado: true }), {
    traslado: false, traslado_direccion: null, traslado_amount: 0, traslado_bonificado: false,
  });
});

test("altas guardan importe y decisión sin reutilizar datos del servicio", () => {
  assert.deepEqual(getTrasladoPayload({ traslado: true, traslado_direccion: " San Martín 100 ", traslado_amount: "8000", traslado_bonificado: false }), {
    traslado: true, traslado_direccion: "San Martín 100", traslado_amount: 8000, traslado_bonificado: false,
  });
  assert.equal(getTrasladoPayload({ ...form, traslado_bonificado: true, traslado_amount: "9000" }).traslado_amount, 0);
});
