// Alta o edición de un puesto del organigrama: nombre, qué hace, área, de
// quién depende y quiénes lo ocupan. Las personas se eligen entre el equipo
// activo; una misma persona puede estar en varios puestos.
import { useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import { createPosition, deletePosition, setPositionEmployees, updatePosition } from "../../services/teamApi";
import { TEAM_AREAS, descendants, indexAssignments, isActiveEmployee, positionPath } from "../../lib/team";

// mode: { type: "edit", positionId } | { type: "new", parentId }
export default function PositionForm({ team, mode, onClose, onSaved, onAddBelow }) {
  const editing = mode.type === "edit" ? team.positions.find((p) => String(p.id) === String(mode.positionId)) : null;
  const { byPosition, byEmployee } = useMemo(() => indexAssignments(team.assignments), [team.assignments]);
  const parentDefault = editing ? editing.parent_id : mode.parentId;
  const parentArea = team.positions.find((p) => String(p.id) === String(parentDefault))?.area;

  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [area, setArea] = useState(editing?.area ?? parentArea ?? "otro");
  const [parentId, setParentId] = useState(parentDefault ? String(parentDefault) : "");
  const [people, setPeople] = useState(() =>
    editing ? (byPosition.get(String(editing.id)) ?? []).filter((id) => {
      const employee = team.employees.find((e) => String(e.id) === id);
      return employee && isActiveEmployee(employee);
    }) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // No puede depender de sí mismo ni de lo que tiene debajo.
  const blocked = editing ? descendants(team.positions, editing.id) : new Set();
  const parentOptions = team.positions
    .filter((p) => !blocked.has(String(p.id)))
    .map((p) => ({ id: String(p.id), label: positionPath(team.positions, p.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const active = team.employees
    .filter(isActiveEmployee)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  const hasChildren = editing && team.positions.some((p) => String(p.parent_id) === String(editing.id));
  const positionName = (id) => team.positions.find((p) => String(p.id) === id)?.name;

  function togglePerson(id) {
    setPeople((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El puesto necesita un nombre.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = { name: name.trim(), description: description.trim(), area, parentId: parentId || null };
      const saved = editing ? await updatePosition(editing.id, data) : await createPosition(data);
      await setPositionEmployees(saved.id, people);
      onSaved(editing ? "Puesto guardado." : "Puesto creado.");
    } catch (err) {
      setError(err?.message || "No se pudo guardar el puesto.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Borrar el puesto "${editing.name}"? Las personas siguen en el equipo.`)) return;
    setSaving(true);
    setError("");
    try {
      await deletePosition(editing.id);
      onSaved("Puesto borrado.");
    } catch (err) {
      setError(err?.message || "No se pudo borrar el puesto.");
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={editing ? editing.name : "Nuevo puesto"} className="org-modal">
      <form className="org-form" onSubmit={save}>
        <label className="form-field">
          <span>Nombre del puesto</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ej: Peluquería" autoFocus={!editing} />
        </label>
        <label className="form-field">
          <span>Qué hace</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Ej: Baño, corte y cuidado de cada mascota." />
        </label>
        <div className="org-form__grid">
          <label className="form-field">
            <span>Área</span>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {TEAM_AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <small className="form-hint">Solo define el color de la caja.</small>
          </label>
          <label className="form-field">
            <span>Depende de</span>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Nadie (arriba de todo)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="org-people">
          <legend>Quiénes ocupan este puesto</legend>
          {active.length === 0 ? (
            <p className="org-muted">No hay personas activas en el equipo. Cargalas en la pestaña Personal.</p>
          ) : (
            <div className="org-people__list">
              {active.map((employee) => {
                const id = String(employee.id);
                const others = (byEmployee.get(id) ?? [])
                  .filter((pid) => !editing || pid !== String(editing.id))
                  .map(positionName)
                  .filter(Boolean);
                return (
                  <label key={id} className={`org-people__item${people.includes(id) ? " is-active" : ""}`}>
                    <input type="checkbox" checked={people.includes(id)} onChange={() => togglePerson(id)} />
                    <span>
                      <strong>{employee.name}</strong>
                      <span className="org-muted">
                        {[employee.role, others.length ? `también en ${others.join(", ")}` : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {error && <p className="org-error" role="alert">{error}</p>}

        <div className="org-form__actions">
          {editing && (
            <>
              <button
                type="button"
                className="btn-secondary org-danger"
                onClick={remove}
                disabled={saving || hasChildren}
                title={hasChildren ? "Tiene puestos debajo: movelos antes de borrarlo" : undefined}
              >
                Borrar
              </button>
              <button type="button" className="btn-secondary" onClick={() => onAddBelow(editing.id)} disabled={saving}>
                + Puesto debajo
              </button>
            </>
          )}
          <span className="org-form__spacer" />
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
        </div>
        {hasChildren && <p className="org-muted">Para borrarlo, primero mové los puestos que dependen de él.</p>}
      </form>
    </Modal>
  );
}
