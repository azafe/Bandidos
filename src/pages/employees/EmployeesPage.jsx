// src/pages/employees/EmployeesPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const ROLE_COLORS = {
  "Groomer":        "#ff4fa8",
  "Recepción":      "#38bdf8",
  "Ayudante":       "#22c55e",
  "Administración": "#a855f7",
  "Otro":           "#8b94a9",
};

const EMPLOYEE_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

function employeeColor(name) {
  if (!name) return EMPLOYEE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EMPLOYEE_COLORS[Math.abs(hash) % EMPLOYEE_COLORS.length];
}

function initial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function isActive(emp) {
  return emp.status === "active" || emp.status === "Activo";
}

export default function EmployeesPage() {
  const { items: employees, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/employees");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", role: "Groomer", phone: "", email: "", status: "active", notes: "" });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({ name: "", role: "Groomer", phone: "", email: "", status: "active", notes: "" });

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const activeEmployees  = employees.filter(isActive);
  const groomers         = employees.filter((e) => e.role === "Groomer" && isActive(e));
  const inactiveCount    = employees.length - activeEmployees.length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildPayload(source) {
    return {
      name:   source.name.trim(),
      role:   source.role,
      status: source.status,
      ...(source.phone.trim() ? { phone: source.phone.trim() } : {}),
      ...(source.email.trim() ? { email: source.email.trim() } : {}),
      ...(source.notes.trim() ? { notes: source.notes.trim() } : {}),
    };
  }

  function resetForm() {
    setForm({ name: "", role: "Groomer", phone: "", email: "", status: "active", notes: "" });
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert("Ingresá el nombre del empleado."); return; }
    try {
      if (editingId) { await updateItem(editingId, buildPayload(form)); }
      else           { await createItem(buildPayload(form)); }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el empleado.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este empleado?")) return false;
    try { await deleteItem(id); return true; }
    catch (err) { alert(err.message || "No se pudo eliminar el empleado."); return false; }
  }

  function openModalEdit(emp) {
    setModalForm({ name: emp.name || "", role: emp.role || "Groomer", phone: emp.phone || "", email: emp.email || "", status: emp.status || "active", notes: emp.notes || "" });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedEmployee) return;
    if (!modalForm.name.trim()) { alert("Ingresá el nombre del empleado."); return; }
    try {
      const payload = buildPayload(modalForm);
      await updateItem(selectedEmployee.id, payload);
      setSelectedEmployee((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el empleado.");
    }
  }

  function closeModal() { setSelectedEmployee(null); setIsEditingModal(false); }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Estilistas</h1>
          <p className="page-subtitle">Equipo de Bandidos: roles, contacto y estado.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { resetForm(); setFormOpen((v) => !v); }}
        >
          {formOpen ? "Cancelar" : "+ Nuevo estilista"}
        </button>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {/* KPIs */}
      <div className="card fixed-expenses-summary" style={{ marginBottom: 16 }}>
        <div className="fixed-expenses-summary__kpis">
          <div className="fe-kpi">
            <span>Total equipo</span>
            <strong>{employees.length}</strong>
          </div>
          <div className="fe-kpi">
            <span>Activos</span>
            <strong>{activeEmployees.length}</strong>
          </div>
          <div className="fe-kpi fe-kpi--total">
            <span>Groomers activos</span>
            <strong>{groomers.length}</strong>
            <small>generan comisiones</small>
          </div>
          <div className="fe-kpi">
            <span>Inactivos</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      {/* Formulario colapsable */}
      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">{editingId ? "Editar estilista" : "Nuevo estilista"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nombre completo</label>
              <input id="name" name="name" type="text" placeholder="Ej: Juan Pérez" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="role">Rol</label>
              <select id="role" name="role" value={form.role} onChange={handleChange}>
                <option value="Groomer">Groomer</option>
                <option value="Recepción">Recepción</option>
                <option value="Ayudante">Ayudante</option>
                <option value="Administración">Administración</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="phone">Teléfono</label>
              <input id="phone" name="phone" type="text" placeholder="Ej: 381-555-5555" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="Ej: juan@bandidos.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="status">Estado</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="notes">Notas</label>
              <textarea id="notes" name="notes" rows={3} placeholder="Horarios, días que no trabaja, etc." value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "Guardar cambios" : "Guardar estilista"}</button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setFormOpen(false); }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Grid de cards */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 className="card-title">Equipo</h2>
            <p className="card-subtitle">{employees.length} integrantes · Hacé clic para ver detalle.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && employees.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin estilistas cargados. Usá el botón "+ Nuevo estilista".
          </div>
        )}

        <div className="employee-cards-grid">
          {employees.map((emp) => {
            const color = employeeColor(emp.name);
            const roleColor = ROLE_COLORS[emp.role] || "#8b94a9";
            const active = isActive(emp);
            return (
              <div
                key={emp.id}
                className={`employee-card${active ? "" : " employee-card--inactive"}`}
                style={{ "--emp-color": color }}
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="employee-card__top-bar" style={{ background: color }} />
                <div className="employee-card__body">
                  <div className="employee-card__header">
                    <span className="employee-card__avatar" style={{ background: color }}>
                      {initial(emp.name)}
                    </span>
                    <div className="employee-card__header-info">
                      <div className="employee-card__name">{emp.name}</div>
                      <span className="employee-card__role-badge" style={{ background: `${roleColor}20`, color: roleColor }}>
                        {emp.role || "Sin rol"}
                      </span>
                    </div>
                    <span className={`fe-card__status${active ? " fe-card__status--active" : ""}`}>
                      {active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="employee-card__contact">
                    {emp.phone && (
                      <span className="employee-card__contact-item">
                        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/></svg>
                        {emp.phone}
                      </span>
                    )}
                    {emp.email && (
                      <span className="employee-card__contact-item">
                        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>
                        {emp.email}
                      </span>
                    )}
                  </div>

                  {emp.notes && (
                    <p className="employee-card__notes">{emp.notes.length > 60 ? emp.notes.slice(0, 60) + "…" : emp.notes}</p>
                  )}
                </div>
                <Link
                  to={`/employees/${emp.id}`}
                  className="pet-card__ficha-btn"
                  style={{ "--pet-color": color }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver ficha →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalle / edición */}
      <Modal isOpen={Boolean(selectedEmployee)} onClose={closeModal} title="Estilista">
        {selectedEmployee && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field"><span>Nombre</span>
                  <input type="text" value={modalForm.name} onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="form-field"><span>Rol</span>
                  <select value={modalForm.role} onChange={(e) => setModalForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="Groomer">Groomer</option>
                    <option value="Recepción">Recepción</option>
                    <option value="Ayudante">Ayudante</option>
                    <option value="Administración">Administración</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
                <label className="form-field"><span>Teléfono</span>
                  <input type="text" value={modalForm.phone} onChange={(e) => setModalForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
                <label className="form-field"><span>Email</span>
                  <input type="email" value={modalForm.email} onChange={(e) => setModalForm((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="form-field"><span>Estado</span>
                  <select value={modalForm.status} onChange={(e) => setModalForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>
                <label className="form-field"><span>Notas</span>
                  <textarea rows={3} value={modalForm.notes} onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                {/* Header del modal */}
                <div className="pet-modal-header">
                  <div className="pet-modal-avatar" style={{ background: employeeColor(selectedEmployee.name) }}>
                    {initial(selectedEmployee.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{selectedEmployee.name}</div>
                    <span
                      className="employee-card__role-badge"
                      style={{
                        background: `${ROLE_COLORS[selectedEmployee.role] || "#8b94a9"}20`,
                        color: ROLE_COLORS[selectedEmployee.role] || "#8b94a9",
                      }}
                    >
                      {selectedEmployee.role || "Sin rol"}
                    </span>
                  </div>
                </div>
                <div className="fe-modal-detail__rows">
                  <div><strong>Estado</strong>
                    <span className={`fe-card__status${isActive(selectedEmployee) ? " fe-card__status--active" : ""}`}>
                      {isActive(selectedEmployee) ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div><strong>Teléfono</strong><span>{selectedEmployee.phone || "-"}</span></div>
                  <div><strong>Email</strong><span>{selectedEmployee.email || "-"}</span></div>
                  {selectedEmployee.notes && (
                    <div style={{ flexDirection: "column", alignItems: "flex-start" }}>
                      <strong>Notas</strong>
                      <span style={{ marginTop: 4, fontSize: "0.88rem" }}>{selectedEmployee.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setIsEditingModal(false)}>Cancelar</button>
                  <button type="button" className="btn-primary" onClick={handleModalSave}>Guardar cambios</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-danger"
                    onClick={async () => { const ok = await handleDelete(selectedEmployee.id); if (ok) closeModal(); }}>
                    Eliminar
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openModalEdit(selectedEmployee)}>
                    Editar
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
