// src/pages/suppliers/SuppliersPage.jsx
import { useMemo, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const SUPPLIER_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

function supplierColor(name) {
  if (!name) return SUPPLIER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUPPLIER_COLORS[Math.abs(hash) % SUPPLIER_COLORS.length];
}

function initial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function SuppliersPage() {
  const [filters, setFilters] = useState({ q: "", category: "" });
  const {
    items: suppliers, loading, error, createItem, updateItem, deleteItem,
  } = useApiResource("/v2/suppliers", filters);
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", phone: "", payment: "", notes: "" });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({ name: "", category: "", phone: "", payment_method_id: "", notes: "" });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const cats = suppliers.map((s) => s.category).filter(Boolean);
    return [...new Set(cats)];
  }, [suppliers]);

  const paymentMethodById = useMemo(
    () => new Map(paymentMethods.map((m) => [m.id, m.name])),
    [paymentMethods]
  );

  function paymentName(s) {
    return s.payment_method?.name || paymentMethodById.get(s.payment_method_id) || "";
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function resetForm() {
    setForm({ name: "", category: "", phone: "", payment: "", notes: "" });
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert("Ingresá el nombre del proveedor."); return; }
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        phone: form.phone.trim(),
        payment_method_id: form.payment || null,
        notes: form.notes.trim(),
      };
      if (editingId) { await updateItem(editingId, payload); }
      else           { await createItem(payload); }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el proveedor.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este proveedor?")) return false;
    try { await deleteItem(id); return true; }
    catch (err) { alert(err.message || "No se pudo eliminar el proveedor."); return false; }
  }

  function openModalEdit(s) {
    setModalForm({ name: s.name || "", category: s.category || "", phone: s.phone || "", payment_method_id: s.payment_method_id || "", notes: s.notes || "" });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedSupplier) return;
    if (!modalForm.name.trim()) { alert("Ingresá el nombre del proveedor."); return; }
    try {
      const payload = {
        name: modalForm.name.trim(),
        category: modalForm.category.trim(),
        phone: modalForm.phone.trim(),
        payment_method_id: modalForm.payment_method_id || null,
        notes: modalForm.notes.trim(),
      };
      await updateItem(selectedSupplier.id, payload);
      setSelectedSupplier((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el proveedor.");
    }
  }

  function closeModal() { setSelectedSupplier(null); setIsEditingModal(false); }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Insumos, snacks y servicios de Bandidos.</p>
        </div>
        <div className="fixed-expenses-header-actions">
          <input
            className="pets-search-input"
            type="text"
            placeholder="Buscar proveedor…"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
          <input
            className="pets-search-input"
            type="text"
            placeholder="Filtrar por rubro…"
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => { resetForm(); setFormOpen((v) => !v); }}
          >
            {formOpen ? "Cancelar" : "+ Nuevo proveedor"}
          </button>
        </div>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {/* KPIs */}
      <div className="card fixed-expenses-summary" style={{ marginBottom: 16 }}>
        <div className="fixed-expenses-summary__kpis">
          <div className="fe-kpi">
            <span>Total proveedores</span>
            <strong>{suppliers.length}</strong>
          </div>
          <div className="fe-kpi fe-kpi--total">
            <span>Rubros distintos</span>
            <strong>{uniqueCategories.length}</strong>
          </div>
          {uniqueCategories.slice(0, 2).map((cat) => (
            <div key={cat} className="fe-kpi">
              <span>{cat}</span>
              <strong>{suppliers.filter((s) => s.category === cat).length}</strong>
              <small>proveedores</small>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario colapsable */}
      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">{editingId ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nombre</label>
              <input id="name" name="name" type="text" placeholder="Ej: Pet Shop Tucumán" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="category">Rubro</label>
              <input id="category" name="category" type="text" placeholder="Ej: Insumos, Snacks, Veterinaria" value={form.category} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="phone">Teléfono</label>
              <input id="phone" name="phone" type="text" placeholder="Ej: 381-555-5555" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="payment">Método de pago preferido</label>
              <select id="payment" name="payment" value={form.payment} onChange={handleChange}>
                <option value="">Seleccioná</option>
                {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="notes">Notas</label>
              <textarea id="notes" name="notes" rows={3} placeholder="Descuentos, horarios, condiciones, etc." value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "Guardar cambios" : "Guardar proveedor"}</button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setFormOpen(false); }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Grid de cards */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 className="card-title">Proveedores</h2>
            <p className="card-subtitle">{suppliers.length} registros · Hacé clic para ver detalle.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && suppliers.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin proveedores cargados. Usá el botón "+ Nuevo proveedor".
          </div>
        )}

        <div className="supplier-cards-grid">
          {suppliers.map((s) => {
            const color = supplierColor(s.name);
            const payment = paymentName(s);
            return (
              <div
                key={s.id}
                className="supplier-card"
                style={{ "--sup-color": color }}
                onClick={() => setSelectedSupplier(s)}
              >
                <div className="supplier-card__accent" style={{ background: color }} />
                <div className="supplier-card__body">
                  <div className="supplier-card__header">
                    <span className="supplier-card__avatar" style={{ background: color }}>
                      {initial(s.name)}
                    </span>
                    <div className="supplier-card__header-info">
                      <div className="supplier-card__name">{s.name}</div>
                      {s.category && (
                        <span className="supplier-card__category">{s.category}</span>
                      )}
                    </div>
                  </div>

                  <div className="supplier-card__meta">
                    {s.phone && (
                      <span className="employee-card__contact-item">
                        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/></svg>
                        {s.phone}
                      </span>
                    )}
                    {payment && (
                      <span className="fe-card__badge">{payment}</span>
                    )}
                  </div>

                  {s.notes && (
                    <p className="employee-card__notes">
                      {s.notes.length > 70 ? s.notes.slice(0, 70) + "…" : s.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalle / edición */}
      <Modal isOpen={Boolean(selectedSupplier)} onClose={closeModal} title="Proveedor">
        {selectedSupplier && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field"><span>Nombre</span>
                  <input type="text" value={modalForm.name} onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="form-field"><span>Rubro</span>
                  <input type="text" value={modalForm.category} onChange={(e) => setModalForm((p) => ({ ...p, category: e.target.value }))} />
                </label>
                <label className="form-field"><span>Teléfono</span>
                  <input type="text" value={modalForm.phone} onChange={(e) => setModalForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
                <label className="form-field"><span>Método de pago</span>
                  <select value={modalForm.payment_method_id} onChange={(e) => setModalForm((p) => ({ ...p, payment_method_id: e.target.value }))}>
                    <option value="">Seleccioná</option>
                    {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <label className="form-field"><span>Notas</span>
                  <textarea rows={3} value={modalForm.notes} onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                <div className="pet-modal-header">
                  <div className="pet-modal-avatar" style={{ background: supplierColor(selectedSupplier.name) }}>
                    {initial(selectedSupplier.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{selectedSupplier.name}</div>
                    {selectedSupplier.category && (
                      <span className="supplier-card__category">{selectedSupplier.category}</span>
                    )}
                  </div>
                </div>
                <div className="fe-modal-detail__rows">
                  <div><strong>Teléfono</strong><span>{selectedSupplier.phone || "-"}</span></div>
                  <div><strong>Método de pago</strong><span>{paymentName(selectedSupplier) || "-"}</span></div>
                  {selectedSupplier.notes && (
                    <div style={{ flexDirection: "column", alignItems: "flex-start" }}>
                      <strong>Notas</strong>
                      <span style={{ marginTop: 4, fontSize: "0.88rem" }}>{selectedSupplier.notes}</span>
                    </div>
                  )}
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
                    onClick={async () => { const ok = await handleDelete(selectedSupplier.id); if (ok) closeModal(); }}>
                    Eliminar
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openModalEdit(selectedSupplier)}>
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
