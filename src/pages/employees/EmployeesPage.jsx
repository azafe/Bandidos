// src/pages/employees/EmployeesPage.jsx
import { useState } from "react";
import { useEmployees } from "../../context/EmployeesContext";

export default function EmployeesPage() {
  const { employees, addEmployee } = useEmployees();

  const [form, setForm] = useState({
    name: "",
    role: "Groomer",
    phone: "",
    email: "",
    status: "Activo",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá al menos el nombre del empleado.");
      return;
    }

    addEmployee({
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });

    setForm({
      name: "",
      role: "Groomer",
      phone: "",
      email: "",
      status: "Activo",
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
        <h2 className="card-title">Nuevo empleado</h2>
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
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
            Guardar empleado
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de empleados</h2>
        <p className="card-subtitle">
          Vista general del equipo actual de Bandidos.
        </p>

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    Sin empleados cargados.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.role}</td>
                    <td>{emp.phone}</td>
                    <td>{emp.email}</td>
                    <td>{emp.status}</td>
                    <td>{emp.notes}</td>
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
