import { fechaRendicion, formatoRendicion as fmt, sentidoSaldo } from "../../lib/rendiciones";

export function RendicionSaldo({ saldo, label, note, anulada = false, neto = false }) {
  const pendiente = saldo === null || saldo === undefined;
  const estado = anulada ? "anulada" : pendiente ? "revision" : saldo > 0 ? "entrega" : saldo < 0 ? "pago" : "cero";
  const sentido = anulada ? "Rendición anulada" : neto && saldo === 0 ? "Saldo neto en cero" : saldo < 0 ? "Debe recibir del local" : sentidoSaldo(saldo);
  return <div className={`rendicion-balance rendicion-balance--${estado}`}>
    <span className="rendicion-caption">{label}</span>
    <strong className="rendicion-balance__amount">{anulada ? "Anulada" : pendiente ? "Por revisar" : fmt(Math.abs(saldo))}</strong>
    <span className="rendicion-balance__direction">{sentido}</span>
    {note && <p>{note}</p>}
  </div>;
}

export function RendicionImportes({ cobrado, remuneracion, reintegros }) {
  return <dl className="rendicion-importes">
    <div><dt>Cobrado a clientes</dt><dd>{fmt(cobrado)}</dd></div>
    <div><dt>Remuneración</dt><dd>{fmt(remuneracion)}</dd></div>
    <div><dt>Reintegros aprobados</dt><dd>{fmt(reintegros)}</dd></div>
  </dl>;
}

export function RendicionConceptos({ items }) {
  return <div className="traslados-tabla-scroll"><table>
    <caption className="rendicion-sr-only">Conceptos incluidos en la rendición</caption>
    <thead><tr><th scope="col">Fecha y concepto</th><th scope="col">Importe rendido</th></tr></thead>
    <tbody>{items.map((i) => <tr key={i.id || `${i.tipo}-${i.fuente_id}`}>
      <td><span className="rendicion-caption">{fechaRendicion(i.fecha)}</span><br />{i.concepto}{i.tipo === "gasto" && !i.detalle.reintegrable && <><br /><small>Pagado: {fmt(i.detalle.monto)} · sin reintegro</small></>}</td>
      <td>{fmt(i.monto)}</td>
    </tr>)}</tbody>
  </table></div>;
}
