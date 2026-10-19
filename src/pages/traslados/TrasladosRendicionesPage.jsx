import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { aprobarReintegro, confirmarRendicion, listarRendiciones, repartirRemuneracion, revisarRendiciones } from "../../services/trasladosApi";
import { fechaRendicion, formatoRendicion as fmt } from "../../lib/rendiciones";
import { todayISO } from "../../utils/dates";
import RendicionDetalle from "../../components/traslados/RendicionDetalle";
import RendicionPanel from "../../components/traslados/RendicionPanel";
import { RendicionConceptos, RendicionImportes, RendicionSaldo } from "../../components/traslados/RendicionResumen";
import "../../styles/traslados.css";
import "../../styles/traslados-rendiciones.css";

function PersonaSelect({ label = "Persona", people, value, onChange, required = true }) {
  return <label className="form-field">{label}<select required={required} value={value} onChange={onChange}><option value="">Elegí una persona</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (inactiva)" : ""}</option>)}</select></label>;
}
function GastoRevision({ gasto, people, busy, mutate }) {
  const [persona, setPersona] = useState(gasto.persona_id || ""), [reintegro, setReintegro] = useState(gasto.reintegrable === null ? "" : gasto.reintegrable ? "si" : "no");
  return <form className="traslados-tramo" onSubmit={(e) => { e.preventDefault(); mutate(() => aprobarReintegro(gasto.id, { persona_id: persona, reintegrable: reintegro === "si", revision: gasto.revision }), "Gasto revisado."); }}>
    <h3>{gasto.concepto} · {fmt(gasto.monto)}</h3><p>{fechaRendicion(gasto.fecha)} · Pagador registrado: {gasto.pagado_por}</p>
    {gasto.congelado ? <p>Incluido en una rendición confirmada. {people.find((p) => p.id === gasto.persona_id)?.name} · {gasto.reintegrable ? "Reintegrable" : "A cargo de la persona"}.</p> : <fieldset disabled={busy}>
      <div className="form-grid"><PersonaSelect label="Quién pagó este gasto" people={people} value={persona} onChange={(e) => setPersona(e.target.value)} /><label className="form-field">¿Corresponde reintegrarlo?<select required value={reintegro} onChange={(e) => setReintegro(e.target.value)}><option value="">Sin definir</option><option value="si">Sí, lo reintegra el negocio</option><option value="no">No, queda a cargo de la persona</option></select></label></div>
      <button type="submit" className="btn-secondary" disabled={!persona || !reintegro}>{gasto.revisado ? "Actualizar revisión del gasto" : "Guardar revisión del gasto"}</button>
    </fieldset>}
  </form>;
}
function RepartoPersonas({ trip, people, busy, mutate }) {
  const [rows, setRows] = useState(() => trip.items.length ? trip.items.map((i) => ({ ...i, row: crypto.randomUUID(), porcentaje: String(i.porcentaje) })) : [{ row: crypto.randomUUID(), persona_id: "", porcentaje: "" }]);
  const total = rows.reduce((s, i) => s + Number(i.porcentaje || 0), 0);
  const valid = rows.length > 0 && rows.every((i) => i.persona_id && Number(i.porcentaje) > 0) && new Set(rows.map((i) => i.persona_id)).size === rows.length && Math.abs(total - 100) < 0.0001;
  const change = (row, key, value) => setRows((old) => old.map((i) => i.row === row ? { ...i, [key]: value } : i));
  return <form className="traslados-tramo" onSubmit={(e) => { e.preventDefault(); mutate(() => repartirRemuneracion(trip.cobro_id, { revision: trip.revision, items: rows.map((i) => ({ persona_id: i.persona_id, porcentaje: Number(i.porcentaje) })) }), "Remuneración repartida."); }}>
    <h3>{trip.mascota || "Traslado"} · {fechaRendicion(trip.fecha)}</h3><p>Cobrado: {fmt(trip.cobrado)} · Remuneración a repartir: <strong>{fmt(trip.remuneracion)}</strong></p>
    {trip.congelado ? <><p>Reparto incluido en una rendición confirmada.</p><ul>{trip.items.map((i) => <li key={i.persona_id}>{people.find((p) => p.id === i.persona_id)?.name} · {i.porcentaje}%</li>)}</ul></> : <fieldset disabled={busy}>
      <p>Repartí la remuneración total del viaje. El cobro del cliente y el precio de ida y vuelta se conservan.</p>
      {rows.map((i, idx) => <div className="rendicion-reparto-fila" key={i.row}><PersonaSelect label={`Persona ${idx + 1}`} people={people} value={i.persona_id} onChange={(e) => change(i.row, "persona_id", e.target.value)} /><label className="form-field">Porcentaje de persona {idx + 1}<input required type="number" min="0.01" max="100" step="0.01" value={i.porcentaje} onChange={(e) => change(i.row, "porcentaje", e.target.value)} /></label><button type="button" className="btn-secondary" onClick={() => setRows((v) => v.filter((r) => r.row !== i.row))}>Quitar persona {idx + 1}</button></div>)}
      <div className="traslados-actions"><button type="button" className="btn-secondary" disabled={rows.length >= 20} onClick={() => setRows((v) => [...v, { row: crypto.randomUUID(), persona_id: "", porcentaje: "" }])}>Agregar persona al reparto</button><button className="btn-primary" type="submit" disabled={!valid}>Guardar reparto entre personas</button></div><p>Total: {total.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</p>
    </fieldset>}
  </form>;
}
function Confirmacion({ data, persona, busy, mutate, onConfirmed }) {
  const [id] = useState(() => crypto.randomUUID()), [confirmed, setConfirmed] = useState(false);
  const p = data.personas.find((v) => v.id === persona), items = data.items.filter((i) => i.persona_id === persona);
  if (!p) return null;
  return <section id="rendicion-preparar" className="card rendicion-confirmacion" aria-label="Preparar rendición de la persona">
    <h2 tabIndex={-1}>Preparar rendición · {p.name}</h2><p className="rendicion-caption">Conceptos nuevos del {fechaRendicion(data.from)} al {fechaRendicion(data.to)}.</p>
    <div className="rendicion-resumen-grid"><RendicionSaldo saldo={p.saldo_por_confirmar} label="Saldo por confirmar" note="Todavía no forma parte del saldo confirmado." /><RendicionImportes cobrado={p.cobrado} remuneracion={p.remuneracion} reintegros={p.reintegros} /></div>
    {items.length > 0 ? <details className="rendicion-conceptos"><summary>Revisar {items.length} conceptos incluidos</summary><RendicionConceptos items={items} /></details> : <p className="rendicion-empty">No hay conceptos nuevos para confirmar de esta persona.</p>}
    {data.pendientes.length > 0 && <p className="rendicion-notice">Completá los pendientes del período antes de confirmar.</p>}
    <p className="rendicion-caption">Confirmar guarda el detalle y su saldo. El dinero se registra después, cuando se entrega o paga.</p>
    <label className="traslados-check"><input type="checkbox" disabled={busy || !items.length || data.pendientes.length > 0} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Revisé los conceptos y el saldo de esta persona</label>
    <button type="button" className="btn-primary" disabled={busy || !confirmed || !items.length || data.pendientes.length > 0} onClick={() => mutate(async () => { const d = await confirmarRendicion({ id, persona_id: persona, from: data.from, to: data.to, revision: data.revision, confirmar: true }); onConfirmed(d.id); return d; }, "Rendición confirmada. El saldo sigue pendiente hasta registrar el dinero.")}>Confirmar rendición</button>
  </section>;
}

export default function TrasladosRendicionesPage() {
  const [from, setFrom] = useState(() => `${todayISO().slice(0, 7)}-01`), [to, setTo] = useState(todayISO);
  const [persona, setPersona] = useState(""), [offset, setOffset] = useState(0), [activeId, setActiveId] = useState("");
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [data, setData] = useState(null), [history, setHistory] = useState({ items: [], total: 0 }), [medios, setMedios] = useState([]);
  // La selección cambia antes de que el efecto marque la carga: no reutilizar datos ni enfocar nodos del filtro anterior.
  const [loadedSelection, setLoadedSelection] = useState(null);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [panels, setPanels] = useState({}), [target, setTarget] = useState(""), [registrar, setRegistrar] = useState(false);
  const returnFocus = useRef(null);
  const validRange = from && to && from <= to;
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      if (!from || !to || from > to) { setData(null); setLoading(false); return; }
      try {
        const [d, h, m] = await Promise.all([revisarRendiciones({ from, to }), listarRendiciones({ persona_id: persona || undefined, limit: 20, offset }), apiRequest("/v2/payment-methods")]);
        if (active) { setData(d); setHistory(h); setMedios(m); setLoadedSelection({ persona, offset, refresh }); }
      } catch (e) { if (active) { setData(null); setError(e.message); } }
      finally { if (active) setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [from, to, persona, offset, refresh]);
  async function mutate(action, text) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(text); setRefresh((v) => v + 1); return true; }
    catch (e) { setError(`${e.message}${e.status === 409 ? " Volvé a cargar para revisar los datos actuales." : ""}`); return false; }
    finally { setBusy(false); }
  }
  const visible = !loading && data?.from === from && data?.to === to && loadedSelection?.persona === persona && loadedSelection?.offset === offset && loadedSelection?.refresh === refresh;
  const shownPeople = visible ? data.personas.filter((p) => (!persona || p.id === persona) && (p.cantidad > 0 || p.saldo_confirmado_pendiente !== 0 || p.id === persona)) : [];
  useEffect(() => {
    if (!target || !visible) return;
    const frame = requestAnimationFrame(() => {
      if (target === "rendicion-return") {
        const origin = returnFocus.current;
        const canRestore = origin?.isConnected && origin !== document.body && origin !== document.documentElement && !origin.disabled && origin.getClientRects().length > 0;
        const destination = canRestore ? origin : document.getElementById("rendicion-personas-title");
        destination?.focus();
        setTarget("");
        return;
      }
      const section = document.getElementById(target);
      if (!section) return;
      section.scrollIntoView({ block: "start" });
      (section.querySelector("summary, h2") || section).focus({ preventScroll: true });
      setTarget("");
    });
    return () => cancelAnimationFrame(frame);
  }, [target, visible]);
  const togglePanel = (id, open) => setPanels((p) => p[id] === open ? p : { ...p, [id]: open });
  function goTo(id, person = persona) {
    setPersona(person); setOffset(0); setActiveId(""); setMessage("");
    setPanels((p) => ({ ...p, [id]: true })); setTarget(id);
  }
  function openDetail(id, movimiento = false) {
    returnFocus.current = document.activeElement;
    setRegistrar(movimiento); setActiveId(id); setTarget("rendicion-detalle"); setError(""); setMessage("");
  }
  function closeDetail() {
    setActiveId(""); setMessage(""); setTarget("rendicion-return");
  }
  const feedback = <>{error && <p role="alert" className="rendicion-feedback traslados-error">{error}</p>}{message && <p role="status" className="rendicion-feedback">{message}</p>}</>;
  const pendientesGastos = visible ? data.gastos.filter((g) => !g.revisado).length : 0;
  const pendientesRepartos = visible ? data.viajes.filter((t) => !t.repartido).length : 0;
  return <div className="page-content traslados-resultados rendiciones-page">
    <header className="rendiciones-heading"><div><span className="rendicion-eyebrow">Bandimóviles</span><h1>Rendiciones</h1><p>Las cuentas de cada chofer y socio, en un solo lugar.</p></div><button className="btn-secondary" type="button" disabled={busy || loading || !validRange} onClick={() => setRefresh((v) => v + 1)}>Actualizar</button></header>
    <nav className="rendiciones-nav" aria-label="Secciones de Bandimóviles"><Link to="/traslados/resultados">Resultados</Link><Link to="/expenses/daily-incomes">Movimientos en Caja</Link></nav>
    <fieldset className="rendiciones-filtros" disabled={busy}><legend>Conceptos por revisar</legend>
      <label className="form-field">Desde<input required type="date" value={from} max={to || todayISO()} onChange={(e) => { setFrom(e.target.value); setMessage(""); }} /></label>
      <label className="form-field">Hasta<input required type="date" value={to} min={from} max={todayISO()} onChange={(e) => { setTo(e.target.value); setMessage(""); }} /></label>
      <label className="form-field">Filtrar persona<select value={persona} onChange={(e) => { setPersona(e.target.value); setOffset(0); setActiveId(""); setMessage(""); }}><option value="">Todas las personas</option>{data?.personas.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (inactiva)" : ""}</option>)}</select></label>
    </fieldset>
    {!validRange && <p role="alert">Elegí un período válido.</p>}{!activeId && feedback}
    {loading && <p role="status">Cargando rendiciones…</p>}
    {visible && <>
      <section aria-labelledby="rendicion-personas-title"><div className="rendicion-section-heading"><h2 id="rendicion-personas-title" tabIndex={-1}>Saldos por persona</h2><span className="rendicion-caption">Confirmados · todos los períodos</span></div>
        <div className="rendicion-personas">{shownPeople.map((p) => <article className="rendicion-persona" key={p.id} aria-label={`Cuenta de ${p.name}`}>
          <div className="rendicion-persona__name"><h3>{p.name}</h3>{p.status !== "active" && <span className="rendicion-status">Inactiva</span>}</div>
          <RendicionSaldo saldo={p.saldo_confirmado_pendiente} label="Saldo neto confirmado" neto />
          <div className="rendicion-persona__review"><span>Por confirmar en este período</span><strong>{p.saldo_por_confirmar === null ? "Por revisar" : fmt(Math.abs(p.saldo_por_confirmar))}</strong><small>{p.saldo_por_confirmar === null ? "Faltan datos para calcularlo" : p.saldo_por_confirmar > 0 ? "A entregar al local" : p.saldo_por_confirmar < 0 ? "A recibir del local" : `${p.cantidad} conceptos nuevos · saldo en cero`}</small></div>
          <div className="rendicion-persona__actions"><button type="button" className={p.saldo_confirmado_pendiente !== 0 ? "btn-primary" : "btn-secondary"} disabled={busy} onClick={() => goTo("rendicion-historial", p.id)}>{p.saldo_confirmado_pendiente !== 0 ? "Ver entregas y pagos" : "Ver rendiciones"}<span className="rendicion-sr-only"> de {p.name}</span></button><button type="button" className={p.saldo_confirmado_pendiente === 0 && p.cantidad > 0 ? "btn-primary" : "btn-secondary"} disabled={busy} onClick={() => goTo("rendicion-preparar", p.id)}>Preparar rendición<span className="rendicion-sr-only"> de {p.name}</span></button></div>
        </article>)}</div>
        {!shownPeople.length && <p className="rendicion-empty">No hay conceptos ni saldos pendientes para mostrar. Podés elegir una persona para consultar su historial.</p>}
        <p className="rendicion-caption">El saldo neto reúne las rendiciones confirmadas de todos los períodos. Cada entrega o pago se registra en su rendición.</p>
      </section>
    </>}
    {activeId && <>{feedback}<RendicionDetalle key={activeId} id={activeId} refresh={refresh} medios={medios} busy={busy} mutate={mutate} registrar={registrar} onClose={closeDetail} /></>}
    {visible && <>
      {data.pendientes.length > 0 && <section className="rendicion-pendientes" aria-label="Pendientes del período"><h2>Antes de confirmar</h2><p>{data.pendientes.length} {data.pendientes.length === 1 ? "pendiente del período" : "pendientes del período"}. La revisión abarca todas las personas.</p><div className="rendicion-pendientes__actions">
        {pendientesGastos > 0 && <button className="btn-secondary" type="button" disabled={busy} onClick={() => goTo("rendicion-gastos")}>Revisar {pendientesGastos} {pendientesGastos === 1 ? "gasto" : "gastos"}</button>}
        {pendientesRepartos > 0 && <button className="btn-secondary" type="button" disabled={busy} onClick={() => goTo("rendicion-repartos")}>Repartir {pendientesRepartos} {pendientesRepartos === 1 ? "remuneración" : "remuneraciones"}</button>}
        {data.pendientes.some((p) => p.tipo === "condiciones" || p.tipo === "jornal") && <Link to="/traslados/resultados">Revisar condiciones y jornales</Link>}
      </div><details><summary>Ver detalle de pendientes</summary><ul>{data.pendientes.map((p) => <li key={`${p.tipo}-${p.id}-${p.descripcion}`}>{p.descripcion}</li>)}</ul></details></section>}
      {persona ? <Confirmacion key={`${persona}-${data.revision}`} data={data} persona={persona} busy={busy} mutate={mutate} onConfirmed={(id) => openDetail(id, true)} /> : <p className="rendicion-caption">Elegí “Preparar rendición” en una persona para revisar sus conceptos nuevos.</p>}
      <RendicionPanel id="rendicion-historial" title="Historial de rendiciones" description={`Confirmadas de ${persona ? data.personas.find((p) => p.id === persona)?.name : "todas las personas"} · todos los períodos`} badge={history.total} open={!!panels["rendicion-historial"]} onToggle={togglePanel}>
        <div className="rendicion-historial">{history.items.map((r) => <article className="rendicion-historial__item" key={r.id}>
          <div><h3>{r.persona_nombre}</h3><p className="rendicion-caption">{fechaRendicion(r.desde)} al {fechaRendicion(r.hasta)} · #{r.id.slice(0, 8)}</p></div>
          <RendicionSaldo saldo={r.saldo_pendiente} label="Saldo pendiente de esta rendición" anulada={r.anulada} />
          <div className="traslados-actions"><button className="btn-secondary" type="button" disabled={busy} onClick={() => openDetail(r.id)}>Ver rendición {r.id.slice(0, 8)}</button>{!r.anulada && r.saldo_pendiente !== 0 && <button type="button" className="btn-primary" disabled={busy} onClick={() => openDetail(r.id, true)}>{r.saldo_pendiente > 0 ? "Registrar entrega" : "Registrar pago"}<span className="rendicion-sr-only"> de {r.persona_nombre} · {r.id.slice(0, 8)}</span></button>}</div>
        </article>)}</div>
        {!history.items.length && <p className="rendicion-empty">No hay rendiciones confirmadas para esta selección.</p>}
        {history.total > 20 && <div className="traslados-actions rendicion-pagination"><button className="btn-secondary" type="button" disabled={busy || offset === 0} onClick={() => { setOffset((v) => Math.max(0, v - 20)); setTarget("rendicion-historial"); }}>Anteriores</button><span className="rendicion-caption">{offset + 1}–{Math.min(offset + 20, history.total)} de {history.total}</span><button className="btn-secondary" type="button" disabled={busy || offset + 20 >= history.total} onClick={() => { setOffset((v) => v + 20); setTarget("rendicion-historial"); }}>Más rendiciones</button></div>}
      </RendicionPanel>
      <h2 className="rendicion-section-label">Revisión del período · todas las personas</h2>
      <RendicionPanel id="rendicion-gastos" title="Gastos y reintegros" description="Identificá quién pagó y si corresponde devolverle el dinero." badge={pendientesGastos ? `${pendientesGastos} por revisar` : `${data.gastos.length} ${data.gastos.length === 1 ? "revisado" : "revisados"}`} open={!!panels["rendicion-gastos"]} onToggle={togglePanel}>
        <p className="rendicion-caption">El nombre escrito anteriormente se conserva como referencia. Esta revisión abarca el período completo, aunque filtres una persona.</p>{data.gastos.map((g) => <GastoRevision key={`${g.id}-${g.revision}`} gasto={g} people={data.personas} busy={busy} mutate={mutate} />)}{!data.gastos.length && <p className="rendicion-empty">No hay gastos externos activos en este período.</p>}
      </RendicionPanel>
      <RendicionPanel id="rendicion-repartos" title="Remuneración por viaje" description="Repartí el pago pactado entre quienes participaron." badge={pendientesRepartos ? `${pendientesRepartos} por repartir` : `${data.viajes.length} ${data.viajes.length === 1 ? "revisado" : "revisados"}`} open={!!panels["rendicion-repartos"]} onToggle={togglePanel}>
        <p className="rendicion-caption">Es independiente del reparto entre vehículos. Un jornal ya identifica a su chofer y se cuenta una sola vez.</p>{data.viajes.map((t) => <RepartoPersonas key={`${t.cobro_id}-${t.revision}`} trip={t} people={data.personas} busy={busy} mutate={mutate} />)}{!data.viajes.length && <p className="rendicion-empty">No hay remuneraciones porcentuales para repartir en este período.</p>}
      </RendicionPanel>
      <details className="rendicion-ayuda"><summary>Cómo se calcula y qué incluye</summary><p>Saldo inicial = cobrado a clientes − remuneración − reintegros aprobados. Después se descuentan las entregas al local y se suman los pagos a la persona.</p><p>Se usan cobros explícitos y conceptos identificados. Los históricos sin cobrador conocido conservan su revisión aparte.</p><p>Confirmar una rendición guarda el saldo; registrar una entrega o un pago deja constancia del dinero que efectivamente se movió.</p></details>
    </>}
  </div>;
}
