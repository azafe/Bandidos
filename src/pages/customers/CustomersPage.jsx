import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const {
    items: customers,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/customers", search ? { q: search } : undefined);
  const [editingId, setEditingId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    try {
      if (editingId) {
        await updateItem(editingId, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        });
      } else {
        await createItem({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        });
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el cliente.");
      return;
    }

    setForm({
      name: "",
      phone: "",
      email: "",
      notes: "",
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este cliente?");
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el cliente.");
      return false;
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      notes: "",
    });
  }

  function openModalEdit(customer) {
    setModalForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      notes: customer.notes || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedCustomer) return;
    if (!modalForm.name.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }
    try {
      await updateItem(selectedCustomer.id, {
        name: modalForm.name.trim(),
        phone: modalForm.phone.trim(),
        email: modalForm.email.trim(),
        notes: modalForm.notes.trim(),
      });
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: modalForm.name.trim(),
              phone: modalForm.phone.trim(),
              email: modalForm.email.trim(),
              notes: modalForm.notes.trim(),
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el cliente.");
    }
  }

  function closeModal() {
    setSelectedCustomer(null);
    setIsEditingModal(false);
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            Registro de dueños y datos de contacto.
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "8px 14px",
            background: "#12131a",
            color: "#fff",
            minWidth: 260,
          }}
        />
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar cliente" : "Nuevo cliente"}
        </h2>
        <p className="card-subtitle">
          Cargá los datos para asociar mascotas y servicios.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre completo</label>
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
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar cliente"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de clientes</h2>
        <p className="card-subtitle">Clientes registrados en Bandidos.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {customers.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin clientes cargados.
            </div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                className="list-item"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{customer.name}</div>
                </div>
                <div className="list-item__meta">
                  <span>Tel: {customer.phone || "-"}</span>
                  <span>Email: {customer.email || "-"}</span>
                </div>
                {customer.notes && (
                  <div className="list-item__meta">
                    <span>Notas: {truncate(customer.notes, 80)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={closeModal}
        title="Detalle del cliente"
      >
        {selectedCustomer && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={modalForm.name}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Teléfono</span>
                  <input
                    type="text"
                    value={modalForm.phone}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={modalForm.email}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Notas</span>
                  <textarea
                    rows={3}
                    value={modalForm.notes}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <div>
                  <strong>Nombre:</strong> {selectedCustomer.name || "-"}
                </div>
                <div>
                  <strong>Teléfono:</strong> {selectedCustomer.phone || "-"}
                </div>
                <div>
                  <strong>Email:</strong> {selectedCustomer.email || "-"}
                </div>
                <div>
                  <strong>Notas:</strong> {selectedCustomer.notes || "-"}
                </div>
              </>
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
                    onClick={() => openModalEdit(selectedCustomer)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedCustomer.id);
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
