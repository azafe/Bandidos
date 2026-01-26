import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    email: "",
    password: "",
    role: "staff",
  });

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
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el usuario.");
      return false;
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ email: "", password: "", role: "staff" });
  }

  function openModalEdit(item) {
    setModalForm({
      email: item.email || "",
      password: "",
      role: item.role || "staff",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedUser) return;
    if (!modalForm.email.trim()) {
      alert("Ingresá email.");
      return;
    }
    try {
      const payload = {
        email: modalForm.email.trim(),
        role: modalForm.role,
        ...(modalForm.password ? { password: modalForm.password } : {}),
      };
      await updateItem(selectedUser.id, payload);
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              email: modalForm.email.trim(),
              role: modalForm.role,
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el usuario.");
    }
  }

  function closeModal() {
    setSelectedUser(null);
    setIsEditingModal(false);
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

        <div className="list-wrapper">
          {items.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin usuarios cargados.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => setSelectedUser(item)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{item.email}</div>
                </div>
                <div className="list-item__meta">
                  <span>Rol: {item.role || "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={closeModal}
        title="Detalle del usuario"
      >
        {selectedUser && (
          <>
            {isEditingModal ? (
              <>
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
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={modalForm.password}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Rol</span>
                  <select
                    value={modalForm.role}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <div>
                  <strong>Email:</strong> {selectedUser.email || "-"}
                </div>
                <div>
                  <strong>Rol:</strong> {selectedUser.role || "-"}
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
                    onClick={() => openModalEdit(selectedUser)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedUser.id);
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
