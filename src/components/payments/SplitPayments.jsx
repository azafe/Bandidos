import { paymentError } from "../../lib/servicePayments.js";
import "../../styles/split-payments.css";

const money = value => Number(value || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

export default function SplitPayments({ payments = [], onChange, methods, balance, methodId = "", showErrors = false }) {
  const active = payments.length > 0;
  const total = payments.reduce((sum, p) => sum + Math.round(Number(p.amount || 0) * 100), 0) / 100;
  const remaining = Math.round((balance - total) * 100) / 100;
  const complete = active && payments.every(p => p.payment_method_id && p.amount !== "");
  const error = paymentError(payments, balance);
  const matched = complete && !error && balance > 0;
  const patch = (index, value) => onChange(payments.map((p, i) => i === index ? { ...p, ...value } : p));
  const fillRemaining = index => {
    const otherCents = payments.reduce((sum, p, i) => sum + (i === index ? 0 : Math.round(Number(p.amount || 0) * 100)), 0);
    patch(index, { amount: Math.max(0, Math.round(balance * 100) - otherCents) / 100 });
  };
  return <div className="split-payments">
    <label className="split-payments__toggle">
      <input type="checkbox" checked={active} onChange={e => onChange(e.target.checked ? [
        { payment_method_id: methodId, amount: "" }, { payment_method_id: "", amount: "" },
      ] : [])} />
      <span>Combinar medios de pago<small>Por ejemplo, una parte en efectivo y otra con tarjeta.</small></span>
    </label>
    {active && <div className="split-payments__body">
      <div className="split-payments__heading"><span>Distribuí el saldo</span><strong>{money(balance)}</strong></div>
      {balance <= 0 && <p className="split-payments__hint">Ingresá el precio del servicio para distribuir el cobro.</p>}
      <div className="split-payments__rows">
        {payments.map((payment, index) => <div key={index} className="split-payments__row">
          <label className="form-field"><span>Medio de pago {index + 1}</span>
            <select required value={payment.payment_method_id} onChange={e => patch(index, { payment_method_id: e.target.value })}>
              <option value="">Seleccioná un medio</option>
              {methods.filter(m => m.id === payment.payment_method_id || !payments.some(p => p.payment_method_id === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Importe {index + 1}</span>
            <span className="split-payments__amount"><span aria-hidden="true">$</span>
              <input required aria-label={`Importe ${index + 1}`} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0" value={payment.amount} onChange={e => patch(index, { amount: e.target.value })} />
            </span>
          </label>
          <button type="button" className="split-payments__remove" aria-label={`Quitar pago ${index + 1}`} title={`Quitar pago ${index + 1}`} onClick={() => onChange(payments.filter((_, i) => i !== index))}>×</button>
          {balance > 0 && remaining !== 0 && <button type="button" className="split-payments__fill" onClick={() => fillRemaining(index)}>Asignar saldo restante a este pago</button>}
        </div>)}
      </div>
      {payments.length < Math.min(methods.length, 20) && <button type="button" className="split-payments__add" onClick={() => onChange([...payments, { payment_method_id: "", amount: "" }])}><span aria-hidden="true">＋</span> Agregar otro medio</button>}
      <div className={`split-payments__balance${matched ? " is-matched" : remaining < 0 ? " is-over" : ""}`} role="status">
        <span>{matched ? "✓ Saldo completo" : remaining < 0 ? "El cobro supera el saldo" : "Falta distribuir"}</span>
        <strong>{money(matched ? total : Math.abs(remaining))}</strong>
      </div>
      {error && (showErrors || complete) && <p className="split-payments__error" role="alert">{error}</p>}
    </div>}
  </div>;
}
