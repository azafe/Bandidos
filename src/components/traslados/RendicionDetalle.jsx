import { useEffect, useRef, useState } from "react";
import { anularRendicion, obtenerRendicion, registrarMovimientoRendicion, revertirMovimientoRendicion } from "../../services/trasladosApi";
import { todayISO } from "../../utils/dates";
import { fechaRendicion, formatoRendicion } from "../../lib/rendiciones";
import { RendicionConceptos, RendicionImportes, RendicionSaldo } from "./RendicionResumen";
import RendicionPanel from "./RendicionPanel";

function MovimientoForm({ data, medios, busy, mutate }) {
  const [id] = useState(() => crypto.randomUUID());
  const [fecha, setFecha] = useState(todayISO), [monto, setMonto] = useState("");
  const [medio, setMedio] = useState(""), [referencia, setReferencia] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const entrega = data.saldo_pendiente > 0;
  return <form className="traslados-tramo rendicion-money-form" onSubmit={(e) => { e.preventDefault(); mutate(() => registrarMovimientoRendicion(data.id, { id, tipo: entrega ? "entrega_local" : "pago_persona", fecha, monto: Number(monto), payment_method_id: medio, referencia }), "Movimiento registrado."); }}>
    <fieldset disabled={busy}><legend className="rendicion-sr-only">{entrega ? "Registrar entrega al local" : "Registrar pago a la persona"}</legend>
      <p className="rendicion-caption">Podés registrar un importe parcial, hasta completar el saldo.</p>
      <div className="form-grid">
        <label className="form-field">Fecha del movimiento<input required type="date" value={fecha} max={todayISO()} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="form-field">Importe del movimiento ($)<input required type="number" min="0.01" step="0.01" max={Math.abs(data.saldo_pendiente).toFixed(2)} value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        <label className="form-field">Medio de pago<select required value={medio} onChange={(e) => setMedio(e.target.value)}><option value="">Elegí un medio</option>{medios.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className="form-field">Referencia o comprobante<input maxLength="200" value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
      </div>
      <label className="traslados-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo que el dinero se entregó o pagó</label>
      <button type="submit" className="btn-primary" disabled={!confirmed}>{entrega ? "Registrar entrega" : "Registrar pago"}</button>
    </fieldset>
  </form>;
}

function ReversionForm({ movimiento, rendicion, medios, busy, mutate }) {
  const [id] = useState(() => crypto.randomUUID()), [fecha, setFecha] = useState(todayISO);
  const [motivo, setMotivo] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [medio, setMedio] = useState(movimiento.payment_method_id);
  return <details className="rendicion-reversion"><summary>Revertir movimiento de {formatoRendicion(movimiento.monto)}</summary>
    <form onSubmit={(e) => { e.preventDefault(); mutate(() => revertirMovimientoRendicion(rendicion, { id, movimiento_id: movimiento.id, fecha, payment_method_id: medio, motivo, confirmar: true }), "Reversión registrada. Se conserva el movimiento original."); }}><fieldset disabled={busy}>
      <p>La reversión registra el importe contrario y recupera el saldo correspondiente. Indicá cuándo y por qué se corrigió o devolvió el dinero.</p>
      <div className="form-grid"><label className="form-field">Fecha de reversión<input type="date" required value={fecha} min={movimiento.fecha} max={todayISO()} onChange={(e) => setFecha(e.target.value)} /></label><label className="form-field">Motivo de reversión<textarea required maxLength="1000" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label></div>
      <label className="form-field">Medio de la reversión<select required value={medio} onChange={(e) => setMedio(e.target.value)}>{medios.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="traslados-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo esta reversión</label><button type="submit" className="btn-secondary" disabled={!confirmed}>Registrar reversión</button>
    </fieldset></form>
  </details>;
}

function AnulacionForm({ data, busy, mutate }) {
  const [motivo, setMotivo] = useState(""), [confirmed, setConfirmed] = useState(false);
  const hasMovements = data.movimientos.some((m) => !m.reversion_de && !data.movimientos.some((r) => r.reversion_de === m.id));
  return <details><summary>Anular rendición</summary><form onSubmit={(e) => { e.preventDefault(); mutate(() => anularRendicion(data.id, { motivo, confirmar: true }), "Rendición anulada. Sus conceptos pueden revisarse nuevamente."); }}><fieldset disabled={busy || hasMovements}>
    {hasMovements && <p>Primero revertí los movimientos de dinero de esta rendición.</p>}
    <p>Se conserva el historial y se liberan los conceptos para preparar una nueva rendición.</p><label className="form-field">Motivo de anulación<textarea required maxLength="1000" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
    <label className="traslados-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmo la anulación de esta rendición</label><button className="btn-secondary" disabled={!confirmed} type="submit">Confirmar anulación</button>
  </fieldset></form></details>;
}

export default function RendicionDetalle({ id, refresh, medios, busy, mutate, onClose, registrar = false }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState({ "rendicion-movimiento": registrar });
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [id]);
  useEffect(() => {
    if (registrar) setPanels((p) => ({ ...p, "rendicion-movimiento": true }));
  }, [registrar]);
  const togglePanel = (panel, open) => setPanels((p) => p[panel] === open ? p : { ...p, [panel]: open });
  function prepareMovement() {
    setPanels((p) => ({ ...p, "rendicion-movimiento": true }));
    requestAnimationFrame(() => {
      const panel = document.getElementById("rendicion-movimiento");
      panel?.scrollIntoView({ block: "start" });
      panel?.querySelector("summary")?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    let active = true;
    async function load() { setLoading(true); setError(""); try { const d = await obtenerRendicion(id); if (active) setData(d); } catch (e) { if (active) { setError(e.message); setData(null); } } finally { if (active) setLoading(false); } }
    load(); return () => { active = false; };
  }, [id, refresh]);
  return <section id="rendicion-detalle" className="card rendicion-detalle" aria-label="Detalle de rendición confirmada">
    <div className="rendicion-titulo"><h2 ref={headingRef} tabIndex={-1}>Detalle de rendición</h2><button className="btn-secondary" disabled={busy} type="button" onClick={onClose}>Cerrar detalle</button></div>
    {loading ? <p role="status">Cargando rendición…</p> : error ? <p role="alert">{error}</p> : data && <>
      <div className="rendicion-detail-person"><h3>{data.persona_nombre}</h3><span className="rendicion-status">{data.anulada ? "Anulada" : "Confirmada"}</span><p className="rendicion-caption">{fechaRendicion(data.desde)} al {fechaRendicion(data.hasta)} · Rendición #{data.id.slice(0, 8)}</p></div>
      <RendicionSaldo saldo={data.saldo_pendiente} label="Saldo pendiente de esta rendición" anulada={data.anulada} note={data.anulada ? "Se conserva el detalle como antecedente." : "Incluye las entregas, pagos y reversiones registrados."} />
      {!data.anulada && data.saldo_pendiente !== 0 && !panels["rendicion-movimiento"] && <button className="btn-primary rendicion-money-action" type="button" disabled={busy} onClick={prepareMovement}>{data.saldo_pendiente > 0 ? "Registrar entrega al local" : "Registrar pago a la persona"}</button>}
      {data.anulada && <p className="rendicion-notice">Motivo de anulación: {data.motivo_anulacion}</p>}
      {!data.anulada && data.saldo_pendiente !== 0 && <RendicionPanel id="rendicion-movimiento" title={data.saldo_pendiente > 0 ? "Entrega al local" : "Pago a la persona"} description="Registrá únicamente el dinero que efectivamente se movió." open={!!panels["rendicion-movimiento"]} onToggle={togglePanel}>
        <MovimientoForm key={`${data.id}-${data.movimientos.length}`} data={data} medios={medios} busy={busy} mutate={mutate} />
      </RendicionPanel>}
      <RendicionPanel id="rendicion-desglose" title="Cómo se formó el saldo" description="Cobros, remuneración y reintegros al confirmar." open={!!panels["rendicion-desglose"]} onToggle={togglePanel}>
        <RendicionImportes cobrado={data.cobrado} remuneracion={data.remuneracion} reintegros={data.reintegros} />
        <dl className="rendicion-importes"><div><dt>Saldo inicial confirmado</dt><dd>{formatoRendicion(data.saldo_inicial)}</dd></div></dl>
        <p className="rendicion-caption">Al saldo inicial se le descuentan las entregas al local y se le suman los pagos a la persona. Cada reversión tiene el efecto contrario al movimiento original.</p>
        <details className="rendicion-conceptos"><summary>Ver {data.items.length} conceptos confirmados</summary><RendicionConceptos items={data.items} /></details>
      </RendicionPanel>
      <RendicionPanel id="rendicion-movimientos" title="Movimientos y comprobantes" description="Entregas, pagos y correcciones de esta rendición." badge={data.movimientos.length} open={!!panels["rendicion-movimientos"]} onToggle={togglePanel}>
        {!data.movimientos.length && <p className="rendicion-empty">No se registraron entregas ni pagos. Confirmar la rendición conserva el saldo pendiente.</p>}
        {data.movimientos.map((m) => <div className="traslados-tramo rendicion-movimiento" key={m.id}><strong>{m.reversion_de ? "Reversión de " : ""}{m.tipo === "entrega_local" ? "entrega al local" : "pago a la persona"} · {formatoRendicion(m.monto)}</strong><p>{fechaRendicion(m.fecha)} · {m.medio_pago} {m.referencia && `· ${m.referencia}`}</p>{m.motivo && <p>Motivo: {m.motivo}</p>}{data.movimientos.some((r) => r.reversion_de === m.id) ? <p className="rendicion-caption">Movimiento revertido; se conserva como antecedente.</p> : !m.reversion_de && !data.anulada && <ReversionForm movimiento={m} rendicion={data.id} medios={medios} busy={busy} mutate={mutate} />}</div>)}
      </RendicionPanel>
      {!data.anulada && <AnulacionForm data={data} busy={busy} mutate={mutate} />}
    </>}
  </section>;
}
