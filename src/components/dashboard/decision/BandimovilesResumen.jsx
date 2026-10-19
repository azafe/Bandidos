import { Link } from "react-router-dom";
import { MOTIVOS_RESULTADO } from "../../../lib/trasladosResultados";

const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const num = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default function BandimovilesResumen({ kpis }) {
  const { trasladosResultado: resultado, trasladosHistoricos: historicos } = kpis;
  const completo = resultado?.resultado !== null && resultado?.resultado !== undefined;
  const anteriores = historicos?.cantidad > 0;
  const cobrosActuales = resultado && (resultado.ingresos !== 0 || !anteriores);
  // Las referencias del simulador no bloquean el resultado con costos reales.
  const pendientes = (resultado?.pendientes || []).filter((p) => !p.startsWith("referencia"));
  const delta = kpis.deltas?.trasladosCount;
  const destino = `/traslados/resultados${kpis.trasladosMes ? `?mes=${kpis.trasladosMes}` : ""}`;

  return <section className="cd-bandimoviles" aria-label="Resumen de Bandimóviles">
    <div className="cd-bandimoviles__header">
      <h3>Bandimóviles</h3>
      <span className="cd-bandimoviles__count">{num(kpis.trasladosCount)} {kpis.trasladosCount === 1 ? "turno con traslado" : "turnos con traslado"}</span>
    </div>
    {resultado ? <>
      <div className="cd-bandimoviles__amounts">
        {completo && <div><span>Resultado</span><strong>{fmt(resultado.resultado)}</strong></div>}
        {cobrosActuales && <div><span>Cobros registrados</span><strong>{fmt(resultado.ingresos)}</strong></div>}
        {anteriores && <div><span>Importe registrado{cobrosActuales ? " anteriormente" : ""}</span><strong>{fmt(historicos.importe_registrado)}</strong></div>}
      </div>
      {!completo && <div className="cd-bandimoviles__pending">
        <strong>Ganancia por calcular</strong>
        <span>{pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? "pendiente por revisar" : "pendientes por revisar"}` : "Falta completar información"}</span>
      </div>}
    </> : <div className="cd-bandimoviles__pending">
      <strong>Resultado no disponible</strong><span>No se pudo consultar. Volvé a intentarlo desde el detalle.</span>
    </div>}
    <div className="cd-bandimoviles__footer">
      {delta !== null && delta !== undefined && <span className="cd-bandimoviles__delta">
        {delta === 0 ? "Sin variación respecto al mes anterior"
          : `${delta > 0 ? "+" : ""}${delta} ${Math.abs(delta) === 1 ? "turno" : "turnos"} vs mes anterior`}
      </span>}
      <Link className="cd-bandimoviles__action" to={destino}>{completo ? "Ver resultado" : resultado ? "Revisar pendientes" : "Volver a consultar"}<span aria-hidden="true">→</span></Link>
    </div>
    {resultado && <details className="cd-bandimoviles__detail">
      <summary>Ver detalle de los registros</summary>
      <p>Los {num(kpis.trasladosCount)} turnos con traslado corresponden a servicios finalizados en Agenda.</p>
      <p>Recorridos completos en el formato actual: {num(resultado.realizados)}. Cobros registrados: {fmt(resultado.ingresos)}.</p>
      {anteriores && <p>Registro anterior: {num(historicos.cantidad)} traslados · {fmt(historicos.importe_registrado)}. Este importe no acredita cobros nuevos ni incluye los costos necesarios para calcular la ganancia.</p>}
      {!completo && pendientes.length > 0 && <ul>{pendientes.map((p) => <li key={p}>{MOTIVOS_RESULTADO[p] || "Hay datos por revisar en el detalle del resultado."}</li>)}</ul>}
    </details>}
  </section>;
}
