// Formatos para las propuestas. Los montos se guardan en pesos de hoy; si la
// propuesta se muestra en dólares, se dividen por el tipo de cambio cargado.
import { currencyOf } from "../../lib/inversores";

export function makeFormat(investor) {
  const { divisor, simbolo, usd } = currencyOf(investor);
  const conv = (n) => (Number(n) || 0) / divisor;
  const money = (n) => {
    const v = conv(n);
    return `${v < 0 ? "−" : ""}${simbolo}${Math.round(Math.abs(v)).toLocaleString("es-AR")}`;
  };
  const short = (n) => {
    const v = conv(n);
    const abs = Math.abs(v);
    const sign = v < 0 ? "−" : "";
    if (abs >= 1_000_000) return `${sign}${simbolo}${(abs / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
    if (abs >= 10_000) return `${sign}${simbolo}${Math.round(abs / 1_000).toLocaleString("es-AR")} mil`;
    return money(n);
  };
  return { usd, simbolo, money, short };
}

export const pct = (n, digits = 0) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : `${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: digits })}%`;

export const multiple = (n) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}x`;

export const monthsText = (n) => `${n} ${n === 1 ? "mes" : "meses"}`;

// "Mes 22", o con fecha de apertura no la tenemos: siempre relativo.
export const recuperoText = (n, horizon) => (n ? `Mes ${n}` : `Más de ${horizon} meses`);

export const oneDecimal = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
