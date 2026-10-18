import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { aprobarReintegro, confirmarRendicion, listarRendiciones, repartirRemuneracion, revisarRendiciones } from "../../services/trasladosApi";
import { formatoRendicion as fmt, sentidoSaldo } from "../../lib/rendiciones";
import { todayISO } from "../../utils/dates";
import RendicionDetalle from "../../components/traslados/RendicionDetalle";
import "../../styles/traslados.css";

function PersonaSelect({ label = "Persona", people, value, onChange, required = true }) {
  return <label className="form-field">{label}<select required={required} value={value} onChange={onChange}><option value="">Elegí una persona</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (inactiva)" : ""}</option>)}</select></label>;
}
function GastoRevision({ gasto, people, busy, mutate }) {
  const [persona, setPersona] = useState(gasto.persona_id || ""), [reintegro, setReintegro] = useState(gasto.reintegrable === null ? "" : gasto.reintegrable ? "si" : "no");
  return <form className="traslados-tramo" onSubmit={(e) => { e.preventDefault(); mutate(() => aprobarReintegro(gasto.id, { persona_id: persona, reintegrable: reintegro === "si", revision: gasto.revision }), "Gasto revisado."); }}>
    <h3>{gasto.concepto} · {fmt(gasto.monto)}</h3><p>{gasto.fecha} · Pagador registrado: {gasto.pagado_por}</p>
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
    <h3>{trip.mascota || "Traslado"} · {trip.fecha}</h3><p>Cobrado: {fmt(trip.cobrado)} · Remuneración a repartir: <strong>{fmt(trip.remuneracion)}</strong></p>
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
  return <section className="card rendicion-confirmacion" aria-label="Preparar rendición de la persona">
    <h2>Preparar rendición · {p.name}</h2><p>Conceptos nuevos del {data.from} al {data.to}. Los ya confirmados se consultan en el historial.</p>
    <div className="rendicion-saldos"><p><span>Cobrado a clientes</span><strong>{fmt(p.cobrado)}</strong></p><p><span>Remuneración identificada</span><strong>{fmt(p.remuneracion)}</strong></p><p><span>Reintegros aprobados</span><strong>{fmt(p.reintegros)}</strong></p><p><span>{sentidoSaldo(p.saldo_por_confirmar)}</span><strong>{fmt(p.saldo_por_confirmar === null ? null : Math.abs(p.saldo_por_confirmar))}</strong></p></div>
    <div className="traslados-tabla-scroll"><table><thead><tr><th>Fecha y concepto</th><th>Importe rendido</th></tr></thead><tbody>{items.map((i) => <tr key={`${i.tipo}-${i.fuente_id}`}><td>{i.fecha}<br />{i.concepto}{i.tipo === "gasto" && !i.detalle.reintegrable && <><br /><small>Pagado: {fmt(i.detalle.monto)} · sin reintegro</small></>}</td><td>{fmt(i.monto)}</td></tr>)}</tbody></table></div>
    {!items.length && <p>No hay conceptos nuevos para confirmar de esta persona.</p>}
    {data.pendientes.length > 0 && <p>Completá los pendientes del período antes de confirmar.</p>}
    <p>Confirmar guarda este detalle y su saldo. La entrega o el pago del dinero se registra después, cuando ocurre.</p>
    <label className="traslados-check"><input type="checkbox" disabled={busy || !items.length || data.pendientes.length > 0} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Revisé los conceptos y el saldo de esta persona</label>
    <button type="button" className="btn-primary" disabled={busy || !confirmed || !items.length || data.pendientes.length > 0} onClick={() => mutate(async () => { const d = await confirmarRendicion({ id, persona_id: persona, from: data.from, to: data.to, revision: data.revision, confirmar: true }); onConfirmed(d.id); return d; }, "Rendición confirmada. El saldo sigue pendiente hasta registrar el dinero.")}>Confirmar rendición</button>
  </section>;
}

