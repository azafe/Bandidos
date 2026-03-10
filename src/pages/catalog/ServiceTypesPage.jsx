import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const TYPE_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
  "#6366f1", "#ec4899",
];

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

export default function ServiceTypesPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/service-types");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", default_price: "" });
  const [editingId, setEditingId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({ name: "", default_price: "" });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const priced = items.filter((i) => i.default_price);
  const avgPrice = priced.length
    ? priced.reduce((s, i) => s + Number(i.default_price), 0) / priced.length
    : null;
  const maxItem = priced.reduce(
    (top, i) => (Number(i.default_price) > Number(top?.default_price || 0) ? i : top),
    null
  );
  const minItem = priced.reduce(
    (low, i) => (Number(i.default_price) < Number(low?.default_price ?? Infinity) ? i : low),
    null
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  function resetForm() {
    setForm({ name: "", default_price: "" });
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá el nombre del servicio.");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        default_price: form.default_price ? Number(form.default_price) : null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el tipo de servicio.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este tipo de servicio?")) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el tipo.");
      return false;
    }
  }

  function openModalEdit(item) {
    setModalForm({
      name: item.name || "",
      default_price: item.default_price ? String(item.default_price) : "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedType) return;
    if (!modalForm.name.trim()) {
      alert("Ingresá el nombre del servicio.");
      return;
    }
    try {
      const payload = {
        name: modalForm.name.trim(),
        default_price: modalForm.default_price ? Number(modalForm.default_price) : null,
      };
      await updateItem(selectedType.id, payload);
      setSelectedType((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el tipo de servicio.");
    }
  }

  function closeModal() {
    setSelectedType(null);
    setIsEditingModal(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Tipos de servicio</h1>
          <p className="page-subtitle">
            Configurá los servicios disponibles y sus precios sugeridos.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { resetForm(); setFormOpen((v) => !v); }}
        >
          {formOpen ? "Cancelar" : "+ Nuevo tipo"}
        </button>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {/* KPIs */}
      <div className="card fixed-expenses-summary" style={{ marginBottom: 16 }}>
        <div className="fixed-expenses-summary__kpis">
          <div className="fe-kpi">
            <span>Tipos de servicio</span>
            <strong>{items.length}</strong>
          </div>
          <div className="fe-kpi fe-kpi--total">
            <span>Precio promedio</span>
            <strong>{avgPrice !== null ? formatPrice(Math.round(avgPrice)) : "-"}</strong>
          </div>
          <div className="fe-kpi">
            <span>Precio más alto</span>
            <strong>{maxItem ? formatPrice(maxItem.default_price) : "-"}</strong>
            {maxItem && <small>{maxItem.name}</small>}
          </div>
          <div className="fe-kpi">
            <span>Precio más bajo</span>
            <strong>{minItem ? formatPrice(minItem.default_price) : "-"}</strong>
            {minItem && <small>{minItem.name}</small>}
          </div>
        </div>
      </div>

      {/* Formulario colapsable */}
      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">{editingId ? "Editar tipo" : "Nuevo tipo de servicio"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nombre</label>
              <input
                id="name" name="name" type="text"
                value={form.name} onChange={handleChange}
                placeholder="Ej: Baño y corte" required
              />
            </div>
            <div className="form-field">
              <label htmlFor="default_price">Precio sugerido (ARS)</label>
              <input
                id="default_price" name="default_price" type="number"
                min="0" step="100"
                value={form.default_price} onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Guardar cambios" : "Guardar tipo"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setFormOpen(false); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Grid de cards */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 className="card-title">Servicios configurados</h2>
            <p className="card-subtitle">{items.length} tipos · Hacé clic para editar o eliminar.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && items.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin tipos cargados. Usá el botón "+ Nuevo tipo".
          </div>
        )}

        <div className="fe-cards-grid">
          {items.map((item, idx) => {
            const color = TYPE_COLORS[idx % TYPE_COLORS.length];
            return (
              <div
                key={item.id}
                className="fe-card"
                style={{ "--fe-accent": color }}
                onClick={() => setSelectedType(item)}
              >
                <div className="fe-card__accent" />
                <div className="fe-card__body">
                  <div className="fe-card__top">
                    <span className="fe-card__name">{item.name}</span>
                  </div>
                  <div className="fe-card__amount">
                    {item.default_price ? formatPrice(item.default_price) : (
                      <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--color-text-muted)" }}>
                        Sin precio sugerido
                      </span>
                    )}
                  </div>
                  {item.default_price && (
                    <div className="fe-card__meta">
                      <span className="fe-card__meta-item">precio sugerido</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalle / edición */}
      <Modal isOpen={Boolean(selectedType)} onClose={closeModal} title="Tipo de servicio">
        {selectedType && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={modalForm.name}
                    onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Precio sugerido (ARS)</span>
                  <input
                    type="number" min="0" step="100"
                    value={modalForm.default_price}
                    onChange={(e) => setModalForm((p) => ({ ...p, default_price: e.target.value }))}
                  />
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                <div className="fe-modal-detail__amount">
                  {formatPrice(selectedType.default_price)}
                  {selectedType.default_price && <small>precio sugerido</small>}
                </div>
                <div className="fe-modal-detail__rows">
                  <div>
                    <strong>Nombre</strong>
                    <span>{selectedType.name}</span>
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
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => { const ok = await handleDelete(selectedType.id); if (ok) closeModal(); }}
                  >
                    Eliminar
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openModalEdit(selectedType)}>
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
