import { useEffect, useState } from "react";
import { anularRendicion, obtenerRendicion, registrarMovimientoRendicion, revertirMovimientoRendicion } from "../../services/trasladosApi";
import { todayISO } from "../../utils/dates";
import { formatoRendicion, sentidoSaldo } from "../../lib/rendiciones";

function MovimientoForm({ data, medios, busy, mutate }) {
  const [id] = useState(() => crypto.randomUUID());
  const [fecha, setFecha] = useState(todayISO), [monto, setMonto] = useState("");
  const [medio, setMedio] = useState(""), [referencia, setReferencia] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const entrega = data.saldo_pendiente > 0;
  return <form className="traslados-tramo" onSubmit={(e) => { e.preventDefault(); mutate(() => registrarMovimientoRendicion(data.id, { id, tipo: entrega ? "entrega_local" : "pago_persona", fecha, monto: Number(monto), payment_method_id: medio, referencia }), "Movimiento registrado."); }}>
    <fieldset disabled={busy}><legend>{entrega ? "Registrar entrega al local" : "Registrar pago a la persona"}</legend>
      <p>Registrá el dinero que efectivamente se entregó o pagó. Podés registrar un importe parcial.</p>
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

export default function RendicionDetalle({ id, refresh, medios, busy, mutate, onClose }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() { setLoading(true); setError(""); try { const d = await obtenerRendicion(id); if (active) setData(d); } catch (e) { if (active) { setError(e.message); setData(null); } } finally { if (active) setLoading(false); } }
    load(); return () => { active = false; };
  }, [id, refresh]);
  return <section className="card rendicion-detalle" aria-label="Detalle de rendición confirmada">
    <div className="rendicion-titulo"><h2>Rendición confirmada</h2><button className="btn-secondary" disabled={busy} type="button" onClick={onClose}>Cerrar detalle</button></div>
    {loading ? <p role="status">Cargando rendición…</p> : error ? <p role="alert">{error}</p> : data && <>
      <h3>{data.persona_nombre} · {data.desde} al {data.hasta}</h3><p>Comprobante: {data.id.slice(0, 8)} · {data.anulada ? "Anulada" : "Confirmada"}</p>
      <div className="rendicion-saldos"><p><span>Cobrado a clientes</span><strong>{formatoRendicion(data.cobrado)}</strong></p><p><span>Remuneración</span><strong>{formatoRendicion(data.remuneracion)}</strong></p><p><span>Reintegros</span><strong>{formatoRendicion(data.reintegros)}</strong></p><p><span>{sentidoSaldo(data.saldo_pendiente)}</span><strong>{formatoRendicion(Math.abs(data.saldo_pendiente))}</strong></p></div>
      {data.anulada && <p>Motivo de anulación: {data.motivo_anulacion}</p>}
      <div className="traslados-tabla-scroll"><table><thead><tr><th>Fecha y concepto</th><th>Importe rendido</th></tr></thead><tbody>{data.items.map((i) => <tr key={i.id}><td>{i.fecha}<br />{i.concepto}{i.tipo === "gasto" && !i.detalle.reintegrable && <><br /><small>Pagado: {formatoRendicion(i.detalle.monto)} · sin reintegro</small></>}</td><td>{formatoRendicion(i.monto)}</td></tr>)}</tbody></table></div>
      <h3>Movimientos de dinero</h3>
      {!data.movimientos.length && <p>No se registraron entregas ni pagos. Confirmar la rendición conserva el saldo pendiente.</p>}
      {data.movimientos.map((m) => <div className="traslados-tramo" key={m.id}><strong>{m.reversion_de ? "Reversión de " : ""}{m.tipo === "entrega_local" ? "entrega al local" : "pago a la persona"} · {formatoRendicion(m.monto)}</strong><p>{m.fecha} · {m.medio_pago} {m.referencia && `· ${m.referencia}`}</p>{m.motivo && <p>Motivo: {m.motivo}</p>}{data.movimientos.some((r) => r.reversion_de === m.id) ? <p>Movimiento revertido; se conserva como antecedente.</p> : !m.reversion_de && !data.anulada && <ReversionForm movimiento={m} rendicion={data.id} medios={medios} busy={busy} mutate={mutate} />}</div>)}
      {!data.anulada && data.saldo_pendiente !== 0 && <MovimientoForm key={`${data.id}-${data.movimientos.length}`} data={data} medios={medios} busy={busy} mutate={mutate} />}
      {!data.anulada && <AnulacionForm data={data} busy={busy} mutate={mutate} />}
    </>}
  </section>;
}
