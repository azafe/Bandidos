// Ficha de una persona del equipo en un panel lateral (como PersonaForm de la
// ONG): alta, datos, puestos del organigrama, baja y reactivación. La baja es
// lógica: sale del organigrama y de sus puestos, y lo que hizo (turnos,
// comisiones, traslados) sigue a su nombre.
import { useState } from "react";
import { Link } from "react-router-dom";
import Sheet from "../pets/components/Sheet";
import { apiRequest } from "../../services/apiClient";
import { setPositionEmployees } from "../../services/teamApi";
import {
  EMPLOYEE_ROLES,
  areaOf,
  assignmentChanges,
  formatDay,
  isActiveEmployee,
  positionPath,
  positionsOfEmployee,
} from "../../lib/team";

async function applyPositions(team, employeeId, positionIds) {
  for (const change of assignmentChanges(team, employeeId, positionIds)) {
    await setPositionEmployees(change.positionId, change.employeeIds);
  }
}

// employee: null = alta de una persona nueva.
export default function PersonSheet({ employee, team, onClose, onSaved }) {
  const existing = employee ?? null;
  const active = existing ? isActiveEmployee(existing) : true;
  const positionsBefore = existing && team ? positionsOfEmployee(team, existing.id) : [];

  const [name, setName] = useState(existing?.name ?? "");
  const [dni, setDni] = useState(existing?.dni ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [hireDate, setHireDate] = useState(existing?.hire_date ? String(existing.hire_date).slice(0, 10) : "");
  const [role, setRole] = useState(existing?.role ?? "Groomer");
  const [isDriver, setIsDriver] = useState(existing?.is_driver === true);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [positionIds, setPositionIds] = useState(positionsBefore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = EMPLOYEE_ROLES.includes(role) ? EMPLOYEE_ROLES : [role, ...EMPLOYEE_ROLES];
  const positions = team
    ? [...team.positions].sort((a, b) => positionPath(team.positions, a.id).localeCompare(positionPath(team.positions, b.id), "es"))
    : [];

  function togglePosition(id) {
    setPositionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function run(action, message) {
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved(message);
    } catch (err) {
      setError(err?.message || "No se pudo guardar.");
      setBusy(false);
    }
  }

  function save(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ingresá el nombre y apellido.");
      return;
    }
    // Vacío borra el dato: el backend lo guarda como null.
    const data = {
      name: name.trim(),
      role,
      is_driver: isDriver,
      dni: dni.trim(),
      phone: phone.trim(),
      email: email.trim(),
      hire_date: hireDate,
      notes: notes.trim(),
    };
    run(async () => {
      if (existing) {
        await apiRequest(`/v2/employees/${existing.id}`, { method: "PUT", body: data });
        if (active && team) await applyPositions(team, existing.id, positionIds);
      } else {
        const created = await apiRequest("/v2/employees", { method: "POST", body: { ...data, status: "active" } });
        if (team && positionIds.length) await applyPositions(team, created.id, positionIds);
      }
    }, existing ? "Datos guardados." : `${data.name} quedó dado de alta.`);
  }

  function dischargeEmployee() {
    const ok = window.confirm(
      `¿Dar de baja a ${existing.name}?\n\nSale del organigrama y de todos sus puestos. Sus turnos, comisiones y traslados quedan a su nombre.`
    );
    if (!ok) return;
    run(async () => {
      if (team) await applyPositions(team, existing.id, []);
      await apiRequest(`/v2/employees/${existing.id}`, { method: "PUT", body: { status: "inactive" } });
    }, `${existing.name} quedó dado de baja.`);
  }

  function reactivate() {
    run(
      () => apiRequest(`/v2/employees/${existing.id}`, { method: "PUT", body: { status: "active" } }),
      `${existing.name} vuelve al equipo. Asignale un puesto.`
    );
  }

  function removeForever() {
    const ok = window.confirm(
      `¿Eliminar a ${existing.name} definitivamente?\n\nNo se puede deshacer. Si tiene turnos o traslados registrados, el sistema no lo va a permitir: dejalo dado de baja.`
    );
    if (!ok) return;
    run(() => apiRequest(`/v2/employees/${existing.id}`, { method: "DELETE" }), `${existing.name} fue eliminado.`);
  }

  const footer = (
    <div className="person-sheet__footer">
      {error && <p className="org-error" role="alert">{error}</p>}
      <div className="person-sheet__buttons">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" form="person-form" className="btn-primary" disabled={busy}>
          {busy ? "Guardando…" : existing ? "Guardar" : "Dar de alta"}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      variant="drawer"
      width={460}
      fullscreenOnMobile
      title={
        <span className="person-sheet__title">
          <span className="person-sheet__kicker">{existing ? (active ? "Personal" : "Dado de baja") : "Alta de empleado"}</span>
          <span>{existing ? existing.name : name.trim() || "Nuevo empleado"}</span>
        </span>
      }
      footer={footer}
    >
      <form id="person-form" className="person-sheet" onSubmit={save}>
        <label className="form-field">
          <span>Nombre y apellido</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!existing} required />
        </label>
        <div className="person-sheet__grid">
          <label className="form-field">
            <span>DNI</span>
            <input type="text" inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Teléfono</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Fecha de ingreso</span>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="person-sheet__check">
            <input type="checkbox" checked={isDriver} onChange={(e) => setIsDriver(e.target.checked)} />
            También hace traslados (chofer)
          </label>
        </div>

        {active && (
          <fieldset className="person-sheet__positions">
            <legend>Puestos</legend>
            {!team ? (
              <p className="org-muted">No se pudo cargar el organigrama.</p>
            ) : positions.length === 0 ? (
              <p className="org-muted">Todavía no hay puestos en el organigrama.</p>
            ) : (
              <div className="person-sheet__chips">
                {positions.map((position) => {
                  const id = String(position.id);
                  const chosen = positionIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={chosen}
                      className={`person-chip${chosen ? " is-active" : ""}`}
                      style={{ "--area": areaOf(position.area).color }}
                      onClick={() => togglePosition(id)}
                    >
                      {position.name}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <label className="form-field">
          <span>Notas</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Horarios, días que no trabaja, etc." />
        </label>

        {existing && (
          <div className="person-sheet__more">
            <Link to={`/employees/${existing.id}`} className="person-sheet__link">Ver servicios y comisiones →</Link>
            {active ? (
              <button type="button" className="person-sheet__danger" onClick={dischargeEmployee} disabled={busy}>
                Dar de baja
              </button>
            ) : (
              <>
                <p className="org-muted">
                  Dado de baja{existing.end_date ? ` el ${formatDay(existing.end_date)}` : ""}.
                </p>
                <button type="button" className="btn-secondary" onClick={reactivate} disabled={busy}>
                  Volver a dar de alta
                </button>
                <button type="button" className="person-sheet__danger" onClick={removeForever} disabled={busy}>
                  Eliminar definitivamente
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
