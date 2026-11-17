import { useState } from "react";
import Panel from "./Panel";
import { serviciosPlanilla } from "../../../lib/planilla";

// Elegir qué servicios se ofrecen en la planilla. El catálogo no cambia:
// los servicios usados en turnos anteriores siguen ahí para el historial.
export default function ServiciosModal({ servicios, elegidos, onClose, onSave }) {
  const ordenados = [...servicios].sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  const [ids, setIds] = useState(() => new Set(serviciosPlanilla(servicios, elegidos).map((s) => String(s.id))));
  const alternar = (id) => setIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <Panel titulo="Servicios de la planilla" subtitulo="Solo estos aparecen al agendar y al cerrar un turno." onClose={onClose} id="pl-servicios">
      <div className="pl-group">
        <span className="pl-label">Catálogo</span>
        <div className="pl-equipo">
          {ordenados.map((s) => (
            <label key={s.id} className="pl-check">
              <input type="checkbox" checked={ids.has(String(s.id))} onChange={() => alternar(String(s.id))} />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
        <p className="pl-help">Por defecto se muestran <strong>Corte y baño</strong>, <strong>Baño</strong> y <strong>Corte</strong>. Lo que elijas acá queda en este dispositivo. Los servicios que ya se usaron en turnos no se pueden borrar del catálogo porque se perdería el historial.</p>
      </div>
      <div className="pl-actions">
        {elegidos && <button type="button" className="pl-opt small" onClick={() => onSave(null)}>Volver a los de siempre</button>}
        <span className="pl-spacer" />
        <button type="button" className="pl-btn ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="pl-btn big" disabled={!ids.size} onClick={() => onSave([...ids])}>Guardar</button>
      </div>
    </Panel>
  );
}
