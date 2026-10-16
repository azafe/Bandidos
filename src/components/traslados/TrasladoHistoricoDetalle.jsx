import { importeHistorico, estadoTurnoHistorico } from "../../lib/trasladosHistoricos";

export default function TrasladoHistoricoDetalle({ historico }) {
  if (!historico) return <p>Histórico sin copia de origen disponible. Requiere revisión.</p>;
  return <div className="traslados-historico">
    <p><strong>Histórico · ida y vuelta</strong></p>
    <p>Fecha del turno: {historico.fecha} · Turno: {estadoTurnoHistorico(historico.turno_status)}</p>
    <p>Importe original: {importeHistorico(historico.monto)}</p>
    <p>{historico.bonificado === true ? "Bonificación registrada en el origen." : historico.bonificado === false ? "Sin bonificación, según el registro original." : "Bonificación sin registrar en el origen."}</p>
    {Number(historico.monto) === 0 && historico.bonificado !== true && <p>Cero sin clasificación: no se convirtió en una bonificación.</p>}
    <p>{historico.direccion || "Dirección sin registrar"}</p>
    <p>Chofer, móvil, horario y estado del traslado: sin registro. La fecha del turno no acredita la fecha exacta del cobro.</p>
    <p>Se conserva el tratamiento anterior en los informes. La importación no genera un cobro nuevo ni una parada pendiente.</p>
  </div>;
}
