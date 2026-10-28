// Ingreso de mercadería o baja (vencido, roto, consumo del local…) de un
// producto. Anticipa cómo queda el stock antes de confirmar.
import { useRef, useState } from "react";
import Modal from "../../../components/ui/Modal";
import { registerMovement } from "../../../services/petshopStockApi";
import { LOSS_REASONS, formatStock, reasonNote } from "../../../lib/petshopStock";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;

export default function MovementForm({ product, initialKind = "ingreso", onClose, onSaved }) {
  const [kind, setKind] = useState(initialKind);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(product.last_cost ?? product.cost ?? "");
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const clientId = useRef(crypto.randomUUID());

  const qty = Math.floor(Number(quantity));
  const validQty = quantity !== "" && Number.isFinite(qty) && qty > 0;
  const current = Number(product.stock) || 0;
  const after = validQty ? current + (kind === "ingreso" ? qty : -qty) : null;
  const note = kind === "merma" ? reasonNote(reason, detail, "Baja") : detail.trim() || null;
  const canSave = validQty && (kind === "ingreso" || note) && !saving;

  function changeKind(next) {
    setKind(next);
    setError("");
    // Otro tipo es otro movimiento: no puede reusar el id del anterior.
    clientId.current = crypto.randomUUID();
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const result = await registerMovement({
        clientId: clientId.current,
        productId: product.id,
        kind,
        quantity: qty,
        unitCost: kind === "ingreso" && unitCost !== "" ? Number(unitCost) : null,
        note,
      });
      onSaved(product.id, result, kind);
    } catch (err) {
      setError(err?.message || "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={product.name} className="ps-modal">
      <form className="ps-move" onSubmit={submit}>
        <div className="ps-segmented" role="radiogroup" aria-label="Tipo de movimiento">
          {[
            { id: "ingreso", label: "Entró mercadería" },
            { id: "merma", label: "Dar de baja" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={kind === option.id}
              className={`ps-segmented__item${kind === option.id ? " is-active" : ""}`}
              onClick={() => changeKind(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ps-move__grid">
          <label className="form-field">
            <span>Cantidad</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                clientId.current = crypto.randomUUID();
              }}
              autoFocus
            />
          </label>
          {kind === "ingreso" && (
            <label className="form-field">
              <span>Costo por unidad</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={10}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
              <small className="form-hint">Opcional. Queda como último costo de compra.</small>
            </label>
          )}
        </div>

        {kind === "merma" && (
          <fieldset className="ps-reasons">
            <legend>Motivo · obligatorio</legend>
            <div className="ps-chips">
              {LOSS_REASONS.map((r) => (
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
          </fieldset>
        )}

        <label className="form-field">
          <span>{kind === "merma" && reason === "Otro" ? "¿Qué pasó?" : "Nota (opcional)"}</span>
          <input
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={160}
            placeholder={kind === "ingreso" ? "Ej: Factura 0001-2345, proveedor" : "Ej: Lote vencido en septiembre"}
          />
        </label>

        <div className="ps-preview" aria-live="polite">
          {after === null ? (
            <span>Stock actual: <strong>{formatStock(current)}</strong></span>
          ) : (
            <span>
              El stock pasa de <strong>{formatStock(current)}</strong> a <strong>{formatStock(after)}</strong>
              {kind === "ingreso" && unitCost !== "" && Number(unitCost) > 0 && (
                <span className="ps-muted"> · compra de {money(qty * Number(unitCost))}</span>
              )}
            </span>
          )}
        </div>

        {error && <p className="ps-error" role="alert">{error}</p>}

        <div className="ps-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={!canSave}>
            {saving ? "Guardando…" : kind === "ingreso" ? "Registrar ingreso" : "Registrar baja"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
