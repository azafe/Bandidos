import { useEffect, useRef, useState } from "react";
import { importarHistoricos, revisarHistoricos } from "../../services/trasladosApi";
import { importeHistorico, estadoTurnoHistorico } from "../../lib/trasladosHistoricos";

export default function RevisionHistoricos({ onImported }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const refresh = useRef(onImported);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { refresh.current = onImported; }, [onImported]);
  async function review() {
    setBusy(true); setError(""); setMessage(""); setConfirmed(false); setPreview(null);
    try {
      const data = await revisarHistoricos();
      if (active.current) setPreview(data);
    } catch (err) { if (active.current) setError(err.message); }
    finally { if (active.current) setBusy(false); }
  }
  async function apply() {
    if (!confirmed || !preview?.resumen.cantidad || busy) return;
    setBusy(true); setError("");
    try {
      const result = await importarHistoricos({ hasta: preview.hasta, revision: preview.revision, cantidad: preview.resumen.cantidad, confirmar: true });
      if (active.current) {
        setMessage(`${result.solicitudes} traslados incorporados al historial hasta el 15/10/2026. Los del 16/10 en adelante siguen intactos.`);
        setPreview(null); setConfirmed(false);
        await refresh.current();
      }
    } catch (err) {
      if (active.current) {
        setError(err.message);
        // Un error de red puede ocurrir después del commit. Conservar la revisión
        // permite reintentar sin duplicar; un conflicto exige revisar otra vez.
        if (err.status === 409) { setPreview(null); setConfirmed(false); }
      }
    } finally { if (active.current) setBusy(false); }
  }
  return <section className="card traslados-revision" aria-label="Importación de históricos">
    <h2>Históricos hasta el 15/10/2026</h2>
    <p>Incorporá los traslados anteriores al historial. Los del 16/10/2026 en adelante quedan fuera, aunque todavía usen el formato viejo.</p>
    <button type="button" className="btn-secondary" disabled={busy} onClick={review}>{busy ? "Procesando..." : "Revisar históricos hasta el 15/10"}</button>
    {error && <p role="alert" className="traslados-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {preview && <>
      <p><strong>{preview.resumen.cantidad} traslados para incorporar.</strong> Revisá la cantidad y los cambios antes de confirmar.</p>
      <p>Importe ya incluido en los informes anteriores: {importeHistorico(preview.resumen.importe_en_reportes)}. Se conserva ese total, sin crear cobros nuevos.</p>
      <p>{preview.resumen.bonificados_confirmados} bonificados confirmados · {preview.resumen.ceros_sin_clasificar} ceros sin clasificación.</p>
      <p>Los datos de chofer, móvil, horario y estado operativo quedan sin registrar.</p>
      <details><summary>Ver registros y SQL de la importación</summary>
        <p>Se agregarán {preview.resumen.solicitudes} solicitudes, {preview.resumen.tramos} tramos históricos y {preview.resumen.copias_historicas} copias de origen. Los turnos originales no se modifican.</p>
        <div className="traslados-revision-registros"><ul>{preview.items.map((r) => <li key={r.id}>{r.date} · {r.pet_name || "Mascota sin nombre"} · {estadoTurnoHistorico(r.status)} · {importeHistorico(r.traslado_amount)}</li>)}</ul></div>
        <pre className="traslados-sql">{preview.sql}</pre>
        <p>Parámetros de esta revisión:</p><pre className="traslados-sql">{JSON.stringify(preview.parametros, null, 2)}</pre>
      </details>
      {preview.resumen.cantidad > 0 && <>
        <label className="traslados-confirmacion"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} /><span>Revisé la cantidad y el SQL. Confirmo importar estos históricos hasta el 15/10/2026, sin tocar los traslados posteriores.</span></label>
        <button type="button" className="btn-primary" disabled={!confirmed || busy} onClick={apply}>Confirmar importación de {preview.resumen.cantidad} traslados</button>
      </>}
    </>}
  </section>;
}
