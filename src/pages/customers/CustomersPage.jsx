import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";

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

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                    Sin clientes cargados.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email}</td>
                    <td>{customer.notes}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => startEdit(customer)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(customer.id)}
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
