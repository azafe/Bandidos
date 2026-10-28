// Conteo del PetShop, de a un producto, pensado para el celular en la mano
// frente al estante. Es a ciegas: el campo arranca vacío y el número del
// sistema aparece recién cuando se escribe lo contado, para no condicionar.
// Cada producto se guarda antes de avanzar; el progreso queda en el
// navegador para retomar si se corta.
import { useEffect, useRef, useState } from "react";
import { registerMovement } from "../../../services/petshopStockApi";
import {
  COUNT_SCOPES,
  DIFFERENCE_REASONS,
  countedText,
  countQueue,
  formatDelta,
  formatStock,
  goBack,
  newSession,
  reasonNote,
  recordResult,
  sessionSummary,
  skipCurrent,
} from "../../../lib/petshopStock";

const ATTEMPTS = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CountSession({ products, categories, countApi, onSaved, onExit }) {
  const { session, setSession } = countApi;
  const byId = new Map(products.map((p) => [p.id, p]));
  const currentId = session ? session.queue[session.position] : null;
  const missing = Boolean(currentId) && products.length > 0 && !byId.has(currentId);

  // Un producto que se borró mientras tanto se saltea solo.
  useEffect(() => {
    if (missing) setSession((s) => (s && s.queue[s.position] === currentId ? skipCurrent(s) : s));
  }, [missing, currentId, setSession]);

  if (!session) {
    return <CountStart products={products} categories={categories} onStart={(s) => setSession(s)} />;
  }
  if (currentId && !byId.has(currentId)) return null;

  if (session.position >= session.queue.length) {
    return (
      <CountSummary
        session={session}
        onRecountSkipped={() => setSession(newSession(session.skipped, "salteados"))}
        onBack={() => setSession(goBack(session))}
        onFinish={() => {
          setSession(null);
          onExit?.();
        }}
      />
    );
  }

  return (
    <CountStep
      key={`${currentId}-${session.position}`}
      product={byId.get(currentId)}
      session={session}
      setSession={setSession}
      onSaved={onSaved}
    />
  );
}

