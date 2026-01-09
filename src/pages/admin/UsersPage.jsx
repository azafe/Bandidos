import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { useAuth } from "../../context/AuthContext";

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/users");
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "staff",
  });
  const [editingId, setEditingId] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      alert("Ingresá email.");
      return;
    }
    if (!editingId && !form.password) {
      alert("Ingresá una contraseña.");
      return;
    }
    try {
      const payload = {
        email: form.email.trim(),
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo crear el usuario.");
      return;
    }
    setForm({ email: "", password: "", role: "staff" });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este usuario?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el usuario.");
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      email: item.email || "",
      password: "",
      role: item.role || "staff",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ email: "", password: "", role: "staff" });
  }

  if (!isAdmin) {
    return (
      <div className="page-content">
        <div className="card">
          Este módulo es exclusivo para administradores.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">
            Gestión de accesos y roles del sistema.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar usuario" : "Nuevo usuario"}
        </h2>
        <p className="card-subtitle">
          Creá accesos para el equipo administrativo.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar usuario"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de usuarios</h2>
        <p className="card-subtitle">
          Usuarios actuales con acceso al sistema.
        </p>

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
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: 16 }}>
                    Sin usuarios cargados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
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
