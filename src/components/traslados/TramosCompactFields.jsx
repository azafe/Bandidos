import { useRef, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { compartirTramo, patchTramosDraft, seleccionarTramos } from "../../lib/trasladoDraft";

const nombres = { busqueda: "búsqueda", entrega: "entrega" };
const options = (items, selected, condition) => items.filter((v) => v.id === selected || condition(v));

export default function TramosCompactFields({ value, onChange, fecha, disabled = false }) {
  const vehicles = useApiResource("/v2/vehiculos");
  const zones = useApiResource("/v2/traslado-zonas");
  const employees = useApiResource("/v2/employees");
  const guardados = useRef({});
  const entregaDiferente = useRef(null);
  const [diferentes, setDiferentes] = useState(false);
  const ambos = value.length === 2;
  const modo = ambos ? "ambos" : value[0]?.tipo || "ambos";
  const base = value.find((t) => t.tipo === "busqueda") || value[0];
  const entrega = value.find((t) => t.tipo === "entrega");
  function change(rows) {
    for (const t of value) guardados.current[t.tipo] = t;
    for (const t of rows) guardados.current[t.tipo] = t;
    onChange(rows);
  }
  const patch = (tipo, cambios, shared = false) => change(patchTramosDraft(value, tipo, cambios, shared && ambos && !diferentes));
  function toggleDifferent(checked) {
    setDiferentes(checked);
    if (!entrega || !base) return;
    if (checked && entregaDiferente.current) {
      patch("entrega", { direccion: entregaDiferente.current.direccion, chofer_id: entregaDiferente.current.chofer_id, vehiculo_id: entregaDiferente.current.vehiculo_id });
    } else if (!checked) {
      entregaDiferente.current = entrega;
      change(value.map((t) => t.tipo === "entrega" ? compartirTramo(base, t) : t));
    }
  }
  function asignacion(t, shared) {
    const suffix = shared ? "" : ` de ${nombres[t.tipo]}`;
    return <div className="nuevo-turno-row" key={t.tipo}>
      <label className="form-field"><span>Chofer{suffix}</span><select aria-label={`Chofer${suffix}`} value={t.chofer_id || ""} onChange={(e) => patch(t.tipo, { chofer_id: e.target.value || null }, shared)}><option value="">Sin asignar</option>{options(employees.items, t.chofer_id, (v) => v.is_driver && v.status === "active").map((v) => <option key={v.id} value={v.id}>{v.name}{v.status !== "active" ? " (inactivo)" : ""}</option>)}</select></label>
      <label className="form-field"><span>Móvil{suffix}</span><select aria-label={`Móvil${suffix}`} value={t.vehiculo_id || ""} onChange={(e) => patch(t.tipo, { vehiculo_id: e.target.value || null }, shared)}><option value="">Sin asignar</option>{options(vehicles.items, t.vehiculo_id, (v) => v.activo).map((v) => <option key={v.id} value={v.id}>{v.nombre}{!v.activo ? " (inactivo)" : ""}</option>)}</select></label>
    </div>;
  }
  return <fieldset className="nuevo-tramos" disabled={disabled}>
    <legend className="nuevo-turno-sr-only">Datos del traslado</legend>
    <div className="nuevo-turno-field"><span className="nuevo-turno-label">¿Qué necesita?</span><div className="nuevo-turno-segmentos" role="group" aria-label="Tipo de traslado">{[["busqueda", "Solo búsqueda"], ["entrega", "Solo entrega"], ["ambos", "Ida y vuelta"]].map(([id, label]) => <button type="button" key={id} aria-pressed={modo === id} onClick={() => change(seleccionarTramos(value, guardados.current, id, diferentes))}>{label}</button>)}</div></div>
    {base && <>
      <label className="form-field"><span>{ambos && diferentes ? "Dirección de búsqueda" : "Dirección"}</span><input aria-label={ambos && diferentes ? "Dirección de búsqueda" : "Dirección"} value={base.direccion || ""} onChange={(e) => patch(base.tipo, { direccion: e.target.value }, true)} placeholder="Calle y número" autoComplete="street-address" /></label>
      {ambos && !diferentes && <p className="nuevo-turno-helper">La misma para búsqueda y entrega.</p>}
      <div className="nuevo-turno-row">{value.map((t) => <label className="form-field" key={t.tipo}><span>{t.tipo === "busqueda" ? "Búsqueda" : "Entrega"} <small>(hora opcional)</small></span><input aria-label={`Hora de ${nombres[t.tipo]}`} type="time" value={t.hora_programada?.slice(0, 5) || ""} onChange={(e) => patch(t.tipo, { hora_programada: e.target.value })} /></label>)}</div>
      {ambos && <label className="nuevo-turno-check"><input type="checkbox" checked={diferentes} onChange={(e) => toggleDifferent(e.target.checked)} /><span>La entrega tiene otros datos</span></label>}
      {ambos && diferentes && <label className="form-field"><span>Dirección de entrega</span><input value={entrega.direccion || ""} onChange={(e) => patch("entrega", { direccion: e.target.value })} placeholder="Dirección para llevarla de vuelta" /></label>}
      <details className="nuevo-turno-disclosure nuevo-turno-asignacion"><summary><span className="nuevo-turno-disclosure__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg></span><span><strong>Chofer y móvil</strong><small>{value.some((t) => t.chofer_id || t.vehiculo_id) ? "Ver o cambiar la asignación." : "Podés asignarlos después."}</small></span><span className="nuevo-turno-chevron" aria-hidden="true">⌄</span></summary><div className="nuevo-turno-disclosure__body">{asignacion(base, !diferentes)}{ambos && diferentes && asignacion(entrega, false)}
      <details className="nuevo-turno-disclosure nuevo-turno-extras"><summary><span><strong>Fecha y zona</strong><small>{value.some((t) => t.fecha_programada && t.fecha_programada !== fecha || t.zona_id) ? "Hay una fecha o zona específica." : "Mismo día del turno · zona opcional"}</small></span><span className="nuevo-turno-chevron" aria-hidden="true">⌄</span></summary><div className="nuevo-turno-disclosure__body">{value.map((t) => <div className="nuevo-turno-row" key={t.tipo}><label className="form-field"><span>Fecha de {nombres[t.tipo]}</span><input type="date" aria-label={`Fecha de ${nombres[t.tipo]}`} value={t.fecha_programada || fecha} onChange={(e) => patch(t.tipo, { fecha_programada: e.target.value })} /></label><label className="form-field"><span>Zona de {nombres[t.tipo]}</span><select aria-label={`Zona de ${nombres[t.tipo]}`} value={t.zona_id || ""} onChange={(e) => patch(t.tipo, { zona_id: e.target.value || null })}><option value="">Sin zona</option>{options(zones.items, t.zona_id, (v) => v.activo).map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.tarifa == null ? "" : ` · sugerido $${Number(v.tarifa).toLocaleString("es-AR")}`}</option>)}</select></label></div>)}</div></details></div></details>
    </>}
    {(vehicles.loading || employees.loading || zones.loading) && <p className="nuevo-turno-helper" role="status">Cargando opciones de traslado…</p>}
    {[vehicles.error, employees.error, zones.error].some(Boolean) && <div className="nuevo-turno-error" role="alert"><p>No se pudieron cargar todas las opciones. Podés guardar sin asignación y completarla después.</p><button type="button" className="nuevo-turno-link" onClick={() => { vehicles.refresh(); employees.refresh(); zones.refresh(); }}>Reintentar opciones</button></div>}
  </fieldset>;
}
