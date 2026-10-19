import { Link } from "react-router-dom";
import { MOTIVOS_RESULTADO } from "../../../lib/trasladosResultados";

const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const num = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default function BandimovilesResumen({ kpis }) {
  const { trasladosResultado: resultado, trasladosHistoricos: historicos } = kpis;
  const completo = resultado?.resultado !== null && resultado?.resultado !== undefined;
  // Las referencias del simulador no bloquean el resultado con costos reales.
  const pendientes = (resultado?.pendientes || []).filter((p) => !p.startsWith("referencia"));
  const delta = kpis.deltas?.trasladosCount;
  const destino = `/traslados/resultados${kpis.trasladosMes ? `?mes=${kpis.trasladosMes}` : ""}`;

  return <section className="cd-kpi-box cd-kpi-box--traslados" aria-label="Resumen de Bandimóviles">
    <span className="cd-kpi-box__label">Resultado de Bandimóviles</span>
    <span className="cd-kpi-box__value">{completo ? fmt(resultado.resultado) : resultado ? "Sin completar" : "No disponible"}</span>
    <span className="cd-kpi-box__note">Agenda: {num(kpis.trasladosCount)} turnos finalizados con traslado.</span>
    {resultado ? <>
      <span className="cd-kpi-box__note">Formato actual: {num(resultado.realizados)} viajes completos · {fmt(resultado.ingresos)} en cobros registrados.</span>
      {historicos?.cantidad > 0 && <span className="cd-kpi-box__note">
        Formato anterior: {num(historicos.cantidad)} traslados · {fmt(historicos.importe_registrado)} registrados. Estos importes no acreditan cobros nuevos ni incluyen sus costos.
      </span>}
      {!completo && (pendientes.length ? <details className="cd-traslados-pendientes">
        <summary>Ver {pendientes.length} {pendientes.length === 1 ? "pendiente del cálculo" : "pendientes del cálculo"}</summary>
        <ul>{pendientes.map((p) => <li key={p}>{MOTIVOS_RESULTADO[p] || "Hay datos por revisar en el detalle del resultado."}</li>)}</ul>
      </details> : <span className="cd-kpi-box__note">Revisá el detalle para conocer los datos que faltan.</span>)}
    </> : <span className="cd-kpi-box__note">No se pudo consultar el resultado. Los turnos de agenda no confirman el cobro ni la finalización del recorrido.</span>}
    {delta !== null && delta !== undefined && <span className="cd-kpi-box__delta">
      {delta === 0 ? "Misma cantidad de turnos finalizados con traslado que el mes anterior."
        : `${delta > 0 ? "+" : ""}${delta} turnos finalizados con traslado vs mes anterior.`}
    </span>}
    <Link to={destino}>{completo ? "Ver detalle del resultado" : "Revisar resultado"}</Link>
  </section>;
}
