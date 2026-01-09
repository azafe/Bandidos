// src/pages/employees/EmployeesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function EmployeesPage() {
  const {
    items: employees,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/employees");
  const [editingId, setEditingId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    role: "Groomer",
    phone: "",
    email: "",
    status: "active",
    notes: "",
  });

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  const [form, setForm] = useState({
    name: "",
    role: "Groomer",
    phone: "",
    email: "",
    status: "active",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá al menos el nombre del empleado.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el empleado.");
      return;
    }

    setForm({
      name: "",
      role: "Groomer",
      phone: "",
      email: "",
      status: "active",
      notes: "",
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este empleado?");
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el empleado.");
      return false;
    }
  }

  function startEdit(emp) {
    setEditingId(emp.id);
    setForm({
      name: emp.name || "",
      role: emp.role || "Groomer",
      phone: emp.phone || "",
      email: emp.email || "",
      status: emp.status || "active",
      notes: emp.notes || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      role: "Groomer",
      phone: "",
      email: "",
      status: "active",
      notes: "",
    });
  }

  function openModalEdit(employee) {
    setModalForm({
      name: employee.name || "",
      role: employee.role || "Groomer",
      phone: employee.phone || "",
      email: employee.email || "",
      status: employee.status || "active",
      notes: employee.notes || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedEmployee) return;
    if (!modalForm.name.trim()) {
      alert("Ingresá al menos el nombre del empleado.");
      return;
    }
    try {
      await updateItem(selectedEmployee.id, {
        name: modalForm.name.trim(),
        role: modalForm.role,
        phone: modalForm.phone.trim(),
        email: modalForm.email.trim(),
        status: modalForm.status,
        notes: modalForm.notes.trim(),
      });
      setSelectedEmployee((prev) =>
        prev
          ? {
              ...prev,
              name: modalForm.name.trim(),
              role: modalForm.role,
              phone: modalForm.phone.trim(),
              email: modalForm.email.trim(),
              status: modalForm.status,
              notes: modalForm.notes.trim(),
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el empleado.");
    }
  }

  function closeModal() {
    setSelectedEmployee(null);
    setIsEditingModal(false);
  }

  return (
    <div className="page-content">
      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">
            Registro del equipo de Bandidos: quién trabaja, en qué rol y cómo
            contactarlos.
          </p>
        </div>
      </header>

      {/* Formulario */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar empleado" : "Nuevo empleado"}
        </h2>
        <p className="card-subtitle">
          Cargá los datos básicos del empleado. Más adelante podemos sumar
          sueldos, horarios y comisiones.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ej: Juan Pérez"
              value={form.name}
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
              <option value="Groomer">Groomer</option>
              <option value="Recepción">Recepción</option>
              <option value="Ayudante">Ayudante</option>
              <option value="Administración">Administración</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="text"
              name="phone"
              placeholder="Ej: 381-555-5555"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Ej: empleado@bandidos.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div className="form-field form-field--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Observaciones, horarios, días que no trabaja, etc."
              value={form.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar empleado"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de empleados</h2>
        <p className="card-subtitle">
          Vista general del equipo actual de Bandidos.
        </p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {employees.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin empleados cargados.
            </div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="list-item"
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{emp.name}</div>
                </div>
                <div className="list-item__meta">
                  <span>Rol: {emp.role || "-"}</span>
                  <span>Tel: {emp.phone || "-"}</span>
                  <span>Email: {emp.email || "-"}</span>
                  <span>
                    Estado: {emp.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {emp.notes && (
                  <div className="list-item__meta">
                    <span>Notas: {truncate(emp.notes, 80)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedEmployee)}
        onClose={closeModal}
        title="Detalle del empleado"
      >
        {selectedEmployee && (
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
                  <span>Rol</span>
                  <input
                    type="text"
                    value={modalForm.role}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        role: e.target.value,
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
                  <span>Estado</span>
                  <select
                    value={modalForm.status}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
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
                  <strong>Nombre:</strong> {selectedEmployee.name || "-"}
                </div>
                <div>
                  <strong>Rol:</strong> {selectedEmployee.role || "-"}
                </div>
                <div>
                  <strong>Teléfono:</strong> {selectedEmployee.phone || "-"}
                </div>
                <div>
                  <strong>Email:</strong> {selectedEmployee.email || "-"}
                </div>
                <div>
                  <strong>Estado:</strong>{" "}
                  {selectedEmployee.status === "active" ? "Activo" : "Inactivo"}
                </div>
                <div>
                  <strong>Notas:</strong> {selectedEmployee.notes || "-"}
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
                    onClick={() => openModalEdit(selectedEmployee)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedEmployee.id);
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
