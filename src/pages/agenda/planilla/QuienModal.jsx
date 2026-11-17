import { useState } from "react";
import Panel from "./Panel";
import { updateAgendaTurno } from "../../../services/agendaApi";
import { normalizarId } from "../../../lib/cierreDia";
import { hora, peluquerasDeTurno } from "../../../lib/planilla";

// «¿Quién lo agarra?»: asignar la peluquera apenas toma al perro, con un toque.
// Cada toque se guarda en el turno; el cobro se registra después, al terminar.
export default function QuienModal({ turno, peluqueras, colores, presentes, onClose, onChange }) {
  const [elegidas, setElegidas] = useState(() => peluquerasDeTurno(turno));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(next) {
    const previas = elegidas;
    setElegidas(next);
    setGuardando(true);
    setError("");
    try {
      const [g1, g2, g3] = next.map(normalizarId);
      await updateAgendaTurno(turno.id, { groomer_id: g1 ?? null, second_groomer_id: g2 ?? null, third_groomer_id: g3 ?? null });
      onChange();
    } catch (err) {
      setElegidas(previas);
      setError(err?.message || "No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function alternar(id) {
    if (guardando) return;
    if (elegidas.includes(id)) { guardar(elegidas.filter((x) => x !== id)); return; }
    if (elegidas.length >= 3) { setError("Pueden ser hasta 3 peluqueras. Sacá una para sumar otra."); return; }
    guardar([...elegidas, id]);
  }

  const ordenadas = [...peluqueras].sort((a, b) => (presentes[String(b.id)] !== false) - (presentes[String(a.id)] !== false));
  return (
    <Panel titulo={<>¿Quién agarra a {turno.pet_name}? <span>({hora(turno.time)})</span></>} subtitulo="Tocá su nombre. Si son dos o tres, tocá a cada una." onClose={onClose} id="pl-quien">
      <div className="pl-opts pl-quien-opts" role="group" aria-label="Peluqueras">
        {ordenadas.map((p) => {
          const id = String(p.id);
          const on = elegidas.includes(id);
          return (
            <button key={id} type="button" className="pl-opt pl-quien-opt" aria-pressed={on} disabled={guardando} onClick={() => alternar(id)}>
              <span className="pl-dot" style={{ background: colores[id] }} />
              {p.name}
              {presentes[id] === false && <small> (no vino)</small>}
              {on && elegidas.length > 1 && <small> · {elegidas.indexOf(id) + 1}ª</small>}
            </button>
          );
        })}
      </div>
      {elegidas.length > 1 && <p className="pl-help">La primera que tocaste es la principal: la comisión se reparte en partes iguales al terminar.</p>}
      <p className="pl-error" role="alert">{error}</p>
      <div className="pl-actions">
        {elegidas.length > 0 && <button type="button" className="pl-opt small" disabled={guardando} onClick={() => guardar([])}>Sacar a todas</button>}
        <span className="pl-spacer" />
        <button type="button" className="pl-btn big" onClick={onClose} data-autofocus>{guardando ? "Guardando…" : "Listo"}</button>
      </div>
    </Panel>
  );
}
