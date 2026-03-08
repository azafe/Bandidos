// src/pages/expenses/FixedExpensesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const CATEGORY_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

export default function FixedExpensesPage() {
  const [filters, setFilters] = useState({ category_id: "", status: "" });
  const {
    items: fixedExpenses,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/fixed-expenses", filters);
  const { items: categories } = useApiResource("/v2/expense-categories");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: suppliers } = useApiResource("/v2/suppliers");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", amount: "", dueDay: 1,
    paymentMethod: "", supplier: "", status: "active",
  });
  const [editingId, setEditingId] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "", category: "", amount: "", dueDay: 1,
    paymentMethod: "", supplier: "", status: "active",
  });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const activeExpenses = fixedExpenses.filter(
    (e) => e.status === "active" || e.status === "Activo"
  );
  const inactiveCount = fixedExpenses.length - activeExpenses.length;
  const monthlyTotal = activeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const topExpense = activeExpenses.reduce(
    (top, e) => (Number(e.amount) > Number(top?.amount || 0) ? e : top),
    null
  );

  const byCategory = categories
    .map((cat, idx) => {
      const exps = activeExpenses.filter(
        (e) =>
          String(e.category_id) === String(cat.id) ||
          String(e.category?.id) === String(cat.id)
      );
      const total = exps.reduce((s, e) => s + Number(e.amount || 0), 0);
      return { ...cat, total, count: exps.length, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
  }

  function getNameById(list, id) {
    if (!id) return "";
    return list.find((item) => String(item.id) === String(id))?.name || "";
  }

  function resolveField(expense, directKey, nestedObj, listRef, idKey) {
    return expense[nestedObj]?.name || getNameById(listRef, expense[idKey]) || "-";
  }

  function categoryName(e) {
    return e.category?.name || getNameById(categories, e.category_id) || "-";
  }
  function paymentName(e) {
    return e.payment_method?.name || getNameById(paymentMethods, e.payment_method_id) || "-";
  }
  function supplierName(e) {
    return e.supplier?.name || getNameById(suppliers, e.supplier_id) || "";
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({ name: "", category: "", amount: "", dueDay: 1, paymentMethod: "", supplier: "", status: "active" });
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto mensual válido.");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category,
        amount: amountNumber,
        due_day: Number(form.dueDay) || 1,
        payment_method_id: form.paymentMethod,
        supplier_id: form.supplier || null,
        status: form.status,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto fijo.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este gasto fijo?")) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el gasto fijo.");
      return false;
    }
  }

  function openModalEdit(expense) {
    setModalForm({
      name: expense.name || "",
      category: expense.category_id || expense.category?.id || "",
      amount: expense.amount ? String(expense.amount) : "",
      dueDay: expense.due_day || expense.dueDay || 1,
      paymentMethod: expense.payment_method_id || expense.payment_method?.id || "",
      supplier: expense.supplier_id || expense.supplier?.id || "",
      status: expense.status || "active",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedExpense) return;
    const amountNumber = Number(modalForm.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto mensual válido.");
      return;
    }
    try {
      const payload = {
        name: modalForm.name.trim(),
        category_id: modalForm.category,
        amount: amountNumber,
        due_day: Number(modalForm.dueDay) || 1,
        payment_method_id: modalForm.paymentMethod,
        supplier_id: modalForm.supplier || null,
        status: modalForm.status,
      };
      await updateItem(selectedExpense.id, payload);
      setSelectedExpense((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto fijo.");
    }
  }

  function closeModal() {
    setSelectedExpense(null);
    setIsEditingModal(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Gastos fijos</h1>
          <p className="page-subtitle">
            Costos mensuales de Bandidos: alquiler, servicios, sueldos, etc.
          </p>
        </div>
        <div className="fixed-expenses-header-actions">
          <select
            value={filters.category_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, category_id: e.target.value }))}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { resetForm(); setFormOpen((v) => !v); }}
          >
            {formOpen ? "Cancelar" : "+ Agregar gasto"}
          </button>
        </div>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {/* Panel de resumen */}
      <div className="card fixed-expenses-summary">
        <div className="fixed-expenses-summary__kpis">
          <div className="fe-kpi">
            <span>Gastos activos</span>
            <strong>{activeExpenses.length}</strong>
          </div>
          <div className="fe-kpi fe-kpi--total">
            <span>Total mensual</span>
            <strong>{formatCurrency(monthlyTotal)}</strong>
          </div>
          <div className="fe-kpi">
            <span>Mayor gasto</span>
            <strong>{topExpense ? formatCurrency(topExpense.amount) : "-"}</strong>
            {topExpense && <small>{topExpense.name}</small>}
          </div>
          <div className="fe-kpi">
            <span>Inactivos</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>

        {byCategory.length > 0 && (
          <div className="fixed-expenses-summary__breakdown">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Por categoría</h3>
            <div className="fe-category-bars">
              {byCategory.map((cat) => {
                const pct = monthlyTotal > 0 ? (cat.total / monthlyTotal) * 100 : 0;
                return (
                  <div key={cat.id} className="fe-category-bar">
                    <div className="fe-category-bar__label">
                      <span className="fe-category-bar__dot" style={{ background: cat.color }} />
                      <span className="fe-category-bar__name">{cat.name}</span>
                      <span className="fe-category-bar__pct">{pct.toFixed(0)}%</span>
                      <span className="fe-category-bar__amount">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="fe-category-bar__track">
                      <div
                        className="fe-category-bar__fill"
                        style={{ width: `${pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Formulario colapsable */}
      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">{editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nombre del gasto</label>
              <input id="name" type="text" name="name" placeholder="Ej: Alquiler local"
                value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="category">Categoría</label>
              <select id="category" name="category" value={form.category} onChange={handleChange} required>
                <option value="">Seleccioná</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="amount">Monto mensual (ARS)</label>
              <input id="amount" type="number" name="amount" min="0" step="100"
                value={form.amount} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="dueDay">Día de vencimiento</label>
              <input id="dueDay" type="number" name="dueDay" min="1" max="31"
                value={form.dueDay} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="paymentMethod">Método de pago</label>
              <select id="paymentMethod" name="paymentMethod" value={form.paymentMethod} onChange={handleChange} required>
                <option value="">Seleccioná</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="supplier">Proveedor</label>
              <select id="supplier" name="supplier" value={form.supplier} onChange={handleChange}>
                <option value="">Seleccioná</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="status">Estado</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Guardar cambios" : "Guardar gasto fijo"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setFormOpen(false); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de gastos */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 className="card-title">Gastos fijos</h2>
            <p className="card-subtitle">{fixedExpenses.length} registros · Hacé clic para editar o eliminar.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && fixedExpenses.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin gastos fijos cargados. Usá el botón "+ Agregar gasto".
          </div>
        )}

        <div className="fe-cards-grid">
          {fixedExpenses.map((e) => {
            const isActive = e.status === "active" || e.status === "Activo";
            const catIdx = categories.findIndex(
              (c) => String(c.id) === String(e.category_id) || String(c.id) === String(e.category?.id)
            );
            const accentColor = catIdx >= 0 ? CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length] : "#8b94a9";
            return (
              <div
                key={e.id}
                className={`fe-card${isActive ? "" : " fe-card--inactive"}`}
                style={{ "--fe-accent": accentColor }}
                onClick={() => setSelectedExpense(e)}
              >
                <div className="fe-card__accent" />
                <div className="fe-card__body">
                  <div className="fe-card__top">
                    <span className="fe-card__name">{e.name}</span>
                    <span className={`fe-card__status${isActive ? " fe-card__status--active" : ""}`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="fe-card__amount">{formatCurrency(e.amount)}<small>/mes</small></div>
                  <div className="fe-card__meta">
                    <span className="fe-card__badge">{categoryName(e)}</span>
                    {e.due_day || e.dueDay ? (
                      <span className="fe-card__meta-item">Vence día {e.due_day || e.dueDay}</span>
                    ) : null}
                    {paymentName(e) !== "-" && (
                      <span className="fe-card__meta-item">{paymentName(e)}</span>
                    )}
                    {supplierName(e) && (
                      <span className="fe-card__meta-item">{supplierName(e)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalle / edición */}
      <Modal isOpen={Boolean(selectedExpense)} onClose={closeModal} title="Detalle del gasto fijo">
        {selectedExpense && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input type="text" value={modalForm.name}
                    onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Categoría</span>
                  <select value={modalForm.category}
                    onChange={(e) => setModalForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">Seleccioná</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Monto mensual (ARS)</span>
                  <input type="number" min="0" step="1" value={modalForm.amount}
                    onChange={(e) => setModalForm((p) => ({ ...p, amount: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Día de vencimiento</span>
                  <input type="number" min="1" max="31" value={modalForm.dueDay}
                    onChange={(e) => setModalForm((p) => ({ ...p, dueDay: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Método de pago</span>
                  <select value={modalForm.paymentMethod}
                    onChange={(e) => setModalForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                    <option value="">Seleccioná</option>
                    {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Proveedor</span>
                  <select value={modalForm.supplier}
                    onChange={(e) => setModalForm((p) => ({ ...p, supplier: e.target.value }))}>
                    <option value="">Seleccioná</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Estado</span>
                  <select value={modalForm.status}
                    onChange={(e) => setModalForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                <div className="fe-modal-detail__amount">{formatCurrency(selectedExpense.amount)}<small>/mes</small></div>
                <div className="fe-modal-detail__rows">
                  <div><strong>Categoría</strong><span>{categoryName(selectedExpense)}</span></div>
                  <div><strong>Día de vencimiento</strong><span>{selectedExpense.due_day || selectedExpense.dueDay || "-"}</span></div>
                  <div><strong>Método de pago</strong><span>{paymentName(selectedExpense)}</span></div>
                  <div><strong>Proveedor</strong><span>{supplierName(selectedExpense) || "-"}</span></div>
                  <div><strong>Estado</strong>
                    <span className={`fe-card__status${selectedExpense.status === "active" || selectedExpense.status === "Activo" ? " fe-card__status--active" : ""}`}>
                      {selectedExpense.status === "active" || selectedExpense.status === "Activo" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setIsEditingModal(false)}>Cancelar</button>
                  <button type="button" className="btn-primary" onClick={handleModalSave}>Guardar cambios</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-danger"
                    onClick={async () => { const ok = await handleDelete(selectedExpense.id); if (ok) closeModal(); }}>
                    Eliminar
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openModalEdit(selectedExpense)}>
                    Editar
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
