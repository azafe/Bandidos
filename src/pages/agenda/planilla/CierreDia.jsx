import { useMemo } from "react";
import { Link } from "react-router-dom";
import { liquidacionPeluqueros, resumenCierre, totalesLiquidacion } from "../../../lib/cierreDia";
import { diaSemana, fechaCorta, hora, montoDe } from "../../../lib/planilla";

// Con centavos cuando los hay: el reparto entre peluqueras puede dejar $3.333,34.
const plata = (v) => {
  const r = Math.round(Number(v || 0) * 100) / 100;
  const dec = Number.isInteger(r) ? 0 : 2;
  return `$${r.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};
const cantidad = (n) => Number(n.toFixed(2)).toLocaleString("es-AR");

function textoCierre(fecha, resumen, filas) {
  const lineas = [`*Cierre ${diaSemana(fecha)} ${fechaCorta(fecha)}*`, ""];
  for (const f of filas.filter((x) => x.finishedCount > 0)) lineas.push(`${f.groomerName}: ${plata(f.payout)}`);
  lineas.push("");
  for (const m of resumen.byPaymentMethod) lineas.push(`${m.name}: ${plata(m.total)}`);
  lineas.push(`Total servicios: ${plata(resumen.finishedIncome)}`);
  return lineas.join("\n");
}

// Cierre del día: las mismas cuentas que la agenda clásica (src/lib/cierreDia.js).
export default function CierreDia({ fecha, turnos, servicios, medios, empleados, onCopiar }) {
  const resumen = useMemo(() => resumenCierre(turnos, servicios, medios), [turnos, servicios, medios]);
  const filas = useMemo(() => liquidacionPeluqueros(turnos, servicios, empleados), [turnos, servicios, empleados]);
  const totales = totalesLiquidacion(filas);
  const visibles = filas.filter((f) => f.finishedCount > 0);
  const pendientes = turnos.filter((t) => (t.status || "reserved") === "reserved");
  const traslados = turnos.filter((t) => t.status === "finished" && t.traslado && !t.traslado_bonificado).reduce((a, t) => a + montoDe(t.traslado_amount), 0);

  return (
    <details className="pl-card pl-cierre" open={resumen.finished > 0}>
      <summary><h2>Cierre del día</h2><span>{resumen.finished} de {resumen.totalScheduled} terminados · {plata(resumen.finishedIncome)}</span></summary>
      <div className="pl-cierre-body">
        {pendientes.length > 0 && <p className="pl-tag note" style={{ margin: 0 }}>Faltan cerrar {pendientes.length} {pendientes.length === 1 ? "turno" : "turnos"}: {pendientes.map((t) => `${hora(t.time)} ${t.pet_name}`).join(", ")}.</p>}
        <div className="pl-cierre-kpis">
          <div><span>Servicios cobrados</span><strong>{plata(resumen.finishedIncome)}</strong></div>
          <div><span>A pagar a peluqueras</span><strong>{plata(totales.payout)}</strong></div>
          <div><span>Queda para el local</span><strong>{plata(resumen.finishedIncome - totales.payout)}</strong></div>
        </div>
        <div className="pl-cierre-cols">
          <section aria-labelledby="pl-h-medios">
            <h3 id="pl-h-medios">Por medio de pago</h3>
            {resumen.byPaymentMethod.length ? (
              <table className="pl-table"><tbody>
                {resumen.byPaymentMethod.map((m) => <tr key={m.name}><td>{m.name}</td><td>{plata(m.total)}</td></tr>)}
                <tr className="total"><td>Total (incluye señas)</td><td>{plata(resumen.finishedIncome)}</td></tr>
              </tbody></table>
            ) : <p className="pl-help">Todavía no hay turnos terminados.</p>}
            {resumen.finishedWithoutPayment.length > 0 && <p className="pl-tag note">⚠ Sin medio de pago: {resumen.finishedWithoutPayment.map((t) => t.pet_name).join(", ")}.</p>}
            {traslados > 0 && <p className="pl-help">Traslados cobrados aparte: {plata(traslados)}. Se ven en Rendición de Caja.</p>}
          </section>
          <section aria-labelledby="pl-h-pelu">
            <h3 id="pl-h-pelu">A pagar a cada peluquera</h3>
            {visibles.length ? (
              <table className="pl-table">
                <thead><tr><th>Peluquera</th><th>Servicios</th><th>Facturado</th><th>A pagar</th></tr></thead>
                <tbody>
                  {visibles.map((f) => <tr key={f.groomerId}><td>{f.groomerName}</td><td>{cantidad(f.finishedCount)}</td><td>{plata(f.finishedIncome)}</td><td><strong>{plata(f.payout)}</strong></td></tr>)}
                  <tr className="total"><td>Total</td><td>{cantidad(totales.finishedCount)}</td><td>{plata(totales.finishedIncome)}</td><td>{plata(totales.payout)}</td></tr>
                </tbody>
              </table>
            ) : <p className="pl-help">Cuando termines turnos, acá aparece lo de cada una.</p>}
            <p className="pl-help">Un servicio compartido reparte la comisión de la principal en partes iguales.</p>
          </section>
        </div>
        <div className="pl-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="pl-btn ghost" onClick={() => onCopiar(textoCierre(fecha, resumen, filas))} disabled={!resumen.finished}>Copiar cierre para WhatsApp</button>
          <Link className="pl-link" to="/expenses/daily-incomes">Rendición de Caja →</Link>
          <Link className="pl-link" to={`/agenda/clasica?date=${fecha}`}>Ver en la agenda clásica →</Link>
        </div>
      </div>
    </details>
  );
}
