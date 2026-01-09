import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function ExpenseCategoriesPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/expense-categories");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Ingresá el nombre de la categoría.");
      return;
    }
    try {
      if (editingId) {
        await updateItem(editingId, { name: name.trim() });
      } else {
        await createItem({ name: name.trim() });
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar la categoría.");
      return;
    }
    setName("");
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar esta categoría?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar la categoría.");
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setName(item.name || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Categorías de gastos</h1>
          <p className="page-subtitle">
            Organizá los gastos diarios y fijos por categoría.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar categoría" : "Nueva categoría"}
        </h2>
        <p className="card-subtitle">Aparece en formularios de gastos.</p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar categoría"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de categorías</h2>
        <p className="card-subtitle">Categorías registradas.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {items.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin categorías cargadas.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => setSelectedCategory(item)}
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
                  <span>Nombre: {item.name || "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        title="Detalle de la categoría"
      >
        {selectedCategory && (
          <div>
            <strong>Nombre:</strong> {selectedCategory.name || "-"}
          </div>
        )}
      </Modal>
    </div>
  );
}
