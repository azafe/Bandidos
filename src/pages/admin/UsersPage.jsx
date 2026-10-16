import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { showApiError } from "../../utils/errorDialog";
import ChoferAccessEditor from "../../components/traslados/ChoferAccessEditor";
import "../../styles/traslados.css";

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { items, loading, error, createItem, updateItem, deleteItem, refresh } =
    useApiResource("/v2/users");
  const employees = useApiResource("/v2/employees");
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "staff",
    chofer_id: "",
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
    if (form.password && form.password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    try {
      const payload = {
        email: form.email.trim(),
        role: form.role,
        ...(form.chofer_id ? { chofer_id: form.chofer_id } : {}),
        ...(form.password ? { password: form.password } : {}),
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      showApiError(err, "No se pudo crear el usuario.");
      return;
    }
    setForm({ email: "", password: "", role: "staff", chofer_id: "" });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este usuario?");
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      showApiError(err, "No se pudo eliminar el usuario.");
      return false;
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ email: "", password: "", role: "staff", chofer_id: "" });
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
    if (modalForm.password && modalForm.password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
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
      showApiError(err, "No se pudo guardar el usuario.");
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
            Creá accesos para el equipo. Una cuenta vinculada a un chofer verá únicamente sus propios traslados.
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
              minLength={8}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              name="role"
              value={form.role}
              disabled={!!form.chofer_id}
              onChange={handleChange}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <label className="form-field">
            <span>Acceso exclusivo de chofer</span>
            <select aria-label="Acceso exclusivo de chofer" value={form.chofer_id} disabled={form.role === "admin" || employees.loading || !!employees.error} onChange={(e) => setForm((prev) => ({ ...prev, chofer_id: e.target.value }))}>
              <option value="">Acceso general según rol</option>
              {employees.items.filter((e) => e.is_driver && e.status === "active").map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        </div>
        {employees.error && <p role="alert">No se pudieron cargar los choferes. Volvé a cargar antes de crear su acceso.</p>}

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
                  {item.chofer_id && <span> · Solo traslados de {employees.items.find((e) => e.id === item.chofer_id)?.name || "su chofer vinculado"}</span>}
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
                    minLength={8}
                    placeholder="Dejar vacío para no cambiarla"
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
            {!isEditingModal && !employees.error && <ChoferAccessEditor
              key={`${selectedUser.id}/${selectedUser.chofer_id || "general"}`}
              cuenta={selectedUser} empleados={employees.items} disabled={selectedUser.id === user?.id || employees.loading}
              onSaved={async (saved) => { setSelectedUser((prev) => ({ ...prev, ...saved })); await refresh(); }}
            />}
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
