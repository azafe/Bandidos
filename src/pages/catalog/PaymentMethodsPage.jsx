import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function PaymentMethodsPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/payment-methods");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalName, setModalName] = useState("");

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
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el método.");
      return false;
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
  }

  function openModalEdit(item) {
    setModalName(item.name || "");
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedMethod) return;
    if (!modalName.trim()) {
      alert("Ingresá el nombre del método.");
      return;
    }
    try {
      await updateItem(selectedMethod.id, { name: modalName.trim() });
      setSelectedMethod((prev) =>
        prev ? { ...prev, name: modalName.trim() } : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el método.");
    }
  }

  function closeModal() {
    setSelectedMethod(null);
    setIsEditingModal(false);
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

        <div className="list-wrapper">
          {items.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin métodos cargados.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => setSelectedMethod(item)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{item.name}</div>
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
        isOpen={Boolean(selectedMethod)}
        onClose={closeModal}
        title="Detalle del método"
      >
        {selectedMethod && (
          <>
            {isEditingModal ? (
              <label className="form-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                />
              </label>
            ) : (
              <div>
                <strong>Nombre:</strong> {selectedMethod.name || "-"}
              </div>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleModalSave}
                  >
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openModalEdit(selectedMethod)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedMethod.id);
                      if (removed) closeModal();
                    }}
                  >
                    Eliminar
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
