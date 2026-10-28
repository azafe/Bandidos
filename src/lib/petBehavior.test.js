import assert from "node:assert/strict";
import test from "node:test";
import { behaviorLevel, parseBehavior, serializeBehavior } from "./petBehavior.js";

test("separa etiquetas conocidas de la nota libre", () => {
  assert.deepEqual(parseBehavior("Muerde · Usar bozal · Se calma con premios"), {
    tags: ["Muerde", "Usar bozal"],
    note: "Se calma con premios",
  });
  assert.deepEqual(parseBehavior("muerde. · NERVIOSO CON EL SECADOR"), {
    tags: ["Muerde", "Nervioso con el secador"],
    note: "",
  });
});

test("un texto viejo sin etiquetas queda entero como nota", () => {
  for (const text of ["SE BAÑA CON AGUA TIBIA. MUERDE", "Nervioso · pero se calma", "Hola·chau"]) {
    assert.deepEqual(parseBehavior(text), { tags: [], note: text });
  }
  assert.deepEqual(parseBehavior(null), { tags: [], note: "" });
  assert.deepEqual(parseBehavior("   "), { tags: [], note: "" });
});

test("guardar ordena, quita repetidos y descarta etiquetas desconocidas", () => {
  assert.equal(serializeBehavior(["Tranquilo", "muerde", "Muerde", "Inventada"], "  Le gustan los premios "),
    "Muerde · Tranquilo · Le gustan los premios");
  assert.equal(serializeBehavior([], ""), "");
  assert.equal(serializeBehavior([], "Solo nota"), "Solo nota");
});

test("leer lo guardado devuelve lo mismo", () => {
  const original = { tags: ["Usar bozal", "Miedoso"], note: "Con su dueña · se queda quieto" };
  const saved = serializeBehavior(original.tags, original.note);
  assert.deepEqual(parseBehavior(saved), original);
});

test("el aviso toma el tono de la etiqueta más delicada", () => {
  assert.equal(behaviorLevel({ tags: ["Tranquilo", "Muerde"], note: "" }), "danger");
  assert.equal(behaviorLevel({ tags: ["Sociable", "Miedoso"], note: "" }), "warn");
  assert.equal(behaviorLevel({ tags: ["Tranquilo"], note: "" }), "ok");
  assert.equal(behaviorLevel({ tags: ["Tranquilo"], note: "salvo con el corte de uñas" }), "warn");
  assert.equal(behaviorLevel({ tags: [], note: "Algo" }), "warn");
  assert.equal(behaviorLevel({ tags: [], note: "" }), null);
});
