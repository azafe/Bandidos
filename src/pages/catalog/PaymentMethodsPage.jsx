import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";

export default function PaymentMethodsPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/payment-methods");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Ingresá el nombre del método.");
      return;
    }
    try {
      if (editingId) {
        await updateItem(editingId, { name: name.trim() });
      } else {
        await createItem({ name: name.trim() });
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el método.");
      return;
    }
    setName("");
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este método de pago?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el método.");
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
          <h1 className="page-title">Métodos de pago</h1>
          <p className="page-subtitle">
            Administrá los métodos de pago disponibles.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar método" : "Nuevo método"}
        </h2>
        <p className="card-subtitle">Aparece en servicios y gastos.</p>

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
            {editingId ? "Guardar cambios" : "Guardar método"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de métodos</h2>
        <p className="card-subtitle">Métodos configurados en el sistema.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", padding: 16 }}>
                    Sin métodos cargados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => startEdit(item)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(item.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
