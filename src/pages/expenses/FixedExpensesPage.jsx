// src/pages/expenses/FixedExpensesPage.jsx
//
// La unidad de esta pantalla es EL MES, no la lista de gastos recurrentes.
// Cada mes tiene su propia lista, que se arma copiando la del mes anterior y
// después se edita libre. Editar un mes no toca ningún otro: por eso se puede
// volver a abril y corregir lo que realmente se pagó sin mover mayo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const CATEGORY_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

const EMPTY_ITEM = {
  name: "", amount: "", dueDay: 1,
  category_id: "", payment_method_id: "", supplier_id: "",
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftPeriod(period, delta) {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period) {
  const [year, month] = period.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatCurrency(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("es-AR")}`;
}

export default function FixedExpensesPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const { items: categories } = useApiResource("/v2/expense-categories");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: suppliers } = useApiResource("/v2/suppliers");

  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_ITEM);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ITEM);

  const isCurrent = period === currentPeriod();
  const isFuture = period > currentPeriod();

  const loadMonth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMonth(await apiRequest(`/v2/fixed-expenses/months/${period}`));
    } catch (err) {
      setError(err.message || "No se pudo cargar el mes.");
      setMonth(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const items = useMemo(() => month?.items || [], [month]);

  const byCategory = useMemo(() => {
    const totals = new Map();
    items.forEach((item) => {
      const key = item.category_id || "sin";
      const entry = totals.get(key) || { name: item.category_name || "Sin categoría", total: 0 };
      entry.total += Number(item.amount || 0);
      totals.set(key, entry);
    });
    return Array.from(totals.values())
      .map((entry, idx) => ({ ...entry, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  // Mismo color que las barras "Por categoría", para que la card y el desglose
  // se lean como una sola cosa.
  const colorPorCategoria = useMemo(() => {
    const mapa = new Map();
    byCategory.forEach((cat, idx) => mapa.set(cat.name, CATEGORY_COLORS[idx % CATEGORY_COLORS.length]));
    return mapa;
  }, [byCategory]);

  const topItem = useMemo(
    () => items.reduce((top, i) => (Number(i.amount) > Number(top?.amount || 0) ? i : top), null),
    [items]
  );

  async function run(action, fallbackMessage) {
    setBusy(true);
    try {
      await action();
      await loadMonth();
      return true;
    } catch (err) {
      alert(err.message || fallbackMessage);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const copyFromPrevious = () =>
    run(
      () => apiRequest(`/v2/fixed-expenses/months/${period}/copy`, { method: "POST", body: {} }),
      "No se pudo armar el mes."
    );

  function openEdit(item) {
    setSelected(item);
    setEditForm({
      name: item.name || "",
      amount: item.amount != null ? String(item.amount) : "",
      dueDay: item.due_day || Number((item.due_date || "").slice(8, 10)) || 1,
      category_id: item.category_id || "",
      payment_method_id: item.payment_method_id || "",
      supplier_id: item.supplier_id || "",
    });
  }

  function buildPayload(form) {
    return {
      name: form.name.trim(),
      amount: Number(form.amount),
      due_day: Number(form.dueDay) || 1,
      category_id: form.category_id,
      payment_method_id: form.payment_method_id,
      supplier_id: form.supplier_id || null,
    };
  }

  function invalid(form) {
    if (!form.name.trim()) return "Poné un nombre.";
    if (!(Number(form.amount) > 0)) return "Ingresá un monto válido.";
    if (!form.category_id) return "Elegí una categoría.";
    if (!form.payment_method_id) return "Elegí un método de pago.";
    return null;
  }

  async function saveEdit() {
    const problem = invalid(editForm);
    if (problem) return alert(problem);
    const ok = await run(
      () => apiRequest(`/v2/fixed-expenses/charges/${selected.id}`, {
        method: "PUT", body: buildPayload(editForm),
      }),
      "No se pudo guardar."
    );
    if (ok) setSelected(null);
  }

  async function addItem() {
    const problem = invalid(addForm);
    if (problem) return alert(problem);
    const ok = await run(
      () => apiRequest(`/v2/fixed-expenses/months/${period}/items`, {
        method: "POST", body: buildPayload(addForm),
      }),
      "No se pudo agregar."
    );
    if (ok) { setAddForm(EMPTY_ITEM); setAddOpen(false); }
  }

  // Quitar de un mes ≠ dar de baja. Lo primero corrige ESTE mes; lo segundo
  // cierra la vigencia del gasto para que deje de copiarse hacia adelante.
  async function removeFromMonth(item) {
    if (!window.confirm(
      `¿Quitar "${item.name}" solo de ${periodLabel(period)}?\n\n` +
      `Los demás meses no se tocan.`
    )) return;
    const ok = await run(
      () => apiRequest(`/v2/fixed-expenses/charges/${item.id}`, { method: "DELETE" }),
      "No se pudo quitar."
    );
    if (ok) setSelected(null);
  }

  async function discontinue(item) {
    if (!window.confirm(
      `¿Dar de baja "${item.name}" definitivamente?\n\n` +
      `Se mantiene en los meses ya armados, pero deja de copiarse hacia adelante.`
    )) return;
    const ok = await run(
      () => apiRequest(`/v2/fixed-expenses/${item.fixed_expense_id}`, {
        method: "PUT", body: { status: "inactive" },
      }),
      "No se pudo dar de baja."
    );
    if (ok) setSelected(null);
  }

  async function togglePaid(item) {
    await run(
      () => apiRequest(`/v2/fixed-expenses/charges/${item.id}`, {
        method: "PUT",
        body: { paid_at: item.paid_at ? null : new Date().toISOString().slice(0, 10) },
      }),
      "No se pudo actualizar el pago."
    );
  }

  function renderFields(form, setForm) {
    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
    return (
      <>
        <label className="form-field">
          <span>Nombre</span>
          <input type="text" value={form.name} onChange={set("name")} placeholder="Ej: Alquiler local" />
        </label>
        <label className="form-field">
          <span>Monto del mes (ARS)</span>
          <input type="number" min="0" step="100" value={form.amount} onChange={set("amount")} />
        </label>
        <label className="form-field">
          <span>Día de vencimiento</span>
          <input type="number" min="1" max="31" value={form.dueDay} onChange={set("dueDay")} />
          <small className="form-hint">Si el mes no tiene ese día, cae el último.</small>
        </label>
        <label className="form-field">
          <span>Categoría</span>
          <select value={form.category_id} onChange={set("category_id")}>
            <option value="">Seleccioná</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Método de pago</span>
          <select value={form.payment_method_id} onChange={set("payment_method_id")}>
            <option value="">Seleccioná</option>
            {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Proveedor</span>
          <select value={form.supplier_id} onChange={set("supplier_id")}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </>
    );
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gastos fijos</h1>
          <p className="page-subtitle">
            Cada mes tiene su propia lista. Editar un mes no modifica los demás.
          </p>
        </div>
        <div className="fe-month-nav">
          <button type="button" className="btn-secondary" onClick={() => setPeriod(shiftPeriod(period, -1))}>
            ←
          </button>
          <div className="fe-month-nav__label">
            <strong>{periodLabel(period)}</strong>
            {isCurrent && <span className="fe-month-nav__tag">Mes actual</span>}
            {isFuture && <span className="fe-month-nav__tag fe-month-nav__tag--future">Futuro</span>}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setPeriod(shiftPeriod(period, 1))}>
            →
          </button>
          {/* Siempre presente: si apareciera y desapareciera, las flechas se
              correrían de lugar y el segundo click de una navegación rápida
              caería en el botón equivocado. */}
          <button
            type="button"
            className="btn-secondary"
            disabled={isCurrent}
            onClick={() => setPeriod(currentPeriod())}
          >
            Hoy
          </button>
        </div>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}
      {loading && <div className="card card-subtitle">Cargando {periodLabel(period)}…</div>}

      {/* Mes sin armar: un mes vacío no es un mes de $0, es un mes sin cargar. */}
      {!loading && month && !month.armed && (
        <div className="card fe-empty-month">
          <h2 className="card-title">{periodLabel(period)} no tiene gastos fijos cargados</h2>
          <p className="card-subtitle">
            Mientras no armes la lista, este mes suma $0 al dashboard y el margen
            del período va a salir más alto de lo real.
          </p>
          <div className="fe-empty-month__actions">
            {month.previous_item_count > 0 && (
              <button type="button" className="btn-primary" disabled={busy} onClick={copyFromPrevious}>
                Copiar los {month.previous_item_count} de {periodLabel(month.previous_period)}
              </button>
            )}
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setAddOpen(true)}>
              Agregar uno nuevo
            </button>
          </div>
          {month.previous_item_count === 0 && (
            <p className="form-hint">
              {periodLabel(month.previous_period)} tampoco tiene lista. Al copiar,
              se siembra desde los gastos fijos vigentes.
            </p>
          )}
          {month.previous_item_count === 0 && (
            <div className="fe-empty-month__actions">
              <button type="button" className="btn-secondary" disabled={busy} onClick={copyFromPrevious}>
                Sembrar desde los gastos vigentes
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && month?.armed && (
        <>
          <div className="card fixed-expenses-summary">
            <div className="fixed-expenses-summary__kpis">
              <div className="fe-kpi">
                <span>Ítems del mes</span>
                <strong>{items.length}</strong>
              </div>
              <div className="fe-kpi fe-kpi--total">
                <span>Total {periodLabel(period)}</span>
                <strong>{formatCurrency(month.total)}</strong>
              </div>
              <div className="fe-kpi">
                <span>Mayor gasto</span>
                <strong>{topItem ? formatCurrency(topItem.amount) : "-"}</strong>
                {topItem && <small>{topItem.name}</small>}
              </div>
              <div className="fe-kpi">
                <span>Impago</span>
                <strong>{formatCurrency(month.unpaid.total)}</strong>
                <small>{month.unpaid.count} de {items.length}</small>
              </div>
            </div>

            {byCategory.length > 0 && (
              <div className="fixed-expenses-summary__breakdown">
                <h3 className="card-title" style={{ marginBottom: 12 }}>Por categoría</h3>
                <div className="fe-category-bars">
                  {byCategory.map((cat) => {
                    const pct = month.total > 0 ? (cat.total / month.total) * 100 : 0;
                    return (
                      <div key={cat.name} className="fe-category-bar">
                        <div className="fe-category-bar__label">
                          <span className="fe-category-bar__dot" style={{ background: cat.color }} />
                          <span className="fe-category-bar__name">{cat.name}</span>
                          <span className="fe-category-bar__pct">{pct.toFixed(0)}%</span>
                          <span className="fe-category-bar__amount">{formatCurrency(cat.total)}</span>
                        </div>
                        <div className="fe-category-bar__track">
                          <div className="fe-category-bar__fill"
                            style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            {/* Meses que la migración completó con los montos actuales: son
                estimaciones, no lo que se pagó. Decirlo es la diferencia entre
                un dato y un número inventado. */}
            {month.source === "backfill" && (
              <div className="fe-backfill-warning">
                <strong>Montos estimados</strong>
                Al migrar, este mes se completó con los montos <em>actuales</em> de
                cada gasto, porque el sistema anterior no guardaba el histórico.
                Si sabés lo que se pagó realmente en {periodLabel(period)},
                corregilo acá: los demás meses no se tocan.
              </div>
            )}

            <div className="fe-table-header">
              <div>
                <h2 className="card-title">Lista de {periodLabel(period)}</h2>
                <p className="card-subtitle">
                  {month.source === "copy" && "Copiada del mes anterior. "}
                  {month.source === "seed" && "Sembrada desde los gastos vigentes. "}
                  {month.source === "backfill" && "Completada al migrar. "}
                  Tocá un ítem para editarlo.
                </p>
              </div>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => setAddOpen(true)}>
                + Agregar ítem
              </button>
            </div>

            {items.length === 0 && (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
                Este mes quedó sin ítems. Agregá uno o copiá desde otro mes.
              </div>
            )}

            {/* Móvil: cards. La tabla obliga a scroll horizontal con seis
                columnas, y en un teléfono eso es inusable. */}
            {items.length > 0 && (
              <div className="fe-card-list">
                {items.map((item) => {
                  const color = colorPorCategoria.get(item.category_name || "Sin categoría") || "#8b94a9";
                  return (
                    <div
                      key={item.id}
                      className={`fe-card${item.paid_at ? " fe-card--paid" : ""}`}
                      style={{ "--fe-accent": color }}
                      onClick={() => openEdit(item)}
                    >
                      <div className="fe-card__accent" />
                      <div className="fe-card__body">
                        <div className="fe-card__top">
                          <span className="fe-card__name">{item.name}</span>
                          <span className="fe-card__date-badge">Vence {(item.due_date || "").slice(8, 10)}</span>
                        </div>
                        <div className="fe-card__meta">
                          <span className="fe-card__badge">{item.category_name || "Sin categoría"}</span>
                          {item.supplier_name && (
                            <span className="fe-card__meta-item">{item.supplier_name}</span>
                          )}
                          {item.edited && <span className="fe-table__badge">editado</span>}
                        </div>
                        <div className="fe-card__foot">
                          <span className="fe-card__amount">{formatCurrency(item.amount)}</span>
                          {/* stopPropagation: tocar "pagado" no debe abrir la edición. */}
                          <button
                            type="button"
                            className={`fe-pay-toggle${item.paid_at ? " fe-pay-toggle--paid" : ""}`}
                            disabled={busy}
                            onClick={(e) => { e.stopPropagation(); togglePaid(item); }}
                          >
                            {item.paid_at
                              ? `Pagado ${item.paid_at.slice(8, 10)}/${item.paid_at.slice(5, 7)}`
                              : "Marcar pagado"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Se pierde el pie de la tabla, y el total es lo que más se busca. */}
                <div className="fe-card-list__total">
                  <span>Total {periodLabel(period)}</span>
                  <strong>{formatCurrency(month.total)}</strong>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="fe-table-wrap">
                <table className="fe-table">
                  <thead>
                    <tr>
                      <th>Gasto</th>
                      <th>Categoría</th>
                      <th>Vence</th>
                      <th className="fe-table__num">Monto</th>
                      <th>Pago</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className={item.paid_at ? "fe-table__row--paid" : ""}>
                        <td>
                          <button type="button" className="fe-table__name" onClick={() => openEdit(item)}>
                            {item.name}
                          </button>
                          {item.edited && <span className="fe-table__badge" title="Editado a mano en este mes">editado</span>}
                          {item.supplier_name && <small className="fe-table__sub">{item.supplier_name}</small>}
                        </td>
                        <td>{item.category_name || "-"}</td>
                        <td>{(item.due_date || "").slice(8, 10)}</td>
                        <td className="fe-table__num">{formatCurrency(item.amount)}</td>
                        <td>
                          <button
                            type="button"
                            className={`fe-pay-toggle${item.paid_at ? " fe-pay-toggle--paid" : ""}`}
                            disabled={busy}
                            onClick={() => togglePaid(item)}
                          >
                            {item.paid_at ? `Pagado ${item.paid_at.slice(8, 10)}/${item.paid_at.slice(5, 7)}` : "Marcar pagado"}
                          </button>
                        </td>
                        <td>
                          <button type="button" className="fe-table__link" disabled={busy}
                            onClick={() => removeFromMonth(item)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Total</td>
                      <td className="fe-table__num"><strong>{formatCurrency(month.total)}</strong></td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edición de un ítem del mes */}
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)}
        title={`Editar en ${periodLabel(period)}`}>
        {selected && (
          <>
            <p className="form-hint" style={{ marginBottom: 12 }}>
              Los cambios afectan solo a {periodLabel(period)}.
            </p>
            {renderFields(editForm, setEditForm)}
            <div className="modal-actions">
              <button type="button" className="btn-danger" disabled={busy}
                onClick={() => removeFromMonth(selected)}>
                Quitar de este mes
              </button>
              {selected.fixed_expense_id && (
                <button type="button" className="btn-secondary" disabled={busy}
                  onClick={() => discontinue(selected)}>
                  Dar de baja
                </button>
              )}
              <button type="button" className="btn-primary" disabled={busy} onClick={saveEdit}>
                Guardar
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Alta de un ítem en el mes */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)}
        title={`Agregar a ${periodLabel(period)}`}>
        {renderFields(addForm, setAddForm)}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={addItem}>Agregar</button>
        </div>
      </Modal>
    </div>
  );
}
