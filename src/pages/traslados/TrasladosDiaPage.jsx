import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { avanzarTramo, getHojaDeRuta, ordenarRuta } from "../../services/trasladosApi";
import { ESTADOS_TRAMO, gruposDeRuta, moverParada, resumenRuta, coincideVistaRuta, faltantesParada } from "../../lib/trasladosRuta";
import { todayISO, addDaysISO } from "../../utils/dates";
import "../../styles/traslados.css";
import "../../styles/traslados-recorrido.css";
import ParadaRuta from "../../components/traslados/ParadaRuta";
import RevisionHistoricos from "../../components/traslados/RevisionHistoricos";
import TrasladoHistoricoDetalle from "../../components/traslados/TrasladoHistoricoDetalle";
import { NUEVO_TRASLADO } from "../../lib/bandimovilesInicio";

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
  const [filterError, setFilterError] = useState("");
  const [vista, setVista] = useState("todas");
  const [ordenando, setOrdenando] = useState({});
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
      .catch(() => { if (active) setFilterError("No se pudieron cargar los filtros. Podés consultar la hoja de ruta y volver a cargar la pantalla."); });
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
  const operativas = data.items.filter((t) => t.estado !== "cancelado");
  const groups = gruposDeRuta(operativas);
  const resumen = resumenRuta(operativas);
  const vistas = [["todas", "Todas", resumen.total], ["pendientes", "Por salir", resumen.pendientes], ["enViaje", "En viaje", resumen.enViaje], ["completadas", "Completadas", resumen.completadas]];
  const shownGroups = groups.filter((g) => g.items.some((t) => coincideVistaRuta(t, vista)));
  const hoy = fecha === todayISO();
  const fechaLabel = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const changeFecha = (value) => { if (value) { setMessage(""); setFecha(value); } };
  function advance(tramo, next) {
    mutate(() => avanzarTramo(tramo.id, tramo.estado, next), `${tramo.pet_name || "Mascota"}: ${ESTADOS_TRAMO[next].toLowerCase()}.`);
  }
  function revisarFaltantes() {
    const parada = operativas.find((t) => t.estado !== "entregado" && faltantesParada(t).length > 0);
    setVista("todas");
    requestAnimationFrame(() => {
      const card = document.getElementById(`parada-${parada?.id}`);
      card?.scrollIntoView({ block: "start" });
      card?.focus({ preventScroll: true });
    });
  }

  return <div className="page-content traslados-dia recorrido-page">
    <header className="recorrido-heading"><div><span className="recorrido-eyebrow">Bandimóviles · Operación diaria</span>
      <h1>{driver ? "Mis traslados" : "Recorrido del día"}</h1>
      <p>{driver ? "Tu próxima parada y lo que falta para terminar." : "Cada búsqueda y entrega, en el orden de tu ruta."}</p>
    </div>{!driver && <Link className="btn-primary" to={NUEVO_TRASLADO}>+ Agendar traslado</Link>}</header>
    <section className="recorrido-filtros" aria-label="Filtros de la hoja de ruta">
      <fieldset disabled={busy}>
        <div className="recorrido-dia"><div><span className="recorrido-eyebrow">{hoy ? "Hoy" : "Fecha del recorrido"}</span><strong>{fechaLabel}</strong></div>
          <div className="recorrido-fecha">
            <button type="button" aria-label="Día anterior" onClick={() => changeFecha(addDaysISO(fecha, -1))}>‹</button>
            <label className="form-field"><span className="recorrido-sr-only">Fecha</span><input type="date" required value={fecha} onChange={(e) => changeFecha(e.target.value)} /></label>
            <button type="button" aria-label="Día siguiente" onClick={() => changeFecha(addDaysISO(fecha, 1))}>›</button>
            {!hoy && <button type="button" className="recorrido-hoy" onClick={() => changeFecha(todayISO())}>Hoy</button>}
          </div>
        </div>
        <div className="recorrido-filtros__selects">
          {!driver && <label className="form-field"><span>Chofer</span><select aria-label="Chofer" value={chofer} onChange={(e) => setChofer(e.target.value)}><option value="">Todos los choferes</option>{catalogs.drivers.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status !== "active" ? " (inactivo)" : ""}</option>)}</select></label>}
          {!driver && <label className="form-field"><span>Móvil</span><select aria-label="Móvil" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)}><option value="">Todos los móviles</option>{catalogs.vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select></label>}
          <button className="btn-secondary" type="button" onClick={() => { setMessage(""); load(); }} disabled={loading}>↻ Actualizar</button>
        </div>
      </fieldset>
    </section>
    {filterError && <p role="alert" className="recorrido-feedback">{filterError}</p>}
    {message && <p role="status" className="recorrido-feedback">{message}</p>}
    {error && <div role="alert" className="recorrido-feedback traslados-error"><p>{error}</p><button className="btn-secondary" type="button" disabled={busy || loading} onClick={load}>Reintentar consulta</button></div>}
    {driver && user?.chofer_activo === false ? <div className="recorrido-empty">Tu acceso de chofer está inactivo. Contactá al administrador.</div>
      : loading ? <p role="status" className="recorrido-empty">Cargando recorrido…</p> : !error && <>
        <section className="recorrido-resumen" aria-label="Avance del recorrido">
          <div className="recorrido-resumen__principal"><span>{hoy ? "El día de hoy" : "El día elegido"}</span><strong>{resumen.completadas}<small> / {resumen.total} paradas</small></strong><span>{resumen.total > 0 && resumen.completadas === resumen.total ? "Todo el recorrido completado" : "completadas"}</span><progress aria-label="Paradas completadas" value={resumen.completadas} max={resumen.total || 1} /></div>
          <div><span className="recorrido-dot recorrido-dot--pending" /><strong>{resumen.pendientes}</strong><span>Por salir</span></div>
          <div><span className="recorrido-dot recorrido-dot--active" /><strong>{resumen.enViaje}</strong><span>En viaje</span></div>
          <div><span className="recorrido-dot recorrido-dot--done" /><strong>{resumen.completadas}</strong><span>Completadas</span></div>
        </section>
        {resumen.porPreparar > 0 && <div className="recorrido-aviso"><p><strong>{resumen.porPreparar} {resumen.porPreparar === 1 ? "parada necesita" : "paradas necesitan"} datos antes de salir.</strong> {driver ? "Consultá con el administrador." : "Completá la dirección, el chofer o el móvil en Agenda."}</p><button className="recorrido-aviso-link" type="button" disabled={busy} onClick={revisarFaltantes}>Ver qué falta →</button></div>}
        <div className="recorrido-list-heading"><h2>Paradas del recorrido</h2><span>{groups.length} {groups.length === 1 ? "ruta" : "rutas"} · {driver ? "Tus traslados" : "Según chofer y móvil"}</span></div>
        <nav className="recorrido-vistas" aria-label="Filtrar paradas por estado">{vistas.map(([key, label, count]) => <button type="button" key={key} aria-pressed={vista === key} disabled={busy} onClick={() => setVista(key)}>{label}<span>{count}</span></button>)}</nav>
        {!operativas.length ? <div className="recorrido-empty"><span aria-hidden="true">✓</span><h2>{driver ? "No tenés paradas asignadas" : "Sin búsquedas ni entregas para este día"}</h2><p>{chofer || vehiculo ? "Probá con otro chofer, móvil o fecha." : driver ? "Cuando te asignen un traslado, lo vas a encontrar acá." : "Agendá un turno con traslado para armar el recorrido."}</p>{!driver && <Link to={NUEVO_TRASLADO}>Agendar un traslado →</Link>}</div>
          : !shownGroups.length && <div className="recorrido-empty"><h2>No hay paradas en este estado</h2><p>Podés seguir con el resto del recorrido.</p><button className="btn-secondary" type="button" onClick={() => setVista("todas")}>Ver todas las paradas</button></div>}
        {shownGroups.map((group) => {
          const next = group.items.find((t) => t.estado === "en_camino" || t.estado === "retirado") || group.items.find((t) => t.estado === "pendiente");
          const completas = group.items.filter((t) => t.estado === "entregado").length;
          const puedeOrdenar = admin && group.chofer_id && group.vehiculo_id && group.items.length > 1 && vista === "todas";
          return <section className="recorrido-ruta" key={group.key} aria-label={`Ruta de ${group.chofer} · ${group.vehiculo}`}>
            <header className="recorrido-ruta__heading"><div className="recorrido-ruta__avatar" aria-hidden="true">{group.chofer_id ? group.chofer.charAt(0) : "?"}</div><div><h2>{group.chofer}</h2><p>{group.vehiculo} · {completas} de {group.items.length} completadas</p></div>{puedeOrdenar && <button type="button" className="recorrido-order-toggle" disabled={busy} aria-pressed={!!ordenando[group.key]} onClick={() => setOrdenando((v) => ({ ...v, [group.key]: !v[group.key] }))}>{ordenando[group.key] ? "Terminar de ordenar" : "Ordenar paradas"}</button>}</header>
            {puedeOrdenar && ordenando[group.key] && <p className="recorrido-order-help">Usá Subir o Bajar para cambiar el orden de esta ruta. Cada cambio se guarda.</p>}
            <ol className="recorrido-paradas">{group.items.map((tramo, index) => coincideVistaRuta(tramo, vista) && <ParadaRuta key={tramo.id} tramo={tramo} numero={index + 1} destacada={tramo.id === next?.id} driver={driver} busy={busy} onAdvance={advance}
              orden={puedeOrdenar && ordenando[group.key] && <div className="recorrido-orden" aria-label={`Orden de ${tramo.pet_name}`}>
                {[-1, 1].map((delta) => <button type="button" key={delta} disabled={busy || index + delta < 0 || index + delta >= group.items.length} onClick={() => mutate(() => ordenarRuta({ fecha, chofer_id: group.chofer_id, vehiculo_id: group.vehiculo_id, tramos: moverParada(group.items, index, delta).map(({ id, revision }) => ({ id, revision })) }), "Orden de ruta guardado.")}>{delta < 0 ? "↑ Subir" : "↓ Bajar"}</button>)}
              </div>} />)}</ol>
          </section>;
        })}
        {!driver && (data.historial || []).length > 0 && <details className="recorrido-historicos"><summary>Historial importado · {data.historial.length} traslados</summary><p>Son registros anteriores. No forman parte de las paradas pendientes.</p>{data.historial.map((h) => <article className="card" key={h.solicitud_id}><h3>{h.pet_name || "Mascota sin nombre"} · {h.owner_name || "Dueño sin registrar"}</h3><TrasladoHistoricoDetalle historico={h} /></article>)}</details>}
        {!driver && data.historicos_pendientes > 0 && <p className="recorrido-aviso">Hay {data.historicos_pendientes} turnos con traslados del formato anterior. Revisalos en Registros anteriores para incorporarlos al historial.</p>}
      </>}
    {admin && <details className="recorrido-historicos"><summary>Registros anteriores · revisión e importación</summary><RevisionHistoricos onImported={load} /></details>}
  </div>;
}
