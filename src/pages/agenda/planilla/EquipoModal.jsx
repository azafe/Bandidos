import { useState } from "react";
import Panel from "./Panel";
import { empleadoActivo, esPeluquera } from "../../../lib/planilla";

// Elegir quiénes aparecen como peluqueras en la planilla.
export default function EquipoModal({ empleados, elegidas, onClose, onSave }) {
  const activos = empleados.filter(empleadoActivo).sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  const [ids, setIds] = useState(() => new Set((elegidas || activos.filter(esPeluquera).map((e) => e.id)).map(String)));
  const alternar = (id) => setIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <Panel titulo="Peluqueras de la planilla" subtitulo="Solo ellas aparecen en los chips y al cerrar un turno." onClose={onClose} id="pl-equipo">
      <div className="pl-group">
        <span className="pl-label">Equipo activo</span>
        <div className="pl-equipo">
          {activos.map((e) => (
            <label key={e.id} className="pl-check">
              <input type="checkbox" checked={ids.has(String(e.id))} onChange={() => alternar(String(e.id))} />
              <span>{e.name} <small className="pl-help">{e.role || "Sin rol"}</small></span>
            </label>
          ))}
        </div>
        <p className="pl-help">Por defecto aparecen las que tienen el rol <strong>Groomer</strong> en Equipo. Lo que elijas acá queda en este dispositivo.</p>
      </div>
      <div className="pl-actions">
        {elegidas && <button type="button" className="pl-opt small" onClick={() => onSave(null)}>Volver a usar el rol Groomer</button>}
        <span className="pl-spacer" />
        <button type="button" className="pl-btn ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="pl-btn big" onClick={() => onSave([...ids])}>Guardar</button>
      </div>
    </Panel>
  );
}
