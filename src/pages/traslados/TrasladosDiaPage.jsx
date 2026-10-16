import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { avanzarTramo, getHojaDeRuta, ordenarRuta } from "../../services/trasladosApi";
import { ESTADOS_TRAMO, SIGUIENTE_ESTADO, gruposDeRuta, moverParada } from "../../lib/trasladosRuta";
import { bandimovilWhatsAppLink } from "../../utils/whatsapp";
import { mapsLink } from "../../lib/booking/format";
import { todayISO, addDaysISO } from "../../utils/dates";
import "../../styles/traslados.css";
import RevisionHistoricos from "../../components/traslados/RevisionHistoricos";
import TrasladoHistoricoDetalle from "../../components/traslados/TrasladoHistoricoDetalle";

export default function TrasladosDiaPage() {
  const { user } = useAuth();
  const driver = !!user?.chofer_id;
  const admin = user?.role === "admin" && !driver;
  const [fecha, setFecha] = useState(todayISO);
  const [chofer, setChofer] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [catalogs, setCatalogs] = useState({ drivers: [], vehicles: [] });
  const [data, setData] = useState({ items: [], historicos_pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const params = useMemo(() => ({ fecha, ...(!driver && chofer ? { chofer_id: chofer } : {}), ...(vehiculo ? { vehiculo_id: vehiculo } : {}) }), [fecha, chofer, vehiculo, driver]);
  const load = useCallback(async () => {
    const requestId = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await getHojaDeRuta(params);
      if (requestId === generation.current) setData(result);
    } catch (err) {
      if (requestId === generation.current) { setError(err.message); setData({ items: [], historicos_pendientes: 0 }); }
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, [params]);
  useEffect(() => {
    load();
    return () => { generation.current += 1; };
  }, [load]);
  useEffect(() => {
    if (driver) return;
    let active = true;
    Promise.all([apiRequest("/v2/employees"), apiRequest("/v2/vehiculos")])
      .then(([drivers, vehicles]) => { if (active) setCatalogs({ drivers: drivers.filter((e) => e.is_driver), vehicles }); })
      .catch(() => { if (active) setMessage("No se pudieron cargar los filtros. Podés consultar la hoja de ruta y volver a cargar la pantalla."); });
    return () => { active = false; };
  }, [driver]);

  async function mutate(action, success) {
    const current = generation.current;
    setBusy(true); setMessage(""); setError("");
    try {
      await action();
      if (current === generation.current) { setMessage(success); await load(); }
    } catch (err) {
      if (current === generation.current) { await load(); setError(err.message); }
    } finally { setBusy(false); }
  }
  const groups = gruposDeRuta(data.items);
  const done = data.items.filter((t) => t.estado === "entregado").length;
  const vehicles = driver
    ? [...new Map(data.items.map((t) => [t.vehiculo_id, { id: t.vehiculo_id, nombre: t.vehiculo_nombre }])).values()].filter((v) => v.id)
    : catalogs.vehicles;

  return <div className="page-content traslados-dia">
    <header className="page-header"><div>
      <h1>{driver ? "Mis traslados" : "Traslados del día"}</h1>
      <p>{driver ? "Tu recorrido y el estado de cada búsqueda o entrega." : "Organizá las búsquedas y entregas por chofer y móvil."}</p>
    </div></header>
    <section className="card" aria-label="Filtros de la hoja de ruta">
      <fieldset disabled={busy} className="traslados-filtros">
        <div className="traslados-fecha">
          <button type="button" className="btn-secondary" aria-label="Día anterior" onClick={() => { setMessage(""); setFecha(addDaysISO(fecha, -1)); }}>‹</button>
          <label className="form-field"><span>Fecha</span><input type="date" required value={fecha} onChange={(e) => { if (e.target.value) { setMessage(""); setFecha(e.target.value); } }} /></label>
          <button type="button" className="btn-secondary" aria-label="Día siguiente" onClick={() => { setMessage(""); setFecha(addDaysISO(fecha, 1)); }}>›</button>
        </div>
        {!driver && <label className="form-field"><span>Chofer</span><select aria-label="Chofer" value={chofer} onChange={(e) => setChofer(e.target.value)}><option value="">Todos los choferes</option>{catalogs.drivers.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status !== "active" ? " (inactivo)" : ""}</option>)}</select></label>}
        {!driver && <label className="form-field"><span>Móvil</span><select aria-label="Móvil" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)}><option value="">Todos los móviles</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select></label>}
        <button className="btn-secondary" type="button" onClick={() => { setMessage(""); load(); }} disabled={loading}>Actualizar</button>
      </fieldset>
    </section>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="traslados-error">{error}</p>}
    {driver && user?.chofer_activo === false ? <div className="card">Tu acceso de chofer está inactivo. Contactá al administrador.</div>
      : loading ? <p role="status">Cargando hoja de ruta...</p> : <>
        {!driver && data.historicos_pendientes > 0 && <p className="card">Hay {data.historicos_pendientes} turno(s) con traslados del formato anterior. Su importación está pendiente de revisión; todavía no tienen una ruta asignada.</p>}
        <p>{data.items.length} paradas · {done} completadas · {data.items.length - done} pendientes</p>
        {!data.items.length && !error && <div className="card">{driver ? "No tenés traslados asignados para este día." : "No hay paradas operativas para esta fecha y estos filtros."}</div>}
        {groups.map((group) => <section className="traslados-ruta" key={group.key} aria-label={`Ruta de ${group.chofer} · ${group.vehiculo}`}>
          <h2>{group.chofer} · {group.vehiculo}</h2>
          {(!group.chofer_id || !group.vehiculo_id) && <p>Asignación pendiente. Completala desde Agenda antes de salir.</p>}
          <ol className="traslados-paradas">{group.items.map((tramo, index) => {
            const maps = mapsLink(tramo.direccion?.trim());
            const whatsapp = bandimovilWhatsAppLink(tramo.owner_phone, tramo.owner_name, tramo.pet_name, tramo.tipo);
            const next = SIGUIENTE_ESTADO[tramo.estado];
            const ready = !!(tramo.direccion?.trim() && tramo.chofer_id && tramo.vehiculo_id);
            return <li key={tramo.id} className="card traslados-parada">
              <div className="traslados-parada-titulo"><h3>{index + 1}. {tramo.pet_name}</h3><span className={`traslados-estado traslados-estado--${tramo.estado}`}>{ESTADOS_TRAMO[tramo.estado] || "Sin estado"}</span></div>
              <p><strong>{tramo.tipo === "busqueda" ? "Búsqueda" : "Entrega"}</strong> · {tramo.hora_programada?.slice(0, 5) || "Horario pendiente"}</p>
              <p>{tramo.direccion || "Dirección pendiente"}</p>
              <p>{tramo.owner_name || "Dueño sin registrar"} · {tramo.owner_phone || "Teléfono pendiente"}</p>
              {tramo.notas && <p className="traslados-notas">{tramo.notas}</p>}
              <div className="traslados-actions">
                {maps ? <a className="btn-secondary" href={maps} target="_blank" rel="noopener noreferrer">Google Maps</a> : <span>Falta dirección para Maps.</span>}
                {whatsapp ? <a className="btn-secondary" href={whatsapp} target="_blank" rel="noopener noreferrer">Avisar por WhatsApp</a> : <span>Falta un celular válido para WhatsApp.</span>}
              </div>
              {next && <button type="button" className="btn-primary" disabled={busy || !ready} onClick={() => mutate(() => avanzarTramo(tramo.id, tramo.estado, next), `Estado actualizado: ${ESTADOS_TRAMO[next].toLowerCase()}.`)}>{next === "en_camino" ? "Salir · En camino" : next === "retirado" ? "Marcar retirado" : `Confirmar entrega${tramo.tipo === "busqueda" ? " en el local" : " al dueño"}`}</button>}
              {admin && group.chofer_id && group.vehiculo_id && group.items.length > 1 && <div className="traslados-actions" aria-label={`Orden de ${tramo.pet_name}`}>
                {[-1, 1].map((delta) => <button type="button" key={delta} className="btn-secondary" disabled={busy || index + delta < 0 || index + delta >= group.items.length} onClick={() => mutate(() => ordenarRuta({ fecha, chofer_id: group.chofer_id, vehiculo_id: group.vehiculo_id, tramos: moverParada(group.items, index, delta).map(({ id, revision }) => ({ id, revision })) }), "Orden de ruta guardado.")}>{delta < 0 ? "↑ Subir" : "↓ Bajar"}</button>)}
              </div>}
            </li>;
          })}</ol>
        </section>)}
        {!driver && (data.historial || []).length > 0 && <section className="traslados-ruta" aria-label="Historial importado">
          <h2>Historial importado · {data.historial.length} traslados</h2>
          <p>Estos registros se conservan como historia y no se cuentan como paradas pendientes.</p>
          {data.historial.map((h) => <article className="card" key={h.solicitud_id}><h3>{h.pet_name || "Mascota sin nombre"} · {h.owner_name || "Dueño sin registrar"}</h3><TrasladoHistoricoDetalle historico={h} /></article>)}
        </section>}
      </>}
    {admin && <RevisionHistoricos onImported={load} />}
  </div>;
}