function CountStart({ products, categories, onStart }) {
  const [scope, setScope] = useState("recontar");
  const [category, setCategory] = useState(categories[0] || "");
  const queue = countQueue(products, scope, category);

  return (
    <section className="card ps-count-start" aria-labelledby="ps-count-title">
      <h2 id="ps-count-title" className="card-title">Contar el stock</h2>
      <p className="card-subtitle">
        Recorré el estante y anotá cuántas unidades hay de cada producto. Si algo no coincide con el sistema,
        te vamos a pedir el motivo.
      </p>
      <div className="ps-scope" role="radiogroup" aria-label="Qué contar">
        {COUNT_SCOPES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={scope === option.id}
            className={`ps-scope__item${scope === option.id ? " is-active" : ""}`}
            onClick={() => setScope(option.id)}
            disabled={option.id === "categoria" && categories.length === 0}
          >
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>
      {scope === "categoria" && (
        <label className="form-field">
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        className="btn-primary ps-big-btn"
        disabled={queue.length === 0}
        onClick={() => onStart(newSession(queue, scope, scope === "categoria" ? category : ""))}
      >
        {queue.length === 0 ? "No hay productos para contar" : `Empezar · ${queue.length} ${queue.length === 1 ? "producto" : "productos"}`}
      </button>
    </section>
  );
}

function CountStep({ product, session, setSession, onSaved }) {
  const previous = session.results.find((r) => r.productId === product.id);
  const [value, setValue] = useState(previous ? String(previous.counted) : "");
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // El stock del sistema puede haber cambiado (una venta mientras se cuenta):
  // el backend lo devuelve y la diferencia se recalcula con ese número.
  const [systemStock, setSystemStock] = useState(Number(product.stock) || 0);
  // Mismo id en los reintentos de este producto: el backend no lo duplica.
  const clientId = useRef(crypto.randomUUID());
  const input = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 761px)").matches) input.current?.focus();
  }, []);

  const typed = value.trim() !== "";
  const counted = typed ? Math.max(0, Math.floor(Number(value))) : null;
  const delta = counted === null ? 0 : counted - systemStock;
  const differs = typed && delta !== 0;
  const note = differs ? reasonNote(reason, detail) : null;
  const canSave = typed && Number.isFinite(counted) && (!differs || note) && !saving;
  const total = session.queue.length;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    let lastError = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      try {
        const result = await registerMovement({
          clientId: clientId.current,
          productId: product.id,
          kind: "conteo",
          quantity: counted,
          note,
        });
        lastError = null;
        onSaved?.(product.id, result);
        break;
      } catch (err) {
        lastError = err;
        // El sistema cambió y ahora no coincide: pedir motivo, no reintentar.
        if (err?.status === 422 && err?.payload?.stock !== undefined) {
          setSystemStock(Number(err.payload.stock));
          break;
        }
        if (err?.status && err.status < 500) break;
        if (attempt < ATTEMPTS - 1) await wait(700 * (attempt + 1));
      }
    }
    setSaving(false);
    if (lastError) {
      setError(
        lastError.status === 422
          ? "Mientras contabas cambió el stock del sistema. Revisá la diferencia y elegí el motivo."
          : lastError.message || "No se pudo guardar. Revisá la conexión y probá de nuevo."
      );
      return;
    }
    setSession((s) =>
      recordResult(s, { productId: product.id, name: product.name, before: systemStock, counted, note })
    );
  }

  function step(diff) {
    const base = typed ? counted : 0;
    setValue(String(Math.max(0, base + diff)));
  }

  return (
    <section className="card ps-step" aria-labelledby="ps-step-name">
      <div className="ps-step__progress">
        <span>
          Producto {session.position + 1} de {total}
        </span>
        <div className="ps-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={session.position}>
          <span style={{ width: `${(session.position / total) * 100}%` }} />
        </div>
      </div>

      <div className="ps-step__product">
        {product.category && <span className="ps-step__category">{product.category}</span>}
        <h2 id="ps-step-name" className="ps-step__name">{product.name}</h2>
        <span className="ps-muted">
          {product.sku ? `${product.sku} · ` : ""}
          {countedText(product)}
        </span>
      </div>

      <form
        className="ps-step__form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="ps-step__label" htmlFor="ps-count-input">¿Cuántas unidades hay?</label>
        <div className="ps-stepper">
          <button type="button" className="ps-stepper__btn" onClick={() => step(-1)} aria-label="Una menos">−</button>
          <input
            id="ps-count-input"
            ref={input}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="0"
          />
          <button type="button" className="ps-stepper__btn" onClick={() => step(1)} aria-label="Una más">+</button>
        </div>

        {typed && (
          <div className={`ps-compare${differs ? " ps-compare--diff" : " ps-compare--ok"}`} aria-live="polite">
            {differs ? (
              <>
                <span>El sistema dice <strong>{formatStock(systemStock)}</strong></span>
                <span className="ps-compare__delta">{formatDelta(delta)}</span>
              </>
            ) : (
              <span>✓ Coincide con el sistema</span>
            )}
          </div>
        )}

        {differs && (
          <fieldset className="ps-reasons">
            <legend>¿Por qué no coincide? · obligatorio</legend>
            <div className="ps-chips">
              {DIFFERENCE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  className={`ps-chip${reason === r ? " is-active" : ""}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason && (
              <input
                className="ps-input"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={reason === "Otro" ? "Contá qué pasó" : "Detalle (opcional)"}
                aria-label="Detalle del motivo"
                maxLength={160}
              />
            )}
          </fieldset>
        )}

        {error && <p className="ps-error" role="alert">{error}</p>}

        <button type="submit" className="btn-primary ps-big-btn" disabled={!canSave}>
          {saving ? "Guardando…" : "Guardar y seguir"}
        </button>
        <div className="ps-step__secondary">
          <button type="button" className="btn-secondary" onClick={() => setSession(goBack(session))} disabled={session.position === 0 || saving}>
            ← Anterior
          </button>
          <button type="button" className="btn-secondary" onClick={() => setSession(skipCurrent(session))} disabled={saving}>
            Saltear
          </button>
          <button type="button" className="btn-secondary" onClick={() => setSession({ ...session, position: session.queue.length })} disabled={saving}>
            Terminar
          </button>
        </div>
      </form>
    </section>
  );
}

function CountSummary({ session, onRecountSkipped, onBack, onFinish }) {
  const summary = sessionSummary(session);
  return (
    <section className="card ps-summary" aria-labelledby="ps-summary-title">
      <h2 id="ps-summary-title" className="card-title">Conteo terminado</h2>
      <dl className="ps-summary__stats">
        <div><dt>Contados</dt><dd>{summary.counted}</dd></div>
        <div><dt>Con diferencia</dt><dd>{summary.differences.length}</dd></div>
        <div><dt>Salteados</dt><dd>{summary.skipped}</dd></div>
        {summary.pending > 0 && <div><dt>Sin llegar</dt><dd>{summary.pending}</dd></div>}
      </dl>
      {summary.differences.length > 0 ? (
        <>
          <h3 className="ps-subtitle">Diferencias encontradas</h3>
          <ul className="ps-diff-list">
            {summary.differences.map((r) => (
              <li key={r.productId}>
                <div>
                  <strong>{r.name}</strong>
                  <span className="ps-muted">{r.note}</span>
                </div>
                <span className={`ps-delta${r.counted - r.before < 0 ? " is-negative" : ""}`}>
                  {formatStock(r.before)} → {formatStock(r.counted)} ({formatDelta(r.counted - r.before)})
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        summary.counted > 0 && <p className="ps-ok-note">✓ Todo lo contado coincide con el sistema.</p>
      )}
      <div className="ps-actions">
        {summary.skipped > 0 && (
          <button type="button" className="btn-secondary" onClick={onRecountSkipped}>
            Contar los {summary.skipped} salteados
          </button>
        )}
        {session.queue.length > 0 && (
          <button type="button" className="btn-secondary" onClick={onBack}>← Volver al último</button>
        )}
        <button type="button" className="btn-primary" onClick={onFinish}>Listo</button>
      </div>
    </section>
  );
}