export default function TrasladosRendicionesPage() {
  const [from, setFrom] = useState(() => `${todayISO().slice(0, 7)}-01`), [to, setTo] = useState(todayISO);
  const [persona, setPersona] = useState(""), [offset, setOffset] = useState(0), [activeId, setActiveId] = useState("");
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [data, setData] = useState(null), [history, setHistory] = useState({ items: [], total: 0 }), [medios, setMedios] = useState([]);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const validRange = from && to && from <= to;
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      if (!from || !to || from > to) { setData(null); setLoading(false); return; }
      try {
        const [d, h, m] = await Promise.all([revisarRendiciones({ from, to }), listarRendiciones({ persona_id: persona || undefined, limit: 20, offset }), apiRequest("/v2/payment-methods")]);
        if (active) { setData(d); setHistory(h); setMedios(m); }
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
  const visible = !loading && data?.from === from && data?.to === to;
  const shownPeople = visible ? data.personas.filter((p) => (!persona || p.id === persona) && (p.cantidad > 0 || p.saldo_confirmado_pendiente !== 0 || p.id === persona)) : [];
  return <div className="page-content traslados-resultados rendiciones-page">
    <header className="page-header"><div><h1>Bandimóviles · Rendiciones</h1><p>Cobros, remuneraciones, reintegros y saldos de choferes y socios.</p><p>Se revisan cobros explícitos y conceptos identificados. Los históricos sin cobrador conocido conservan su revisión aparte.</p></div></header>
    <nav className="traslados-resultados-links"><Link to="/traslados/resultados">Resultados de Bandimóviles</Link><Link to="/expenses/daily-incomes">Movimientos en Caja</Link></nav>
    <fieldset className="card form-grid" disabled={busy}><legend>Período de conceptos por revisar</legend>
      <label className="form-field">Desde<input required type="date" value={from} max={to || todayISO()} onChange={(e) => { setFrom(e.target.value); setMessage(""); }} /></label>
      <label className="form-field">Hasta<input required type="date" value={to} min={from} max={todayISO()} onChange={(e) => { setTo(e.target.value); setMessage(""); }} /></label>
      <label className="form-field">Filtrar persona<select value={persona} onChange={(e) => { setPersona(e.target.value); setOffset(0); setActiveId(""); setMessage(""); }}><option value="">Todas las personas</option>{data?.personas.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "active" ? " (inactiva)" : ""}</option>)}</select></label>
      <button className="btn-secondary" type="button" disabled={loading || !validRange} onClick={() => setRefresh((v) => v + 1)}>Volver a cargar</button>
    </fieldset>
    {!validRange && <p role="alert">Elegí un período válido.</p>}{error && <p role="alert" className="traslados-error">{error}</p>}{message && <p role="status">{message}</p>}
    {loading && <p role="status">Cargando rendiciones…</p>}
    {visible && <>
      <section className="card"><h2>Saldos por persona</h2><p>El saldo confirmado pendiente incluye todas sus rendiciones, aunque sean de otros períodos.</p>
        <div className="rendicion-personas">{shownPeople.map((p) => <article className="traslados-tramo" key={p.id}><h3>{p.name}</h3><p><span>Por confirmar · {sentidoSaldo(p.saldo_por_confirmar)}</span><strong>{fmt(p.saldo_por_confirmar === null ? null : Math.abs(p.saldo_por_confirmar))}</strong></p><p><span>Saldo confirmado pendiente · {sentidoSaldo(p.saldo_confirmado_pendiente)}</span><strong>{fmt(Math.abs(p.saldo_confirmado_pendiente))}</strong></p><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setPersona(p.id); setOffset(0); setActiveId(""); }}>Preparar rendición de {p.name}</button></article>)}</div>
        {!shownPeople.length && <p>No hay conceptos ni saldos pendientes para mostrar.</p>}
      </section>
      {data.pendientes.length > 0 && <section className="traslados-resultados-pendientes"><h2>Pendientes del período</h2><ul>{data.pendientes.map((p) => <li key={`${p.tipo}-${p.id}-${p.descripcion}`}>{p.descripcion}</li>)}</ul><p>Las condiciones de pago y los jornales se completan en <Link to="/traslados/resultados">Resultados</Link>. Los gastos y repartos entre personas se revisan abajo.</p></section>}
      <section className="card"><h2>Gastos y reintegros</h2><p>Elegí a la persona que pagó cada gasto y aprobá si corresponde reintegrarlo. El nombre escrito anteriormente se conserva como referencia.</p><p>La revisión de gastos y repartos abarca el período completo; la rendición se confirma por persona.</p>{data.gastos.map((g) => <GastoRevision key={`${g.id}-${g.revision}`} gasto={g} people={data.personas} busy={busy} mutate={mutate} />)}{!data.gastos.length && <p>No hay gastos externos activos en este período.</p>}</section>
      <section className="card"><h2>Remuneración por viaje</h2><p>El reparto entre personas es independiente del reparto entre vehículos. Un jornal ya tiene su chofer identificado y no se repite por cada viaje.</p>{data.viajes.map((t) => <RepartoPersonas key={`${t.cobro_id}-${t.revision}`} trip={t} people={data.personas} busy={busy} mutate={mutate} />)}{!data.viajes.length && <p>No hay remuneraciones porcentuales para repartir en este período.</p>}</section>
      {persona ? <Confirmacion key={`${persona}-${data.revision}`} data={data} persona={persona} busy={busy} mutate={mutate} onConfirmed={setActiveId} /> : <p>Elegí una persona para revisar sus conceptos y confirmar su rendición.</p>}
      <section className="card"><h2>Historial de rendiciones</h2><p>Rendiciones confirmadas de {persona ? data.personas.find((p) => p.id === persona)?.name : "todas las personas"}, de todos los períodos.</p>
        <div className="rendicion-historial">{history.items.map((r) => <article className="traslados-tramo" key={r.id}><div><strong>{r.persona_nombre}</strong><p>{r.desde} al {r.hasta}</p></div><div><span>{r.anulada ? "Anulada" : sentidoSaldo(r.saldo_pendiente)}</span><p><strong>{fmt(Math.abs(r.saldo_pendiente))}</strong></p></div><button className="btn-secondary" type="button" disabled={busy} onClick={() => setActiveId(r.id)}>Ver rendición {r.id.slice(0, 8)}</button></article>)}</div>
        {!history.items.length && <p>No hay rendiciones confirmadas para esta selección.</p>}
        <div className="traslados-actions"><button className="btn-secondary" type="button" disabled={busy || offset === 0} onClick={() => setOffset((v) => Math.max(0, v - 20))}>Rendiciones anteriores de la lista</button><button className="btn-secondary" type="button" disabled={busy || offset + 20 >= history.total} onClick={() => setOffset((v) => v + 20)}>Más rendiciones</button></div>
      </section>
    </>}
    {activeId && <RendicionDetalle key={activeId} id={activeId} refresh={refresh} medios={medios} busy={busy} mutate={mutate} onClose={() => setActiveId("")} />}
  </div>;
}
