// src/pages/employees/EmployeesPage.jsx
// Equipo: personal y organigrama. El organigrama está adaptado del módulo
// Equipo de la ONG: el puesto es la caja, la persona es el empleado y el
// permiso sigue en el usuario.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { colorForName as employeeColor } from "../../utils/colorPalette";
import { showApiError } from "../../utils/errorDialog";
import { createTemplate, getTeam } from "../../services/teamApi";
import { areaOf, buildTree, formatDay, indexAssignments, teamStats } from "../../lib/team";
import OrgChart from "./OrgChart";
import PositionForm from "./PositionForm";
import "../../styles/team.css";

const EMPTY_FORM = { name: "", role: "Groomer", phone: "", email: "", status: "active", notes: "", is_driver: false, dni: "", hire_date: "" };

const ROLE_COLORS = {
  "Groomer":        "#ff4fa8",
  "Recepción":      "#38bdf8",
  "Ayudante":       "#22c55e",
  "Administración": "#a855f7",
  "Otro":           "#8b94a9",
};

function initial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function isActive(emp) {
  return emp.status === "active" || emp.status === "Activo";
}

export default function EmployeesPage() {
  const { items: employees, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/employees");

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("vista") === "organigrama" ? "organigrama" : "personal";
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState(EMPTY_FORM);

  // ── Organigrama ─────────────────────────────────────────────────────────
  const [team, setTeam] = useState(null);
  const [teamError, setTeamError] = useState("");
  const [teamReload, setTeamReload] = useState(0);
  const [positionMode, setPositionMode] = useState(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    getTeam()
      .then((data) => {
        if (cancelled) return;
        setTeam(data);
        setTeamError("");
      })
      .catch((err) => !cancelled && setTeamError(err?.message || "No se pudo cargar el organigrama."));
    return () => {
      cancelled = true;
    };
  }, [teamReload]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const reloadTeam = useCallback(() => setTeamReload((n) => n + 1), []);
  const tree = useMemo(() => (team ? buildTree(team) : []), [team]);
  const stats = useMemo(() => (team ? teamStats(team) : null), [team]);
  const positionsByEmployee = useMemo(() => {
    if (!team) return new Map();
    const byId = new Map(team.positions.map((p) => [String(p.id), p]));
    const { byEmployee } = indexAssignments(team.assignments);
    return new Map(
      [...byEmployee.entries()].map(([id, positionIds]) => [id, positionIds.map((pid) => byId.get(pid)).filter(Boolean)])
    );
  }, [team]);

  function setView(next) {
    setSearchParams(next === "organigrama" ? { vista: "organigrama" } : {});
  }

  async function handleTemplate() {
    setCreatingTemplate(true);
    try {
      setTeam(await createTemplate());
      setToast("Organigrama sugerido creado. Tocá cada puesto para ajustarlo.");
    } catch (err) {
      showApiError(err, "No se pudo crear el organigrama sugerido.");
    } finally {
      setCreatingTemplate(false);
    }
  }

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
      is_driver: source.is_driver === true,
      // Vacío borra el dato: el backend lo guarda como null.
      dni: source.dni.trim(),
      hire_date: source.hire_date || "",
      ...(source.phone.trim() ? { phone: source.phone.trim() } : {}),
      ...(source.email.trim() ? { email: source.email.trim() } : {}),
      ...(source.notes.trim() ? { notes: source.notes.trim() } : {}),
    };
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert("Ingresá el nombre del empleado."); return; }
    try {
      if (editingId) { await updateItem(editingId, buildPayload(form)); }
      else           { await createItem(buildPayload(form)); }
      reloadTeam();
      resetForm();
      setFormOpen(false);
    } catch (err) {
      showApiError(err, "No se pudo guardar el empleado.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este empleado?")) return false;
    try { await deleteItem(id); reloadTeam(); return true; }
    catch (err) { showApiError(err, "No se pudo eliminar el empleado."); return false; }
  }

  function openModalEdit(emp) {
    setModalForm({ name: emp.name || "", role: emp.role || "Groomer", phone: emp.phone || "", email: emp.email || "", status: emp.status || "active", notes: emp.notes || "", is_driver: emp.is_driver === true, dni: emp.dni || "", hire_date: emp.hire_date ? String(emp.hire_date).slice(0, 10) : "" });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedEmployee) return;
    if (!modalForm.name.trim()) { alert("Ingresá el nombre del empleado."); return; }
    try {
      const payload = buildPayload(modalForm);
      await updateItem(selectedEmployee.id, payload);
      setSelectedEmployee((prev) => prev ? { ...prev, ...payload, dni: payload.dni || null, hire_date: payload.hire_date || null } : prev);
      reloadTeam();
      setIsEditingModal(false);
    } catch (err) {
      showApiError(err, "No se pudo guardar el empleado.");
    }
  }

  function closeModal() { setSelectedEmployee(null); setIsEditingModal(false); }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="page-subtitle">
            {view === "organigrama"
              ? "Quién hace qué y de quién depende. Tocá un puesto para editarlo."
              : "Equipo de Bandidos: roles, contacto y estado."}
          </p>
        </div>
        {view === "organigrama" ? (
          team && team.positions.length > 0 && (
            <button type="button" className="btn-primary" onClick={() => setPositionMode({ type: "new", parentId: null })}>
              + Nuevo puesto
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => { resetForm(); setFormOpen((v) => !v); }}
          >
            {formOpen ? "Cancelar" : "+ Nuevo integrante"}
          </button>
        )}
      </header>

      <nav className="card team-tabs" aria-label="Secciones de Equipo">
        {[
          { id: "personal", label: "Personal" },
          { id: "organigrama", label: "Organigrama" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={view === tab.id ? "tab tab--active" : "tab"}
            aria-current={view === tab.id ? "page" : undefined}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {view === "organigrama" ? (
        <section className="card team-org" aria-label="Organigrama">
          {teamError ? (
            <div className="team-org__state" role="alert">
              <p>{teamError}</p>
              <button type="button" className="btn-secondary" onClick={reloadTeam}>Reintentar</button>
            </div>
          ) : !team ? (
            <p className="team-org__state">Cargando organigrama…</p>
          ) : team.positions.length === 0 ? (
            <div className="team-org__empty">
              <h2 className="card-title">Todavía no hay organigrama</h2>
              <p className="card-subtitle">
                Podés empezar con uno sugerido para una peluquería (Dirección, Administración, Recepción,
                Peluquería, Bandimóviles y PetShop) con cada integrante ubicado según su rol, y después ajustarlo.
              </p>
              <div className="team-org__empty-actions">
                <button type="button" className="btn-primary" onClick={handleTemplate} disabled={creatingTemplate}>
                  {creatingTemplate ? "Armando…" : "Usar el organigrama sugerido"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setPositionMode({ type: "new", parentId: null })}>
                  Empezar de cero
                </button>
              </div>
            </div>
          ) : (
            <>
              <dl className="team-stats">
                <div><dt>Puestos</dt><dd>{stats.positions}</dd></div>
                <div className={stats.vacant ? "is-warn" : undefined}><dt>Vacantes</dt><dd>{stats.vacant}</dd></div>
                <div><dt>Personas activas</dt><dd>{stats.active}</dd></div>
                <div className={stats.withoutPosition ? "is-warn" : undefined}><dt>Sin puesto</dt><dd>{stats.withoutPosition}</dd></div>
              </dl>
              <OrgChart
                tree={tree}
                onSelect={(id) => setPositionMode({ type: "edit", positionId: id })}
                onAddBelow={(id) => setPositionMode({ type: "new", parentId: id })}
              />
            </>
          )}
        </section>
      ) : (
      <>
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
          <h2 className="card-title">{editingId ? "Editar estilista" : "Nuevo integrante"}</h2>
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
                <option value="Socio">Socio</option>
                <option value="Chofer">Chofer</option>
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
            <div className="form-field">
              <label htmlFor="dni">DNI</label>
              <input id="dni" name="dni" type="text" inputMode="numeric" placeholder="Opcional" value={form.dni} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="hire_date">Fecha de ingreso</label>
              <input id="hire_date" name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
            </div>
            <label className="agenda-traslado-toggle"><input type="checkbox" name="is_driver" checked={form.is_driver} onChange={handleChange} />También realiza traslados (chofer)</label>
            <div className="form-field form-field--full">
              <label htmlFor="notes">Notas</label>
              <textarea id="notes" name="notes" rows={3} placeholder="Horarios, días que no trabaja, etc." value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "Guardar cambios" : "Guardar integrante"}</button>
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
            Sin integrantes cargados. Usá el botón "+ Nuevo integrante".
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
                      <div className="employee-card__name">{emp.name}{emp.is_driver ? " · Chofer" : ""}</div>
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

                  {active && (positionsByEmployee.get(String(emp.id)) ?? []).length > 0 && (
                    <div className="team-pills">
                      {positionsByEmployee.get(String(emp.id)).map((position) => (
                        <span key={position.id} className="team-pill" style={{ "--area": areaOf(position.area).color }}>
                          {position.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {!active && emp.end_date && <p className="employee-card__notes">Baja {formatDay(emp.end_date)}</p>}

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

      </>
      )}

      {positionMode && team && (
        <PositionForm
          key={JSON.stringify(positionMode)}
          team={team}
          mode={positionMode}
          onClose={() => setPositionMode(null)}
          onAddBelow={(id) => setPositionMode({ type: "new", parentId: id })}
          onSaved={(message) => {
            setPositionMode(null);
            setToast(message);
            reloadTeam();
          }}
        />
      )}

      {toast && <div className="team-toast" role="status">{toast}</div>}

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
                    <option value="Socio">Socio</option>
                <option value="Chofer">Chofer</option>
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
                <label className="form-field"><span>DNI</span>
                  <input type="text" inputMode="numeric" value={modalForm.dni} onChange={(e) => setModalForm((p) => ({ ...p, dni: e.target.value }))} />
                </label>
                <label className="form-field"><span>Fecha de ingreso</span>
                  <input type="date" value={modalForm.hire_date} onChange={(e) => setModalForm((p) => ({ ...p, hire_date: e.target.value }))} />
                </label>
                <label className="agenda-traslado-toggle"><input type="checkbox" checked={modalForm.is_driver} onChange={(e) => setModalForm((prev) => ({ ...prev, is_driver: e.target.checked }))} />También realiza traslados (chofer)</label>
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
                  {selectedEmployee.dni && <div><strong>DNI</strong><span>{selectedEmployee.dni}</span></div>}
                  {selectedEmployee.hire_date && <div><strong>Ingreso</strong><span>{formatDay(selectedEmployee.hire_date)}</span></div>}
                  {!isActive(selectedEmployee) && selectedEmployee.end_date && (
                    <div><strong>Baja</strong><span>{formatDay(selectedEmployee.end_date)}</span></div>
                  )}
                  <div><strong>Puestos</strong>
                    <span>
                      {(positionsByEmployee.get(String(selectedEmployee.id)) ?? []).map((p) => p.name).join(", ") || "Sin puesto en el organigrama"}
                    </span>
                  </div>
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
