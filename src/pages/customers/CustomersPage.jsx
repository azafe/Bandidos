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
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el cliente.");
    }
  }

  function startEdit(customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      notes: customer.notes || "",
    });
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
                  <div className="list-item__actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(customer);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(customer.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
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
        onClose={() => setSelectedCustomer(null)}
        title="Detalle del cliente"
      >
        {selectedCustomer && (
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
      </Modal>
    </div>
  );
}
