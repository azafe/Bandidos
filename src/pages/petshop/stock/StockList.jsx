// Lista de stock: tarjetas por estado que filtran, buscador y una fila por
// producto con su saldo, cuándo se contó y las acciones.
import { useMemo, useState } from "react";
import {
  STOCK_STATUS,
  countedText,
  filterProducts,
  formatStock,
  needsRecount,
  sortProducts,
  statusCounts,
  stockStatus,
  stockValue,
} from "../../../lib/petshopStock";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;

const CARDS = [
  { id: "negativo", label: "En negativo", hint: "El sistema dice menos de cero" },
  { id: "vacio", label: "Sin stock", hint: "No queda" },
  { id: "bajo", label: "Bajo mínimo", hint: "Hay que reponer" },
  { id: "recontar", label: "Para recontar", hint: "Nunca o hace mucho" },
];

export default function StockList({ products, onCount, onMove, onHistory }) {
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const counts = useMemo(() => statusCounts(products), [products]);
  const visible = useMemo(() => sortProducts(filterProducts(products, { status, search })), [products, status, search]);

  return (
    <>
      <div className="ps-cards">
        {CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            aria-pressed={status === card.id}
            className={`ps-card ps-card--${card.id}${status === card.id ? " is-active" : ""}${counts[card.id] ? " has-items" : ""}`}
            onClick={() => setStatus(status === card.id ? "todos" : card.id)}
          >
            <strong>{counts[card.id]}</strong>
            <span>{card.label}</span>
            <small>{card.hint}</small>
          </button>
        ))}
      </div>

      <section className="card ps-list" aria-label="Productos">
        <div className="ps-list__head">
          <input
            type="search"
            className="ps-input ps-search"
            placeholder="Buscar por nombre, código o categoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar producto"
          />
          <span className="ps-muted">
            {visible.length} de {products.length} · valor al costo {money(stockValue(products))}
          </span>
        </div>
        {status !== "todos" && (
          <button type="button" className="ps-clear" onClick={() => setStatus("todos")}>
            Mostrando: {CARDS.find((c) => c.id === status)?.label ?? STOCK_STATUS[status]?.label} · ver todos ✕
          </button>
        )}

        {visible.length === 0 ? (
          <p className="ps-empty">
            {products.length === 0
              ? "Todavía no hay productos. Cargalos desde PetShop › Productos."
              : "No hay productos con ese filtro."}
          </p>
        ) : (
          <ul className="ps-rows">
            {visible.map((p) => {
              const st = stockStatus(p);
              const recount = needsRecount(p);
              return (
                <li key={p.id} className={`ps-row ps-row--${st}`}>
                  <div className="ps-row__main">
                    <strong className="ps-row__name">{p.name}</strong>
                    <span className="ps-muted">
                      {[p.category, p.sku].filter(Boolean).join(" · ") || "Sin categoría"}
                    </span>
                    <span className="ps-row__pills">
                      {st !== "ok" && <span className={`ps-pill ps-pill--${STOCK_STATUS[st].tone}`}>{STOCK_STATUS[st].label}</span>}
                      {recount && st !== "sin_contar" && <span className="ps-pill ps-pill--muted">Para recontar</span>}
                    </span>
                  </div>
                  <div className="ps-row__stock">
                    <strong className={Number(p.stock) < 0 ? "is-negative" : undefined}>{formatStock(p.stock)}</strong>
                    <span className="ps-muted">{countedText(p)}</span>
                    {Number(p.stock_min) > 0 && <span className="ps-muted">mín. {p.stock_min}</span>}
                  </div>
                  <div className="ps-row__actions">
                    <button type="button" className="btn-secondary" onClick={() => onCount(p)}>Contar</button>
                    <button type="button" className="btn-secondary" onClick={() => onMove(p, "ingreso")}>Ingreso</button>
                    <button type="button" className="btn-secondary" onClick={() => onMove(p, "merma")}>Baja</button>
                    <button type="button" className="ps-link" onClick={() => onHistory(p)}>Historial</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
