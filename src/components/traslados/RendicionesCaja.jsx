import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerCajaRendiciones } from "../../services/trasladosApi";

const fmt = (v) => Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
export default function RendicionesCaja({ fecha }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() { setLoading(true); setError(""); setData(null); try { const d = await obtenerCajaRendiciones(fecha); if (active) setData(d); } catch (e) { if (active) setError(e.message); } finally { if (active) setLoading(false); } }
    load(); return () => { active = false; };
  }, [fecha]);
  return <section className="incomes-reference-card" aria-label="Movimientos de rendiciones de traslados">
    <h3>Entregas y pagos de Bandimóviles</h3><p>Movimientos de dinero de rendiciones confirmadas. Se muestran aparte de la facturación y no vuelven a contabilizar ingresos ni gastos operativos.</p>
    {loading ? <p role="status">Cargando movimientos…</p> : error ? <p role="alert">No se pudieron cargar los movimientos: {error}</p> : data && <>
      <p>Entradas al local: <strong>{fmt(data.entradas)}</strong> · Salidas del local: <strong>{fmt(data.salidas)}</strong></p>
      {data.items.length ? <ul>{data.items.map((m) => <li key={m.id}>{m.persona_nombre} · {m.reversion_de ? "Reversión" : m.tipo === "entrega_local" ? "Entrega al local" : "Pago a la persona"} · {m.medio_pago} · {fmt(m.importe_caja)}</li>)}</ul> : <p>No hay entregas ni pagos registrados en esta fecha.</p>}
    </>}
    <Link to="/traslados/rendiciones">Ver rendiciones de choferes y socios</Link>
  </section>;
}
