import assert from "node:assert/strict";
import test from "node:test";
import { areaOf, buildTree, descendants, formatDay, initials, positionPath, teamStats } from "./team.js";

const positions = [
  { id: "dir", name: "Dirección", parent_id: null, sort_order: 0, area: "direccion" },
  { id: "rec", name: "Recepción", parent_id: "dir", sort_order: 1, area: "recepcion" },
  { id: "adm", name: "Administración", parent_id: "dir", sort_order: 0, area: "administracion" },
  { id: "pel", name: "Peluquería", parent_id: "rec", sort_order: 0, area: "peluqueria" },
  { id: "huer", name: "Huérfano", parent_id: "borrado", sort_order: 0, area: "nada" },
  { id: "c1", name: "Ciclo 1", parent_id: "c2", sort_order: 0 },
  { id: "c2", name: "Ciclo 2", parent_id: "c1", sort_order: 0 },
];
const employees = [
  { id: "sofi", name: "Sofía", status: "active" },
  { id: "lu", name: "Lucía", status: "active" },
  { id: "ana", name: "Ana", status: "active" },
  { id: "ex", name: "Ex", status: "inactive" },
];
const assignments = [
  { position_id: "dir", employee_id: "sofi" },
  { position_id: "pel", employee_id: "lu" },
  { position_id: "pel", employee_id: "ana" },
  { position_id: "pel", employee_id: "ex" },
  { position_id: "rec", employee_id: "lu" },
];

test("el árbol respeta jerarquía y orden, y no pierde huérfanos ni ciclos", () => {
  const tree = buildTree({ positions, employees, assignments });
  assert.deepEqual(tree.map((n) => n.position.id), ["dir", "huer", "c1"]);
  const dir = tree[0];
  assert.deepEqual(dir.children.map((n) => n.position.id), ["adm", "rec"]);
  const pel = dir.children[1].children[0];
  // Solo activos, ordenados por nombre.
  assert.deepEqual(pel.people.map((p) => p.id), ["ana", "lu"]);
  // El ciclo aparece una vez, sin repetir infinitamente.
  assert.deepEqual(tree[2].children.map((n) => n.position.id), ["c2"]);
  assert.equal(tree[2].children[0].children.length, 0);
});

test("un puesto no puede depender de sí mismo ni de los que tiene debajo", () => {
  assert.deepEqual([...descendants(positions, "rec")].sort(), ["pel", "rec"]);
  assert.deepEqual([...descendants(positions, "pel")], ["pel"]);
});

test("ruta, área, iniciales y resumen", () => {
  assert.equal(positionPath(positions, "pel"), "Dirección › Recepción › Peluquería");
  assert.equal(positionPath(positions, "c1"), "Ciclo 2 › Ciclo 1");
  assert.equal(areaOf("nada").value, "otro");
  assert.equal(initials("María José Pérez"), "MJ");
  assert.equal(initials(""), "?");
  assert.deepEqual(teamStats({ positions: positions.slice(0, 4), employees, assignments }), {
    positions: 4,
    vacant: 1, // Administración
    active: 3,
    withoutPosition: 0,
  });
});

test("fechas sin correr el día", () => {
  assert.equal(formatDay("2024-03-01"), "01/03/2024");
  assert.equal(formatDay(null), "");
});
