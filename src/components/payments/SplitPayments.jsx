import { paymentError } from "../../lib/servicePayments.js";

export default function SplitPayments({ payments = [], onChange, methods, balance, methodId = "" }) {
  const active = payments.length > 0;
  const total = payments.reduce((sum, p) => sum + Math.round(Number(p.amount || 0) * 100), 0) / 100;
  const money = value => Number(value).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  const patch = (index, value) => onChange(payments.map((p, i) => i === index ? { ...p, ...value } : p));
  return <div className="form-field" style={{ gridColumn: "1 / -1" }}>
    <label><input type="checkbox" checked={active} onChange={e => onChange(e.target.checked ? [
      { payment_method_id: methodId, amount: "" }, { payment_method_id: "", amount: "" },
    ] : [])} /> Combinar medios de pago</label>
    {active && <>
      <p>Saldo a cobrar: <strong>{money(balance)}</strong>. La seña se registra por separado.</p>
      {payments.map((payment, index) => <div key={index} className="agenda-finish__price-payment-row">
        <label className="form-field"><span>Medio de pago {index + 1}</span>
          <select value={payment.payment_method_id} onChange={e => patch(index, { payment_method_id: e.target.value })}>
            <option value="">Seleccioná</option>
            {methods.filter(m => m.id === payment.payment_method_id || !payments.some(p => p.payment_method_id === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="form-field"><span>Importe {index + 1}</span>
          <input type="number" min="0.01" step="0.01" value={payment.amount} onChange={e => patch(index, { amount: e.target.value })} />
        </label>
        <button type="button" onClick={() => onChange(payments.filter((_, i) => i !== index))}>Quitar pago {index + 1}</button>
      </div>)}
      {payments.length < Math.min(methods.length, 20) && <button type="button" onClick={() => onChange([...payments, { payment_method_id: "", amount: "" }])}>Agregar medio</button>}
      <p aria-live="polite">Registrado: {money(total)} · Falta: {money(Math.round((balance - total) * 100) / 100)}</p>
      {paymentError(payments, balance) && <small role="status">{paymentError(payments, balance)}</small>}
    </>}
  </div>;
}
