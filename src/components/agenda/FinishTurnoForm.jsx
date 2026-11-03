import { useState } from "react";
import SplitPayments from "../payments/SplitPayments.jsx";
import TrasladoFields from "./TrasladoFields.jsx";
import { groomerShares, groomerPayout } from "../../lib/sharedGroomer.js";
import { paymentError } from "../../lib/servicePayments.js";
import "../../styles/finish-turno.css";

const money = value => Number(value || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export default function FinishTurnoForm({ turno, form, onPatch, employees, serviceTypes, paymentMethods, getGroomerOptions, onCancel, onSubmit }) {
  const [showThird, setShowThird] = useState(Boolean(form.third_groomer_id));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const price = Number(form.price || 0);
  const deposit = Number(turno.deposit_amount || 0);
  const balance = Math.max(0, Math.round((price - deposit) * 100) / 100);
  const invalidPayments = paymentError(form.payments, balance);
  const participants = groomerShares({ ...form, second_groomer_id: form.shared ? form.second_groomer_id : null, third_groomer_id: form.shared ? form.third_groomer_id : null });
  const options = (key, excluded = []) => getGroomerOptions(employees, form[key]).filter(e => !excluded.includes(String(e.id)));
  async function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (saving || invalidPayments || price < deposit) return;
    setSaving(true);
    try { await onSubmit(); } finally { setSaving(false); }
  }
  return <form className="finish-turno" onSubmit={submit}>
    <div className="finish-turno__intro"><p>Confirmá el servicio, el equipo y cómo se cobró.</p><span>Los cambios se guardan al confirmar.</span></div>
    <fieldset className="finish-turno__section" disabled={saving}>
      <legend><span>1</span> Servicio</legend>
      <div className="finish-turno__service-grid">
        <label className="form-field"><span>Servicio realizado</span><select required value={form.service_type_id} onChange={e => onPatch({ service_type_id: e.target.value })}>
          <option value="">Seleccioná un servicio</option>{serviceTypes.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select></label>
        <label className="form-field"><span>Precio final</span><span className="finish-turno__currency"><span aria-hidden="true">$</span>
          <input required aria-label="Precio final" type="number" inputMode="decimal" min={Math.max(.01, deposit)} step="0.01" placeholder="0" value={form.price} onChange={e => onPatch({ price: e.target.value })} />
        </span></label>
      </div>
    </fieldset>
    <fieldset className="finish-turno__section" disabled={saving}>
      <legend><span>2</span> Equipo y comisión</legend>
      <label className="finish-turno__toggle"><input type="checkbox" checked={form.shared} onChange={e => { onPatch({ shared: e.target.checked, second_groomer_id: "", third_groomer_id: "" }); setShowThird(false); }} /><span>Compartir el servicio entre varios peluqueros</span></label>
      <div className={`finish-turno__team-grid${form.shared ? " is-shared" : ""}`}>
        <label className="form-field"><span>{form.shared ? "Peluquero principal" : "Peluquero"}</span><select required value={form.groomer_id} onChange={e => onPatch({ groomer_id: e.target.value, ...(form.second_groomer_id === e.target.value ? { second_groomer_id: "", third_groomer_id: "" } : form.third_groomer_id === e.target.value ? { third_groomer_id: "" } : {}) })}>
          <option value="">Seleccioná</option>{options("groomer_id").map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select></label>
        {form.shared && <label className="form-field"><span>Segundo peluquero</span><select required value={form.second_groomer_id} onChange={e => onPatch({ second_groomer_id: e.target.value })}>
          <option value="">Seleccioná</option>{options("second_groomer_id", [String(form.groomer_id), String(form.third_groomer_id)]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select></label>}
        {form.shared && showThird && <label className="form-field"><span>Tercer peluquero <small>Opcional</small></span><select value={form.third_groomer_id} onChange={e => onPatch({ third_groomer_id: e.target.value })}>
          <option value="">Sin tercer peluquero</option>{options("third_groomer_id", [String(form.groomer_id), String(form.second_groomer_id)]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select></label>}
      </div>
      {form.shared && !showThird && <button className="finish-turno__text-button" type="button" onClick={() => setShowThird(true)}>＋ Agregar tercer peluquero</button>}
      {form.shared && <p className="finish-turno__hint">La comisión del principal se reparte en partes iguales. El precio del servicio se cobra una sola vez.</p>}
      {form.groomer_id && (!form.shared || form.second_groomer_id) && price > 0 && <div className="finish-turno__commissions" aria-live="polite">
        <span>Comisión a liquidar</span><div>{participants.map(({ groomerId }) => <div key={groomerId}><span>{employees.find(e => String(e.id) === String(groomerId))?.name || "Peluquero"}</span><strong>{money(groomerPayout({ ...form, second_groomer_id: form.shared ? form.second_groomer_id : null, third_groomer_id: form.shared ? form.third_groomer_id : null,
          commission_rate_snapshot: form.groomer_id === turno.groomer_id ? turno.commission_rate_snapshot : null,
        }, price, employees, groomerId))}</strong></div>)}</div>
      </div>}
    </fieldset>
    <fieldset className="finish-turno__section" disabled={saving}>
      <legend><span>3</span> Cobro</legend>
      <div className="finish-turno__receipt"><div><span>Precio final</span><strong>{money(price)}</strong></div><div><span>Seña registrada</span><strong>− {money(deposit)}</strong></div><div className="finish-turno__due"><span>Saldo a cobrar</span><strong>{money(balance)}</strong></div></div>
      {!form.payments?.length && <label className="form-field"><span>Medio de pago del saldo</span><select value={form.payment_method_id} onChange={e => onPatch({ payment_method_id: e.target.value })}>
        <option value="">Sin especificar</option>{paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
      </select></label>}
      <SplitPayments payments={form.payments} methods={paymentMethods} balance={balance} methodId={form.payment_method_id} showErrors={submitted} onChange={payments => onPatch({ payments })} />
      {deposit > 0 && <p className="finish-turno__hint">La seña ya está descontada. Distribuí únicamente el saldo a cobrar.</p>}
      {submitted && price < deposit && <p role="alert" className="split-payments__error">El precio final no puede ser menor que la seña.</p>}
      {turno.traslado && <TrasladoFields id="finish-traslado" value={form} required onChange={onPatch} />}
    </fieldset>
    <div className="finish-turno__actions"><span>{saving ? "Guardando el cierre…" : "Revisá los importes antes de confirmar."}</span><div><button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Volver al detalle</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : turno.status === "finished" ? "Guardar cambios" : "Confirmar y finalizar"}</button></div></div>
  </form>;
}
