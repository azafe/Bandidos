// src/pages/petshop/stock/PetshopStockPage.jsx
// Stock del PetShop con conteo, adaptado del módulo de stock de la ONG:
// estado de cada producto, ingresos y bajas, conteo a ciegas con motivo,
// historial de movimientos y revisión de diferencias.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getStock } from "../../../services/petshopStockApi";
import { newSession } from "../../../lib/petshopStock";
import CountSession from "./CountSession";
import { useCountSession } from "./useCountSession";
import MovementForm from "./MovementForm";
import StockHistory from "./StockHistory";
import StockList from "./StockList";
import StockReview from "./StockReview";
import "../../../styles/petshop-stock.css";

const TABS = [
  { id: "stock", label: "Stock" },
  { id: "contar", label: "Contar" },
  { id: "historial", label: "Historial" },
  { id: "revision", label: "Revisión" },
];

export default function PetshopStockPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("vista")) ? params.get("vista") : "stock";
  const historyProduct = params.get("producto");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [moving, setMoving] = useState(null);
  const [toast, setToast] = useState("");
  const countApi = useCountSession();

  useEffect(() => {
    let cancelled = false;
    getStock()
      .then((items) => {
        if (cancelled) return;
        setProducts(items);
        setError("");
      })
      .catch((err) => !cancelled && setError(err?.message || "No se pudo cargar el stock."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [products]
  );

  const goTo = useCallback(
    (next, extra = {}) => {
      const query = { vista: next, ...extra };
      if (next === "stock") delete query.vista;
      setParams(Object.fromEntries(Object.entries(query).filter(([, v]) => v)));
    },
    [setParams]
  );

  // Aplica el saldo que devolvió el backend sin recargar toda la lista.
  const applySaved = useCallback((productId, result, kind) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: result.stock,
              ...(kind === "conteo" || result?.movement?.kind === "conteo" ? { last_counted_at: new Date().toISOString() } : {}),
              ...(result?.movement?.unit_cost != null ? { last_cost: result.movement.unit_cost } : {}),
            }
          : p
      )
    );
  }, []);

  function startCount(ids) {
    if (countApi.session && countApi.session.position < countApi.session.queue.length) {
      const ok = window.confirm("Hay un conteo sin terminar. ¿Querés dejarlo y empezar este? Lo ya guardado queda guardado.");
      if (!ok) {
        goTo("contar");
        return;
      }
    }
    countApi.setSession(newSession(ids, "seleccion"));
    goTo("contar");
  }

  const activeCount = countApi.session && countApi.session.position < countApi.session.queue.length;

  return (
    <div className="page-content ps-page">
      <header className="page-header">
        <div>
          <Link to="/petshop" className="ps-back">← PetShop</Link>
          <h1 className="page-title">Stock y conteo</h1>
          <p className="page-subtitle">Que el sistema coincida con el estante: contá, registrá lo que entra y lo que se da de baja.</p>
        </div>
      </header>

      <nav className="card ps-tabs" aria-label="Secciones de stock">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "tab tab--active" : "tab"}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => goTo(t.id)}
          >
            {t.label}
            {t.id === "contar" && activeCount && <span className="ps-dot" aria-label="conteo en curso" />}
          </button>
        ))}
      </nav>

      {activeCount && tab !== "contar" && (
        <button type="button" className="ps-resume" onClick={() => goTo("contar")}>
          Tenés un conteo en curso: producto {countApi.session.position + 1} de {countApi.session.queue.length}. Seguir contando →
        </button>
      )}

      {loading ? (
        <div className="card ps-empty">Cargando stock…</div>
      ) : error ? (
        <div className="card ps-error" role="alert">
          {error}{" "}
          <button type="button" className="ps-link" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>Reintentar</button>
        </div>
      ) : (
        <>
          {tab === "stock" && (
            <StockList
              products={products}
              onCount={(p) => startCount([p.id])}
              onMove={(p, kind) => setMoving({ product: p, kind })}
              onHistory={(p) => goTo("historial", { producto: p.id })}
            />
          )}
          {tab === "contar" && (
            <CountSession
              products={products}
              categories={categories}
              countApi={countApi}
              onSaved={(id, result) => applySaved(id, result, "conteo")}
              onExit={() => {
                setToast("Conteo guardado.");
                setReload((n) => n + 1);
                goTo("revision");
              }}
            />
          )}
          {tab === "historial" && (
            <StockHistory
              products={products}
              productId={historyProduct}
              onProductChange={(id) => goTo("historial", { producto: id })}
            />
          )}
          {tab === "revision" && <StockReview onCountMany={startCount} reloadKey={reload} />}
        </>
      )}

      {moving && (
        <MovementForm
          product={moving.product}
          initialKind={moving.kind}
          onClose={() => setMoving(null)}
          onSaved={(id, result, kind) => {
            applySaved(id, result, kind);
            setMoving(null);
            setToast(kind === "ingreso" ? "Ingreso registrado." : "Baja registrada.");
          }}
        />
      )}

      {toast && <div className="ps-toast" role="status">{toast}</div>}
    </div>
  );
}
