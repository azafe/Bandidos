import { useState } from "react";
import { vincularCuentaChofer } from "../../services/trasladosApi";

export default function ChoferAccessEditor({ cuenta, empleados, onSaved, disabled }) {
  const [selected, setSelected] = useState(cuenta.chofer_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const drivers = empleados.filter((e) => e.id === cuenta.chofer_id || (e.is_driver && e.status === "active"));
  async function save() {
    if (cuenta.chofer_id && !selected && !window.confirm("Esta cuenta recuperará el acceso general de su rol. ¿Querés quitar la restricción de chofer?")) return;
    setSaving(true); setError("");
    try {
      const saved = await vincularCuentaChofer(cuenta.id, selected || null);
      await onSaved(saved);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <section className="traslados-panel" aria-label="Acceso del chofer">
    <h3>Acceso del chofer</h3>
    <p>Al vincular un chofer, esta cuenta solo podrá ver sus traslados y avanzar sus estados. No tendrá acceso a Agenda, Caja ni otros choferes.</p>
    <label className="form-field"><span>Chofer vinculado</span>
      <select value={selected} disabled={saving || disabled} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Acceso general según rol</option>
        {drivers.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status !== "active" || !e.is_driver ? " (inactivo)" : ""}</option>)}
      </select>
    </label>
    {error && <p className="traslados-error" role="alert">{error}</p>}
    {disabled && <p>No podés modificar tu propio acceso desde esta opción.</p>}
    <button className="btn-secondary" type="button" disabled={saving || disabled || selected === (cuenta.chofer_id || "")} onClick={save}>{saving ? "Guardando..." : "Guardar acceso"}</button>
  </section>;
}
