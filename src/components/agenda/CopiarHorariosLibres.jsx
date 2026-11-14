import { useEffect, useState } from "react";
import { getAvailability, getBookingPage } from "../../services/publicBookingApi";
import { copyToClipboard } from "../../services/bookingApi";
import { textoHorariosLibres } from "../../lib/mensajesGrupo";
import { addDaysISO, argentinaToday } from "../../lib/booking/format";

// Copia los horarios libres del día elegido y el siguiente, con la misma
// disponibilidad que ve el cliente en la web de reservas.
export default function CopiarHorariosLibres({ slug, fecha, link }) {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [estado, setEstado] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getBookingPage(slug)
      .then((page) => {
        if (!active) return;
        const list = page?.services || [];
        setServices(list);
        setServiceId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => { if (active) setEstado("No se pudieron cargar los servicios de la web de reservas."); });
    return () => { active = false; };
  }, [slug]);

  async function copiar() {
    const service = services.find((s) => String(s.id) === String(serviceId));
    if (!service) return;
    setBusy(true);
    setEstado("");
    try {
      const hoy = argentinaToday();
      const desde = fecha < hoy ? hoy : fecha;
      const data = await getAvailability(slug, { serviceTypeId: service.id, from: desde, days: 2 });
      const dias = (data?.days || []).filter((d) => d.date <= addDaysISO(desde, 1));
      const ok = await copyToClipboard(textoHorariosLibres(dias, { hoyISO: hoy, servicio: service.name, link }));
      setEstado(ok ? "¡Horarios copiados! Pegalos en WhatsApp." : "No se pudo copiar. Probá de nuevo.");
    } catch {
      setEstado("No se pudieron consultar los horarios libres. Revisá la conexión y probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (!services.length && !estado) return null;
  return (
    <div className="agenda-horarios-libres">
      {services.length > 1 && (
        <label>
          <span className="agenda-horarios-libres__label">Servicio</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={busy}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      {services.length > 0 && (
        <button type="button" className="btn-secondary" onClick={copiar} disabled={busy || !serviceId}>
          {busy ? "Buscando…" : "📋 Copiar horarios libres"}
        </button>
      )}
      {estado && <span role="status" className="agenda-horarios-libres__estado">{estado}</span>}
    </div>
  );
}
