import { useState } from "react";
import Panel, { Opciones } from "./Panel";
import { COLORES, HORAS, fechaLarga, horaCorta, rangoHorario } from "../../../lib/planilla";

const RAPIDOS = [["09:00", "15:00"], ["15:00", "21:00"], ["09:00", "21:00"], ["09:00", "13:00"], ["14:00", "21:00"]];

// Tocar el chip de una peluquera: si viene ese día, su horario y su color.
export default function PeluqueraModal({ peluquera, fecha, viene, horario, color, onClose, onSave }) {
  const [v, setV] = useState(viene);
  const [desde, setDesde] = useState(horario?.[0] || "09:00");
  const [hasta, setHasta] = useState(horario?.[1] || "15:00");
  const [habitual, setHabitual] = useState(false);
  const [c, setC] = useState(color);
  const [error, setError] = useState("");

  function guardar(e) {
    e.preventDefault();
    if (v && desde >= hasta) { setError("La hora de salida tiene que ser después de la de entrada."); return; }
    onSave({ viene: v, horario: [desde, hasta], habitual, color: c });
  }
  const sel = (id, valor, set) => (
    <select id={id} value={valor} onChange={(e) => { set(e.target.value); setError(""); }} style={{ width: "auto" }}>
      {HORAS.map((h) => <option key={h} value={h}>{horaCorta(h)} hs</option>)}
    </select>
  );
  return (
    <Panel titulo={<><span className="pl-dot" style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: c, marginRight: 8, verticalAlign: -2 }} />{peluquera.name}</>} subtitulo={fechaLarga(fecha)} onClose={onClose} id="pl-peluquera">
      <form onSubmit={guardar} noValidate style={{ display: "grid", gap: 16 }}>
        <div className="pl-group"><span className="pl-label">¿Viene este día?</span>
          <Opciones opciones={[{ value: true, label: "Viene" }, { value: false, label: "No viene", danger: true }]} valor={v} onChange={setV} etiqueta="Viene" />
        </div>
        {v && (
          <div className="pl-group"><span className="pl-label">Horario</span>
            <div className="pl-opts">
              {RAPIDOS.map((r) => <button key={r.join("-")} type="button" className="pl-opt" aria-pressed={r[0] === desde && r[1] === hasta} onClick={() => { setDesde(r[0]); setHasta(r[1]); setError(""); }}>{rangoHorario(r)}</button>)}
            </div>
            <div className="pl-horario"><label htmlFor="pl-desde" className="pl-help">Desde</label>{sel("pl-desde", desde, setDesde)}<label htmlFor="pl-hasta" className="pl-help">hasta</label>{sel("pl-hasta", hasta, setHasta)}</div>
            <label className="pl-check"><input type="checkbox" checked={habitual} onChange={(e) => setHabitual(e.target.checked)} /> Usar este horario también los próximos días</label>
          </div>
        )}
        <div className="pl-group"><span className="pl-label">Color en la planilla</span>
          <div className="pl-colors">{COLORES.map((x) => <button key={x} type="button" className="pl-color" style={{ background: x }} aria-pressed={x === c} aria-label={`Color ${x}`} onClick={() => setC(x)} />)}</div>
        </div>
        <p className="pl-error" role="alert">{error}</p>
        <div className="pl-actions">
          <button type="button" className="pl-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="pl-btn big">Guardar</button>
        </div>
      </form>
    </Panel>
  );
}
