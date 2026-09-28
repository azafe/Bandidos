// Tests de los helpers de la página pública de reservas.
//   npm test
import assert from "node:assert/strict";
import test from "node:test";
import { contrastWithWhite, deriveAccent } from "./accent.js";
import {
  dayChipParts,
  formatDurationRange,
  formatLongDate,
  formatMinutes,
  formatPriceRange,
  groupSlots,
  isValidArPhone,
  normalizeArPhone,
} from "./format.js";
import { buildIcs } from "./ics.js";

test("rango de precios y precio único", () => {
  assert.equal(formatPriceRange(22000, 32000), "$22.000 a $32.000");
  assert.equal(formatPriceRange(5000, 5000), "$5.000");
  assert.equal(formatPriceRange(5000, null), "$5.000");
  assert.equal(formatPriceRange(null, null), null);
});

test("duraciones", () => {
  assert.equal(formatMinutes(15), "15 min");
  assert.equal(formatMinutes(60), "1 h");
  assert.equal(formatMinutes(90), "1 h 30");
  assert.equal(formatDurationRange(60, 120), "1 h a 2 h");
  assert.equal(formatDurationRange(45, 90), "45 min a 1 h 30");
  assert.equal(formatDurationRange(15, 15), "15 min");
});

test("fechas en castellano", () => {
  assert.equal(formatLongDate("2026-09-30"), "miércoles 30 de septiembre");
  assert.deepEqual(dayChipParts("2026-09-30"), { weekday: "Mié", day: 30, month: "sep" });
});

test("horarios agrupados en mañana, tarde y noche sin grupos vacíos", () => {
  const groups = groupSlots(["09:00", "12:30", "13:00", "19:30", "20:00"]);
  assert.deepEqual(groups.map((g) => [g.label, g.slots]), [
    ["Mañana", ["09:00", "12:30"]],
    ["Tarde", ["13:00", "19:30"]],
    ["Noche", ["20:00"]],
  ]);
  assert.deepEqual(groupSlots(["15:00"]).map((g) => g.label), ["Tarde"]);
});

test("celular argentino: saca 0, 15, +54 y 9", () => {
  assert.equal(normalizeArPhone("11 2345 6789"), "1123456789");
  assert.equal(normalizeArPhone("011 15 2345 6789"), "1123456789");
  assert.equal(normalizeArPhone("+54 9 381 555-1234"), "3815551234");
  assert.equal(normalizeArPhone("0381 15 555 1234"), "3815551234");
  assert.equal(isValidArPhone("15 2345 678"), false);
  assert.equal(isValidArPhone("381 555 1234"), true);
});

test("acento accesible: oscurece hasta superar AA con texto blanco", () => {
  for (const hex of ["#d948ef", "#14b8a6", "#f97316", "#3b82f6", "#fde047"]) {
    const { accent, accentTint } = deriveAccent(hex);
    assert.ok(contrastWithWhite(accent) >= 4.5, `${hex} -> ${accent}`);
    assert.match(accentTint, /^#[0-9a-f]{6}$/);
  }
  // Un color ya oscuro no se toca.
  assert.equal(deriveAccent("#1d4ed8").accent, "#1d4ed8");
  // Un color inválido usa el de marca.
  assert.equal(deriveAccent("rojo").accent, deriveAccent("#d948ef").accent);
});

test("el .ics tiene el horario en UTC (Argentina es UTC-3)", () => {
  const ics = buildIcs({ uid: "x", title: "Baño, corte", date: "2026-09-30", time: "09:00", duration: 120 });
  assert.match(ics, /DTSTART:20260930T120000Z/);
  assert.match(ics, /DTEND:20260930T140000Z/);
  assert.match(ics, /SUMMARY:Baño\\, corte/);
  assert.match(buildIcs({ uid: "y", title: "a;b", date: "2026-09-30", time: "09:00", duration: 60 }), /SUMMARY:a\\;b/);
});
