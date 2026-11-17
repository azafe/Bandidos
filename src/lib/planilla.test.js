import assert from "node:assert/strict";
import test from "node:test";
import {
  armarRenglones, libresAgrupados, textoLibres, peluquerasDeTurno, coloresPeluqueras, fondoRenglon,
  resumenCobro, rangoHorario, fechaLarga, distanciaDias, sumarDias, buscarBandidos, montoDe, MOLDE,
} from "./planilla.js";

test("los turnos ocupan lugares del molde y los cancelados los liberan", () => {
  const turnos = [
    { id: 1, time: "09:00:00", status: "reserved" },
    { id: 2, time: "09:00", status: "finished" },
    { id: 3, time: "09:00", status: "cancelled" },
    { id: 4, time: "13:15", status: "reserved" },
  ];
  const r = armarRenglones(turnos, { molde: ["09:00", "09:00", "09:00", "10:00"], extras: ["10:00"] });
  assert.deepEqual(r.map((x) => `${x.time}${x.tipo === "libre" ? "L" : x.turno.id}`), ["09:001", "09:002", "09:003", "09:00L", "10:00L", "10:00L", "13:154"]);
  assert.equal(libresAgrupados(r), "09:00 · 10:00 (2)");
  assert.equal(textoLibres("2026-11-16", r), "*Horarios libres · lunes 16/11*\n09:00 · 10:00 (2)");
  assert.equal(armarRenglones([]).length, MOLDE.length);
});

test("si hay más turnos que lugares no aparecen libres de más", () => {
  const turnos = [1, 2, 3, 4].map((id) => ({ id, time: "09:00", status: "reserved" }));
  const r = armarRenglones(turnos, { molde: ["09:00", "09:00"] });
  assert.equal(r.filter((x) => x.tipo === "libre").length, 0);
  assert.equal(textoLibres("2026-11-16", r).endsWith("Sin lugar"), true);
});

test("peluqueras y colores", () => {
  assert.deepEqual(peluquerasDeTurno({ groomer_id: 5, second_groomer_id: null, third_groomer_id: 9 }), ["5", "9"]);
  assert.deepEqual(peluquerasDeTurno({ groomer: { id: 7 } }), ["7"]);
  const colores = coloresPeluqueras([{ id: 2, name: "Meli" }, { id: 1, name: "Jime" }], { 2: "#000000" });
  assert.equal(colores["1"], "#ff9fc4");
  assert.equal(colores["2"], "#000000");
  assert.equal(fondoRenglon([]), null);
  assert.match(fondoRenglon(["#aaa"]), /^color-mix/);
  assert.match(fondoRenglon(["#aaa", "#bbb"]), /^linear-gradient\(90deg, .*#aaa.* 0% 50%, .*#bbb.* 50% 100%\)$/);
});

test("el cobro descuenta la seña y avisa lo que falta o sobra", () => {
  assert.deepEqual(resumenCobro({ precio: "$27.000", sena: 5000, pagos: [{ amount: "20000" }] }), { precio: 27000, sena: 5000, saldo: 22000, pagado: 20000, diferencia: 2000 });
  assert.equal(resumenCobro({ precio: 27000, sena: 0, pagos: [{ amount: 20000 }, { amount: "$7.000" }] }).diferencia, 0);
  assert.equal(resumenCobro({ precio: 1000, sena: 2000, pagos: [] }).saldo, 0);
  assert.equal(montoDe("$1.234,5"), 1234.5);
  assert.equal(montoDe("27000.00"), 27000);
  assert.equal(montoDe(""), 0);
});

test("fechas y horarios", () => {
  assert.equal(fechaLarga("2026-11-15"), "Domingo 15 de noviembre");
  assert.equal(sumarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(distanciaDias("2026-11-16", "2026-11-15"), "Mañana");
  assert.equal(distanciaDias("2026-11-11", "2026-11-15"), "Hace 4 días");
  assert.equal(rangoHorario(["09:30", "15:00"]), "9:30 a 15");
});

test("el buscador ordena por nombre y después por dueño, sin archivados", () => {
  const pets = [
    { id: 1, name: "Lola", owner_name: "Mayra" },
    { id: 2, name: "Lola", owner_name: "Huerto" },
    { id: 3, name: "Toby", owner_name: "Lorena Paz" },
    { id: 4, name: "Lolo", owner_name: "x", archived_at: "2025-01-01" },
  ];
  assert.deepEqual(buscarBandidos(pets, "lo").map((p) => p.id), [2, 1, 3]);
  assert.deepEqual(buscarBandidos(pets, ""), []);
});

test("la planilla muestra solo peluqueras activas, o las elegidas a mano", async () => {
  const { listaPeluqueras } = await import("./planilla.js");
  const equipo = [
    { id: 1, name: "Maira", role: "Groomer", status: "active" },
    { id: 2, name: "Jorge", role: "Chofer", status: "active", is_driver: true },
    { id: 3, name: "Tamara", role: "Recepción", status: "active" },
    { id: 4, name: "Melina", role: "groomer" },
    { id: 5, name: "Vieja", role: "Groomer", status: "inactive" },
    { id: 6, name: "Ale", role: "Socio", status: "active" },
  ];
  assert.deepEqual(listaPeluqueras(equipo).map((e) => e.name), ["Maira", "Melina"]);
  assert.deepEqual(listaPeluqueras(equipo, ["3", 1, 5]).map((e) => e.name), ["Maira", "Tamara"]);
  assert.deepEqual(listaPeluqueras(equipo, []), []);
});

test("la hora de un renglón libre se cambia o se quita", async () => {
  const { lugaresDelDia, moverLugar, armarRenglones, HORAS_15 } = await import("./planilla.js");
  const base = lugaresDelDia({ extras: ["19:00"] });
  assert.equal(base.filter((t) => t === "19:00").length, 2);
  const movido = moverLugar(["09:00", "11:00", "11:00", "12:30"], "11:00", "11:30");
  assert.deepEqual(movido, ["09:00", "11:00", "11:30", "12:30"]);
  assert.deepEqual(moverLugar(movido, "12:30", null), ["09:00", "11:00", "11:30"]);
  assert.equal(moverLugar(movido, "08:00", "10:00"), movido);
  const r = armarRenglones([{ id: 1, time: "11:00", status: "reserved" }], { molde: movido });
  assert.deepEqual(r.map((x) => x.tipo + x.time), ["libre09:00", "turno11:00", "libre11:30", "libre12:30"]);
  assert.equal(HORAS_15[1], "07:15");
  assert.deepEqual(lugaresDelDia({ slots: ["10:00"], extras: ["19:00"] }), ["10:00"]);
});

test("la planilla ofrece solo los servicios de todos los días", async () => {
  const { serviciosPlanilla } = await import("./planilla.js");
  const cat = [{ id: 1, name: "Corte y Baño" }, { id: 2, name: "BAÑO BORDER COLLIE" }, { id: 3, name: "Baño" }, { id: 4, name: "Corte a tijera" }, { id: 5, name: " corte " }];
  assert.deepEqual(serviciosPlanilla(cat).map((s) => s.id), [1, 3, 5]);
  assert.deepEqual(serviciosPlanilla(cat, ["4"]).map((s) => s.id), [4]);
  assert.deepEqual(serviciosPlanilla([{ id: 9, name: "Spa" }]).map((s) => s.id), [9]);
});
