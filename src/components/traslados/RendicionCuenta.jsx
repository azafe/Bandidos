import { formatoRendicion as fmt } from "../../lib/rendiciones";
import { RendicionSaldo } from "./RendicionResumen";

export default function RendicionCuenta({ persona: p, busy, onHistory, onPrepare }) {
  const entrega = p.saldo_confirmado_pendiente > 0;
  const pago = p.saldo_confirmado_pendiente < 0;
  return <article className="rendicion-persona" aria-label={`Cuenta de ${p.name}`}>
    <div className="rendicion-persona__name"><span className="rendicion-avatar" aria-hidden="true">{p.name?.trim().charAt(0) || "?"}</span><div><h3>{p.name}</h3><span className="rendicion-caption">{p.role || "Integrante del equipo"}</span></div>{p.status !== "active" && <span className="rendicion-status">Inactiva</span>}</div>
    <RendicionSaldo saldo={p.saldo_confirmado_pendiente} label="Saldo neto confirmado" neto />
    <div className="rendicion-persona__review"><span>Conceptos nuevos · por confirmar</span><strong>{p.saldo_por_confirmar == null ? "Por revisar" : fmt(Math.abs(p.saldo_por_confirmar))}</strong><small>{p.saldo_por_confirmar == null ? "Completá los datos del período para calcular el saldo." : p.saldo_por_confirmar > 0 ? "A entregar al local cuando se confirme." : p.saldo_por_confirmar < 0 ? "A recibir del local cuando se confirme." : `${p.cantidad} conceptos nuevos · saldo en cero`}</small></div>
    <div className="rendicion-persona__actions">
      <button type="button" className={entrega || pago ? "btn-primary" : "btn-secondary"} disabled={busy} onClick={onHistory}>{entrega ? "Ver dinero a entregar" : pago ? "Ver dinero a recibir" : "Ver rendiciones"}<span className="rendicion-sr-only"> de {p.name}</span><span aria-hidden="true"> →</span></button>
      {p.cantidad > 0 ? <button type="button" className="btn-secondary" disabled={busy} onClick={onPrepare}>Preparar rendición<span className="rendicion-sr-only"> de {p.name}</span></button> : <p className="rendicion-caption rendicion-persona__sin-nuevos">Sin conceptos nuevos en este período.</p>}
    </div>
  </article>;
}
