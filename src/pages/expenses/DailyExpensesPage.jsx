// src/pages/expenses/DailyExpensesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const CATEGORY_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

export default function DailyExpensesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ from: "", to: "", category_id: "" });
  const {
    items: expenses,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/daily-expenses", filters);
  const { items: categories } = useApiResource("/v2/expense-categories");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: suppliers } = useApiResource("/v2/suppliers");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    date: today,
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    supplier: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    date: today,
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    supplier: "",
  });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalPeriod = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const topExpense = expenses.reduce(
    (top, e) => (Number(e.amount) > Number(top?.amount || 0) ? e : top),
    null
  );

  const byCategory = categories
    .map((cat, idx) => {
      const exps = expenses.filter(
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

  function formatDate(value) {
    if (!value) return "-";
    const raw = String(value);
    const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return raw;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  function getNameById(list, id) {
    if (!id) return "";
    return list.find((item) => String(item.id) === String(id))?.name || "";
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

  function getCategoryColor(e) {
    const idx = categories.findIndex(
      (c) => String(c.id) === String(e.category_id) || String(c.id) === String(e.category?.id)
    );
    return idx >= 0 ? CATEGORY_COLORS[idx % CATEGORY_COLORS.length] : "#8b94a9";
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({ date: today, category: "", description: "", amount: "", paymentMethod: "", supplier: "" });
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto válido.");
      return;
    }
    try {
      const payload = {
        date: form.date,
        category_id: form.category,
        description: form.description || "(Sin detalle)",
        amount: amountNumber,
        payment_method_id: form.paymentMethod,
        supplier_id: form.supplier || null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este gasto?")) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el gasto.");
      return false;
    }
  }

  function openModalEdit(expense) {
    setModalForm({
      date: expense.date || today,
      category: expense.category_id || expense.category?.id || "",
      description: expense.description || "",
      amount: expense.amount ? String(expense.amount) : "",
      paymentMethod: expense.payment_method_id || expense.payment_method?.id || "",
      supplier: expense.supplier_id || expense.supplier?.id || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedExpense) return;
    const amountNumber = Number(modalForm.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto válido.");
      return;
    }
    try {
      const payload = {
        date: modalForm.date,
        category_id: modalForm.category,
        description: modalForm.description || "(Sin detalle)",
        amount: amountNumber,
        payment_method_id: modalForm.paymentMethod,
        supplier_id: modalForm.supplier || null,
      };
      await updateItem(selectedExpense.id, payload);
      setSelectedExpense((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto.");
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
          <h1 className="page-title">Gastos diarios</h1>
          <p className="page-subtitle">
            Registrá los gastos del día a día: shampoo, limpieza, snacks, mantenimiento menor, etc.
          </p>
        </div>
        <div className="fixed-expenses-header-actions">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            title="Fecha desde"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            title="Fecha hasta"
          />
          <select
            value={filters.category_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, category_id: e.target.value }))}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
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
          <div className="fe-kpi fe-kpi--total">
            <span>Total del período</span>
            <strong>{formatCurrency(totalPeriod)}</strong>
          </div>
          <div className="fe-kpi">
            <span>Cantidad de gastos</span>
            <strong>{expenses.length}</strong>
          </div>
          <div className="fe-kpi">
            <span>Mayor gasto</span>
            <strong>{topExpense ? formatCurrency(topExpense.amount) : "-"}</strong>
            {topExpense && <small>{topExpense.description || categoryName(topExpense)}</small>}
          </div>
          <div className="fe-kpi">
            <span>Categorías activas</span>
            <strong>{byCategory.length}</strong>
          </div>
        </div>

        {byCategory.length > 0 && (
          <div className="fixed-expenses-summary__breakdown">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Por categoría</h3>
            <div className="fe-category-bars">
              {byCategory.map((cat) => {
                const pct = totalPeriod > 0 ? (cat.total / totalPeriod) * 100 : 0;
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
          <h2 className="card-title">{editingId ? "Editar gasto" : "Nuevo gasto"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="date">Fecha</label>
              <input id="date" type="date" name="date" value={form.date} onChange={handleChange} required />
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
              <label htmlFor="description">Descripción</label>
              <input
                id="description" type="text" name="description"
                value={form.description} onChange={handleChange}
                placeholder="Ej: Shampoo para pelaje largo"
              />
            </div>
            <div className="form-field">
              <label htmlFor="amount">Monto (ARS)</label>
              <input
                id="amount" type="number" name="amount"
                value={form.amount} onChange={handleChange}
                min="0" step="100" required
              />
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
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Guardar cambios" : "Guardar gasto"}
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
            <h2 className="card-title">Gastos registrados</h2>
            <p className="card-subtitle">{expenses.length} registros · Hacé clic para editar o eliminar.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && expenses.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin gastos cargados. Usá el botón "+ Agregar gasto".
          </div>
        )}

        <div className="fe-cards-grid">
          {expenses.map((e) => {
            const accentColor = getCategoryColor(e);
            return (
              <div
                key={e.id}
                className="fe-card"
                style={{ "--fe-accent": accentColor }}
                onClick={() => setSelectedExpense(e)}
              >
                <div className="fe-card__accent" />
                <div className="fe-card__body">
                  <div className="fe-card__top">
                    <span className="fe-card__name">{e.description || "(Sin detalle)"}</span>
                    <span className="fe-card__date-badge">{formatDate(e.date)}</span>
                  </div>
                  <div className="fe-card__amount">{formatCurrency(e.amount)}</div>
                  <div className="fe-card__meta">
                    <span className="fe-card__badge">{categoryName(e)}</span>
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
      <Modal isOpen={Boolean(selectedExpense)} onClose={closeModal} title="Detalle del gasto">
        {selectedExpense && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={modalForm.date}
                    onChange={(e) => setModalForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Categoría</span>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="">Seleccioná</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Descripción</span>
                  <input
                    type="text"
                    value={modalForm.description}
                    onChange={(e) => setModalForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Monto (ARS)</span>
                  <input
                    type="number" min="0" step="1"
                    value={modalForm.amount}
                    onChange={(e) => setModalForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Método de pago</span>
                  <select
                    value={modalForm.paymentMethod}
                    onChange={(e) => setModalForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  >
                    <option value="">Seleccioná</option>
                    {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Proveedor</span>
                  <select
                    value={modalForm.supplier}
                    onChange={(e) => setModalForm((p) => ({ ...p, supplier: e.target.value }))}
                  >
                    <option value="">Seleccioná</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                <div className="fe-modal-detail__amount">{formatCurrency(selectedExpense.amount)}</div>
                <div className="fe-modal-detail__rows">
                  <div><strong>Fecha</strong><span>{formatDate(selectedExpense.date)}</span></div>
                  <div><strong>Categoría</strong><span>{categoryName(selectedExpense)}</span></div>
                  <div><strong>Descripción</strong><span>{selectedExpense.description || "-"}</span></div>
                  <div><strong>Método de pago</strong><span>{paymentName(selectedExpense)}</span></div>
                  <div><strong>Proveedor</strong><span>{supplierName(selectedExpense) || "-"}</span></div>
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
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => { const ok = await handleDelete(selectedExpense.id); if (ok) closeModal(); }}
                  >
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
