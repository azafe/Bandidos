import { useMemo, useState } from "react";
import Panel, { Opciones } from "./Panel";
import { deleteAgendaTurno, updateAgendaTurno } from "../../../services/agendaApi";
import { getTrasladoError } from "../../../lib/traslados";
import { paymentError } from "../../../lib/servicePayments";
import { ESTADOS, formatoPlata, hora, montoDe, peluquerasDeTurno, resumenCobro } from "../../../lib/planilla";

// Tocar un turno: cuántas peluqueras, quiénes, estado y, si terminó, el cobro.
export default function CierreModal({ turno, peluqueras, colores, presentes, servicios, medios, onClose, onSaved, onEditar }) {
  const iniciales = peluquerasDeTurno(turno);
  const servicioTurno = servicios.find((s) => String(s.id) === String(turno.service_type_id));
  const [cantidad, setCantidad] = useState(Math.max(1, iniciales.length || 1));
  const [elegidas, setElegidas] = useState(iniciales);
  const [estado, setEstado] = useState(turno.status || "reserved");
  const [servicio, setServicio] = useState(turno.service_type_id ? String(turno.service_type_id) : "");
  const [precio, setPrecio] = useState(() => String(Math.round(montoDe(turno.price || servicioTurno?.default_price || 0)) || ""));
  const [pagos, setPagos] = useState(() => (turno.payments || []).map((p) => ({ payment_method_id: String(p.payment_method_id), amount: String(Math.round(montoDe(p.amount))) })));
  const [trasMonto, setTrasMonto] = useState(turno.traslado_amount ? String(Math.round(montoDe(turno.traslado_amount))) : "");
  const [trasSinCargo, setTrasSinCargo] = useState(!!turno.traslado_bonificado);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const sena = montoDe(turno.deposit_amount);
  const resumen = resumenCobro({ precio, sena, pagos });
  const medioPorDefecto = String(medios.find((m) => /efectivo/i.test(m.name))?.id || medios[0]?.id || "");
  const nombreMedio = (id) => medios.find((m) => String(m.id) === String(id))?.name || "";
  const terminado = estado === "finished";
  const opcionesServicio = useMemo(() => servicios.map((s) => ({ value: String(s.id), label: s.name })), [servicios]);

  function elegirCantidad(n) {
    setCantidad(n);
    setElegidas((prev) => (prev.length > n ? prev.slice(prev.length - n) : prev));
    setError("");
  }
  function alternar(id) {
    setElegidas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = [...prev, id];
      return next.length > cantidad ? next.slice(1) : next;
    });
    setError("");
  }
  function elegirEstado(v) {
    setEstado(v);
    setError("");
    if (v === "finished" && !pagos.length) {
      const saldo = resumenCobro({ precio, sena, pagos: [] }).saldo;
      setPagos([{ payment_method_id: medioPorDefecto, amount: saldo ? String(saldo) : "" }]);
    }
  }
  function cambiarPrecio(valor) {
    const n = montoDe(valor);
    setPrecio(n ? String(n) : "");
    if (pagos.length === 1) setPagos([{ ...pagos[0], amount: String(Math.max(0, n - sena)) }]);
  }
  function cambiarServicio(id) {
    setServicio(id);
    const s = servicios.find((x) => String(x.id) === String(id));
    if (!montoDe(precio) && s?.default_price) cambiarPrecio(String(s.default_price));
  }
  const setPago = (i, patch) => setPagos((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  function agregarPago() {
    const usado = new Set(pagos.map((p) => p.payment_method_id));
    const libre = medios.find((m) => !usado.has(String(m.id)));
    setPagos((prev) => [...prev, { payment_method_id: String(libre?.id || ""), amount: resumen.diferencia > 0 ? String(resumen.diferencia) : "" }]);
  }

  async function guardar(e) {
    e.preventDefault();
    const activo = estado !== "cancelled" && estado !== "no_show";
    if (activo && elegidas.length && elegidas.length !== cantidad) { setError(`Elegí ${cantidad} peluqueras (marcaste ${elegidas.length}).`); return; }
    const [g1, g2, g3] = elegidas.map((id) => Number(id) || id);
    let payload;
    if (terminado) {
      if (elegidas.length !== cantidad) { setError(cantidad > 1 ? "Para terminar el turno, elegí quiénes lo atendieron." : "Para terminar el turno, elegí quién lo atendió."); return; }
      if (!servicio) { setError("Elegí el servicio."); return; }
      if (!resumen.precio) { setError("Falta el precio del servicio."); return; }
      if (resumen.precio < sena) { setError("El precio no puede ser menor que la seña."); return; }
      const payments = resumen.saldo > 0 ? pagos.map((p) => ({ payment_method_id: Number(p.payment_method_id) || p.payment_method_id, amount: montoDe(p.amount) })) : [];
      const errPago = paymentError(payments, resumen.saldo);
      if (errPago) { setError(errPago); return; }
      if (resumen.saldo > 0 && !payments.length) { setError("Elegí cómo pagó."); return; }
      const traslado = {
        traslado: !!turno.traslado,
        traslado_amount: turno.traslado && !trasSinCargo ? montoDe(trasMonto) : 0,
        traslado_bonificado: !!turno.traslado && trasSinCargo,
      };
      const errTras = getTrasladoError(traslado);
      if (errTras) { setError(errTras); return; }
      payload = {
        status: "finished",
        groomer_id: g1,
        second_groomer_id: g2 ?? null,
        third_groomer_id: g3 ?? null,
        service_type_id: Number(servicio) || servicio,
        price: resumen.precio,
        payments,
        payment_method_id: payments.length === 1 ? payments[0].payment_method_id : null,
        traslado_amount: traslado.traslado_amount,
        traslado_bonificado: traslado.traslado_bonificado,
      };
    } else if (activo) {
      payload = { status: estado, ...(elegidas.length ? { groomer_id: g1, second_groomer_id: g2 ?? null, third_groomer_id: g3 ?? null } : {}) };
    } else {
      payload = { status: estado };
    }
    setGuardando(true);
    try {
      await updateAgendaTurno(turno.id, payload);
      const libero = !activo && turno.status !== "cancelled" && turno.status !== "no_show";
      onSaved(terminado ? `${turno.pet_name || "Turno"} terminado y cobrado.` : libero ? null : "Turno guardado.", libero ? turno : null);
    } catch (err) {
      setError(err?.message || "No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!confirmarBorrar) { setConfirmarBorrar(true); return; }
    setGuardando(true);
    try {
      await deleteAgendaTurno(turno.id);
      onSaved(`Se borró el turno de ${turno.pet_name || "la mascota"}.`, null);
    } catch (err) {
      setError(err?.message || "No se pudo borrar el turno.");
      setGuardando(false);
    }
  }

  const titulo = <>{hora(turno.time)} · {turno.pet_name} {turno.owner_name && <span>({turno.owner_name})</span>}</>;
  const subtitulo = [turno.breed, servicioTurno?.name].filter(Boolean).join(" · ");
  return (
    <Panel titulo={titulo} subtitulo={subtitulo} onClose={onClose} id="pl-cierre">
      <form onSubmit={guardar} noValidate style={{ display: "grid", gap: 16 }}>
        {turno.pet?.behavior && <p className="pl-tag note" style={{ margin: 0 }}>⚠ {turno.pet.behavior}</p>}
        <div className="pl-group"><span className="pl-label">1 · ¿Cuántas peluqueras participaron?</span>
          <Opciones opciones={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} valor={cantidad} onChange={elegirCantidad} etiqueta="Cantidad de peluqueras" className="count" />
          {cantidad > 1 && <p className="pl-help">La comisión se reparte en partes iguales entre las {cantidad}.</p>}
        </div>
        <div className="pl-group"><span className="pl-label">2 · ¿Quién{cantidad > 1 ? "es" : ""}? ({elegidas.length} de {cantidad})</span>
          <div className="pl-opts" role="group" aria-label="Peluqueras">
            {peluqueras.map((p) => (
              <button key={p.id} type="button" className="pl-opt" aria-pressed={elegidas.includes(String(p.id))} onClick={() => alternar(String(p.id))}>
                <span className="pl-dot" style={{ background: colores[String(p.id)] }} />{p.name}{presentes[String(p.id)] === false && <small> (no vino)</small>}
              </button>
            ))}
          </div>
        </div>
        <div className="pl-group"><span className="pl-label">3 · Estado</span>
          <Opciones opciones={ESTADOS} valor={estado} onChange={elegirEstado} etiqueta="Estado" />
        </div>
        {terminado && (
          <section className="pl-cobro" aria-label="Cobro">
            <div className="pl-group"><span className="pl-label">4 · ¿Cuánto pagó?</span>
              {!turno.service_type_id && <Opciones opciones={opcionesServicio} valor={servicio} onChange={cambiarServicio} etiqueta="Servicio" className="small" />}
              <div className="pl-grid">
                <label>Precio del servicio<input value={precio ? formatoPlata(precio) : ""} onChange={(e) => cambiarPrecio(e.target.value)} inputMode="numeric" placeholder="$" autoComplete="off" data-autofocus={!precio || undefined} /></label>
                {turno.traslado && <label>Traslado<input value={trasSinCargo ? "Sin cargo" : trasMonto ? formatoPlata(trasMonto) : ""} disabled={trasSinCargo} onChange={(e) => setTrasMonto(String(montoDe(e.target.value) || ""))} inputMode="numeric" placeholder="$" autoComplete="off" /></label>}
              </div>
              {turno.traslado && <label className="pl-check"><input type="checkbox" checked={trasSinCargo} onChange={(e) => setTrasSinCargo(e.target.checked)} /> Traslado sin cargo</label>}
            </div>
            {resumen.saldo > 0 && (
              <div className="pl-group"><span className="pl-label">Medio de pago</span>
                {pagos.map((p, i) => (
                  <div className="pl-pago" key={i}>
                    <select aria-label={`Medio de pago ${i + 1}`} value={p.payment_method_id} onChange={(e) => setPago(i, { payment_method_id: e.target.value })}>
                      <option value="">Elegí…</option>
                      {medios.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                    </select>
                    <input aria-label={`Monto ${i + 1}`} value={p.amount ? formatoPlata(p.amount) : ""} onChange={(e) => setPago(i, { amount: String(montoDe(e.target.value) || "") })} inputMode="numeric" placeholder="$" autoComplete="off" />
                    {pagos.length > 1 ? <button type="button" className="pl-quitar" onClick={() => setPagos((prev) => prev.filter((_, j) => j !== i))}>Quitar</button> : <span />}
                  </div>
                ))}
                {pagos.length < medios.length && <div className="pl-opts"><button type="button" className="pl-opt small" onClick={agregarPago}>+ Pagó con otro medio también</button></div>}
              </div>
            )}
            <div className="pl-resumen" aria-live="polite">
              <div><span>Servicio</span><span>{formatoPlata(resumen.precio)}</span></div>
              {sena > 0 && <div><span>Seña ya pagada{turno.deposit_payment_method_id ? ` · ${nombreMedio(turno.deposit_payment_method_id)}` : ""}</span><span>− {formatoPlata(sena)}</span></div>}
              <div className="total"><span>A cobrar hoy</span><span>{formatoPlata(resumen.saldo)}</span></div>
              {resumen.diferencia === 0 ? <div className="ok"><span>Cobro completo</span><span>✓</span></div>
                : resumen.diferencia > 0 ? <div className="falta"><span>Falta registrar</span><span>{formatoPlata(resumen.diferencia)}</span></div>
                  : <div className="falta"><span>Sobra (revisá los montos)</span><span>{formatoPlata(-resumen.diferencia)}</span></div>}
              {turno.traslado && <div><span>Traslado (aparte)</span><span>{trasSinCargo ? "Sin cargo" : formatoPlata(trasMonto)}</span></div>}
            </div>
          </section>
        )}
        <p className="pl-error" role="alert">{error}</p>
        <div className="pl-actions">
          <button type="button" className="pl-opt small" onClick={onEditar}>Editar hora, servicio, traslado o seña</button>
          <button type="button" className="pl-opt small danger" onClick={borrar} disabled={guardando}>{confirmarBorrar ? "Tocá de nuevo para borrar" : "Borrar turno"}</button>
          <span className="pl-spacer" />
          <button type="submit" className="pl-btn big" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Panel>
  );
}
