import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function ServiceTypesPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/service-types");
  const [form, setForm] = useState({ name: "", default_price: "" });
  const [editingId, setEditingId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

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
        default_price: form.default_price
          ? Number(form.default_price)
          : null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el tipo de servicio.");
      return;
    }
    setForm({ name: "", default_price: "" });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este tipo de servicio?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el tipo.");
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      default_price: item.default_price ? String(item.default_price) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", default_price: "" });
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Tipos de servicio</h1>
          <p className="page-subtitle">
            Configurá los servicios disponibles y sus precios sugeridos.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar tipo" : "Nuevo tipo"}
        </h2>
        <p className="card-subtitle">Usalo para el formulario de servicios.</p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="default_price">Precio sugerido</label>
            <input
              id="default_price"
              name="default_price"
              type="number"
              min="0"
              step="100"
              value={form.default_price}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar tipo"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de tipos</h2>
        <p className="card-subtitle">Todos los servicios cargados.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {items.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin tipos cargados.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => setSelectedType(item)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{item.name}</div>
                  <div className="list-item__actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(item);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="list-item__meta">
                  <span>Precio sugerido: {item.default_price ? `$${Number(item.default_price).toLocaleString("es-AR")}` : "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedType)}
        onClose={() => setSelectedType(null)}
        title="Detalle del tipo de servicio"
      >
        {selectedType && (
          <>
            <div>
              <strong>Nombre:</strong> {selectedType.name || "-"}
            </div>
            <div>
              <strong>Precio sugerido:</strong>{" "}
              {selectedType.default_price
                ? `$${Number(selectedType.default_price).toLocaleString("es-AR")}`
                : "-"}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
