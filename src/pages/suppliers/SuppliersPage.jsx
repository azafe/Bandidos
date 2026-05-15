// src/pages/suppliers/SuppliersPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";

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

function fmt(n) {
  return `$${Math.round(Number(n || 0)).toLocaleString("es-AR")}`;
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: "", category: "" });
  const {
    items: suppliers, loading, error, createItem, updateItem,
  } = useApiResource("/v2/suppliers", filters);
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", phone: "", payment: "", notes: "" });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const cats = suppliers.map((s) => s.category).filter(Boolean);
    return [...new Set(cats)];
  }, [suppliers]);

  const totalSaldo = useMemo(
    () => suppliers.reduce((acc, s) => acc + Number(s.saldo || 0), 0),
    [suppliers]
  );

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
          <div className="fe-kpi fe-kpi--total">
            <span>Saldo total pendiente</span>
            <strong style={{ color: totalSaldo === 0 ? "#22c55e" : "#f97316" }}>
              {fmt(totalSaldo)}
            </strong>
          </div>
          {uniqueCategories.slice(0, 1).map((cat) => (
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
            <p className="card-subtitle">{suppliers.length} registros · Hacé clic para ver la cuenta corriente.</p>
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
            const saldo = Number(s.saldo || 0);
            return (
              <div
                key={s.id}
                className="supplier-card"
                style={{ "--sup-color": color, cursor: "pointer" }}
                onClick={() => navigate(`/suppliers/${s.id}`)}
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

                  <div className="supplier-card__saldo">
                    <span
                      className="supplier-card__saldo-badge"
                      style={{
                        background: saldo === 0 ? "#22c55e20" : "#f9731620",
                        color:      saldo === 0 ? "#22c55e"   : "#f97316",
                      }}
                    >
                      {saldo === 0 ? "Al día" : `Debe ${fmt(saldo)}`}
                    </span>
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
    </div>
  );
}
