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
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el empleado.");
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
                  <div className="list-item__actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(emp);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(emp.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
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
        onClose={() => setSelectedEmployee(null)}
        title="Detalle del empleado"
      >
        {selectedEmployee && (
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
      </Modal>
    </div>
  );
}
