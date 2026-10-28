// Historial de movimientos (kardex): qué entró, qué salió y qué corrigió
// cada conteo, agrupado por día y filtrable por producto y tipo.
import { useEffect, useMemo, useState } from "react";
import { getMovements } from "../../../services/petshopStockApi";
import { addDaysISO, todayISO } from "../../../utils/dates";
import { KIND_LABEL, dayLabel, formatDelta, formatStock, groupByDay } from "../../../lib/petshopStock";

const RANGES = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
];

const KIND_TONE = {
  ingreso: "ok",
  devolucion: "ok",
  inicial: "muted",
  venta: "info",
  merma: "bad",
  ajuste: "warn",
  conteo: "brand",
};

const time = (iso) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const who = (email) => (email ? email.split("@")[0] : null);

export default function StockHistory({ products, productId, onProductChange }) {
  const [days, setDays] = useState(30);
  const [kinds, setKinds] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMovements({ productId, kinds, from: addDaysISO(todayISO(), -days + 1), to: todayISO(), limit: 500 })
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setError("");
      })
      .catch((err) => !cancelled && setError(err?.message || "No se pudo cargar el historial."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [productId, kinds, days, reload]);

  const groups = useMemo(() => groupByDay(items), [items]);

  function toggleKind(kind) {
    setLoading(true);
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  }

  return (
    <section className="card ps-history" aria-labelledby="ps-history-title">
      <h2 id="ps-history-title" className="card-title">Historial de movimientos</h2>
      <div className="ps-history__filters">
        <label className="form-field">
          <span>Producto</span>
          <select
            value={productId || ""}
            onChange={(e) => {
              setLoading(true);
              onProductChange(e.target.value || null);
            }}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="ps-segmented ps-segmented--small" role="radiogroup" aria-label="Período">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              role="radio"
              aria-checked={days === r.days}
              className={`ps-segmented__item${days === r.days ? " is-active" : ""}`}
              onClick={() => {
                setLoading(true);
                setDays(r.days);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ps-chips" role="group" aria-label="Tipo de movimiento">
        {Object.entries(KIND_LABEL).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={kinds.includes(kind)}
            className={`ps-chip${kinds.includes(kind) ? " is-active" : ""}`}
            onClick={() => toggleKind(kind)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="ps-empty">Cargando…</p>
      ) : error ? (
        <div className="ps-error" role="alert">
          {error}{" "}
          <button type="button" className="ps-link" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>Reintentar</button>
        </div>
      ) : groups.length === 0 ? (
        <p className="ps-empty">No hay movimientos en este período.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="ps-day">
            <h3 className="ps-day__title">{dayLabel(group.key)}</h3>
            <ul className="ps-moves">
              {group.items.map((m) => (
                <li key={m.id} className="ps-move-row">
                  <span className="ps-move-row__time">{time(m.created_at)}</span>
                  <div className="ps-move-row__main">
                    <span className="ps-move-row__title">
                      <span className={`ps-pill ps-pill--${KIND_TONE[m.kind] || "muted"}`}>{KIND_LABEL[m.kind] || m.kind}</span>
                      {!productId && <strong>{m.product_name}</strong>}
                    </span>
                    {(m.note || who(m.user_email)) && (
                      <span className="ps-muted">{[m.note, who(m.user_email)].filter(Boolean).join(" · ")}</span>
                    )}
                  </div>
                  <div className="ps-move-row__numbers">
                    {m.delta === null ? (
                      <span className="ps-muted">registro anterior · {m.quantity}</span>
                    ) : (
                      <>
                        <strong className={m.delta < 0 ? "is-negative" : m.delta > 0 ? "is-positive" : undefined}>{formatDelta(m.delta)}</strong>
                        <span className="ps-muted">queda {formatStock(m.stock_after)}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
