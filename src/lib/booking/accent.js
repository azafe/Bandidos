// src/lib/booking/accent.js
//
// Color de acento accesible para la página pública de reservas. Cada
// peluquería puede cargar su color, pero muchos (el magenta de marca, un
// naranja, un celeste) no llegan a contraste AA con texto blanco. Se oscurece
// en OKLCH (bajando solo la luminosidad, sin cambiar el tono) hasta llegar a
// 4,5:1 con el blanco.

const DEFAULT_BRAND = "#d948ef";
// AA pide 4,5:1; se apunta un poco más alto para que los botones se lean
// cómodos al sol (los valores de referencia del diseño rondan 5,5 a 6:1).
const TARGET_CONTRAST = 5.5;

function hexToRgb(hex) {
  const clean = String(hex || "").trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

function rgbToHex(rgb) {
  return `#${rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToRgb([L, C, H]) {
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, b].map((c) => toGamma(Math.min(1, Math.max(0, c))));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastWithWhite(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? 1.05 / (luminance(rgb) + 0.05) : 1;
}

// Mezcla el color con blanco: amount 0.1 = 10% de color.
function tint(rgb, amount) {
  return rgb.map((c) => 1 - (1 - c) * amount);
}

// { accent, accentTint, accentInk } a partir del color de la peluquería.
export function deriveAccent(hex) {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_BRAND);
  const [L0, C, H] = rgbToOklch(rgb);

  let L = L0;
  let accentRgb = rgb;
  while (1.05 / (luminance(accentRgb) + 0.05) < TARGET_CONTRAST && L > 0.05) {
    L -= 0.01;
    accentRgb = oklchToRgb([L, C, H]);
  }

  const inkRgb = oklchToRgb([Math.min(L, 0.35), Math.min(C, 0.16), H]);

  return {
    accent: rgbToHex(accentRgb),
    accentTint: rgbToHex(tint(rgb, 0.1)),
    accentInk: rgbToHex(inkRgb),
  };
}

export function accentStyle(hex) {
  const { accent, accentTint, accentInk } = deriveAccent(hex);
  return { "--accent": accent, "--accent-tint": accentTint, "--accent-ink": accentInk, "--brand": hex || DEFAULT_BRAND };
}
