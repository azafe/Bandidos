import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { COLOR_PALETTE as TYPE_COLORS } from "../../utils/colorPalette";
import { showApiError } from "../../utils/errorDialog";
import { BOOKING_SIZES } from "../../services/bookingApi";
import "../../styles/booking.css";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDuration(minutes) {
  const m = Number(minutes);
  if (!m) return null;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest} min`;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

const EMPTY_MODAL_FORM = {
  name: "",
  default_price: "",
  duration_minutes: "",
  online_enabled: false,
  description: "",
  size_pricing: Object.fromEntries(BOOKING_SIZES.map(({ value }) => [value, { price: "", duration: "" }])),
};

function toModalForm(item) {
  return {
    name: item.name || "",
    default_price: item.default_price ? String(Number(item.default_price)) : "",
    duration_minutes: item.duration_minutes ? String(item.duration_minutes) : "",
    online_enabled: Boolean(item.online_enabled),
    description: item.description || "",
    size_pricing: Object.fromEntries(
      BOOKING_SIZES.map(({ value }) => {
        const entry = item.size_pricing?.[value] || {};
        return [value, {
          price: entry.price !== null && entry.price !== undefined ? String(entry.price) : "",
          duration: entry.duration ? String(entry.duration) : "",
        }];
      })
    ),
  };
}

const numberOrNull = (value) => (String(value).trim() === "" ? null : Number(value));

// Solo manda los tamaños que tienen algún valor propio; el resto usa los
// valores generales del servicio.
function toPayload(form) {
  const sizePricing = {};
  for (const { value } of BOOKING_SIZES) {
    const price = numberOrNull(form.size_pricing[value].price);
    const duration = numberOrNull(form.size_pricing[value].duration);
    if (price !== null || duration !== null) sizePricing[value] = { price, duration };
  }
  return {
    name: form.name.trim(),
    default_price: numberOrNull(form.default_price),
    duration_minutes: numberOrNull(form.duration_minutes),
    online_enabled: form.online_enabled,
    description: form.description.trim() || null,
    size_pricing: sizePricing,
  };
}

function validateDurations(form) {
  const values = [form.duration_minutes, ...BOOKING_SIZES.map(({ value }) => form.size_pricing[value].duration)];
  return values.every((v) => String(v).trim() === "" || (Number(v) >= 5 && Number(v) <= 600 && Number.isInteger(Number(v))));
}

export default function ServiceTypesPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/service-types");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", default_price: "" });
  const [editingId, setEditingId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState(EMPTY_MODAL_FORM);

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
      showApiError(err, "No se pudo guardar el tipo de servicio.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este tipo de servicio?")) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      showApiError(err, "No se pudo eliminar el tipo.");
      return false;
    }
  }

  function openModalEdit(item) {
    setModalForm(toModalForm(item));
    setIsEditingModal(true);
  }

  function setSizeField(size, field, value) {
    setModalForm((p) => ({
      ...p,
      size_pricing: { ...p.size_pricing, [size]: { ...p.size_pricing[size], [field]: value } },
    }));
  }

  async function handleModalSave() {
    if (!selectedType) return;
    if (!modalForm.name.trim()) {
      alert("Ingresá el nombre del servicio.");
      return;
    }
    if (!validateDurations(modalForm)) {
      alert("Las duraciones tienen que ser minutos enteros entre 5 y 600.");
      return;
    }
    try {
      const payload = toPayload(modalForm);
      await updateItem(selectedType.id, payload);
      setSelectedType((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      showApiError(err, "No se pudo guardar el tipo de servicio.");
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
                  <div className="fe-card__meta">
                    {item.default_price && <span className="fe-card__meta-item">precio sugerido</span>}
                    {formatDuration(item.duration_minutes) && (
                      <span className="fe-card__meta-item">{formatDuration(item.duration_minutes)}</span>
                    )}
                    {item.online_enabled && <span className="fe-card__meta-item">🌐 En la web</span>}
                  </div>
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
                <label className="form-field">
                  <span>Duración (minutos)</span>
                  <input
                    type="number" min="5" max="600" step="5" placeholder="Ej: 60"
                    value={modalForm.duration_minutes}
                    onChange={(e) => setModalForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                  />
                </label>

                <div className="service-online">
                  <label className="service-online__toggle">
                    <input
                      type="checkbox"
                      checked={modalForm.online_enabled}
                      onChange={(e) => setModalForm((p) => ({ ...p, online_enabled: e.target.checked }))}
                    />
                    <span>Ofrecer en la web de reservas</span>
                  </label>
                  {modalForm.online_enabled && (
                    <>
                      <label className="form-field">
                        <span>Descripción para el cliente (opcional)</span>
                        <textarea
                          rows={2} maxLength={500}
                          placeholder="Ej: Baño con shampoo neutro, secado y perfume."
                          value={modalForm.description}
                          onChange={(e) => setModalForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </label>
                      <p className="service-online__hint">
                        Precio y duración por tamaño. Si dejás un tamaño vacío se usan el precio y la duración de arriba.
                      </p>
                      <div className="service-sizes">
                        <span />
                        <span className="service-sizes__head">Precio</span>
                        <span className="service-sizes__head">Minutos</span>
                        {BOOKING_SIZES.map(({ value, label }) => (
                          <div key={value} className="service-sizes__row">
                            <span className="service-sizes__label">{label}</span>
                            <input
                              type="number" min="0" step="100" aria-label={`Precio ${label}`}
                              placeholder={modalForm.default_price || "-"}
                              value={modalForm.size_pricing[value].price}
                              onChange={(e) => setSizeField(value, "price", e.target.value)}
                            />
                            <input
                              type="number" min="5" max="600" step="5" aria-label={`Minutos ${label}`}
                              placeholder={modalForm.duration_minutes || "60"}
                              value={modalForm.size_pricing[value].duration}
                              onChange={(e) => setSizeField(value, "duration", e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
                  <div>
                    <strong>Duración</strong>
                    <span>{formatDuration(selectedType.duration_minutes) || "Sin cargar (se toma 1 h)"}</span>
                  </div>
                  <div>
                    <strong>Web de reservas</strong>
                    <span>{selectedType.online_enabled ? "🌐 Se ofrece online" : "Solo uso interno"}</span>
                  </div>
                  {selectedType.online_enabled &&
                    BOOKING_SIZES.filter(({ value }) => selectedType.size_pricing?.[value]).map(({ value, label }) => {
                      const entry = selectedType.size_pricing[value];
                      return (
                        <div key={value}>
                          <strong>{label}</strong>
                          <span>
                            {entry.price !== null && entry.price !== undefined ? formatPrice(entry.price) : formatPrice(selectedType.default_price)}
                            {" · "}
                            {formatDuration(entry.duration || selectedType.duration_minutes) || "1 h"}
                          </span>
                        </div>
                      );
                    })}
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
