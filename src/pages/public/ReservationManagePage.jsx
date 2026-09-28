// src/pages/public/ReservationManagePage.jsx
// Link que recibe el cliente para ver o cancelar su turno
// (/reservar/:slug/turno/:token), rediseño v2.0. Sin login: el código del
// link es la llave.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { cancelReservation, getReservation } from "../../services/publicBookingApi";
import { accentStyle } from "../../lib/booking/accent";
import {
  addDaysISO,
  argentinaToday,
  formatDurationRange,
  formatLongDate,
  formatLongDateCap,
  formatPriceRange,
  mapsLink,
  monthShort,
  whatsappLink,
} from "../../lib/booking/format";
import { buildIcs, downloadIcs } from "../../lib/booking/ics";
import { BottomSheet, Button, Notice, ShopAvatar } from "../../components/booking/BookingUI";
import { CalendarIcon, CheckIcon, ClockIcon, PawIcon, WhatsAppIcon } from "../../components/booking/Icons";
import "../../styles/booking-ui.css";

const STATUS_TEXT = {
  reserved: "Reservado",
  finished: "Atendido",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

const shortDay = (iso) => formatLongDate(iso).split(" ").slice(0, 2).join(" ");

export default function ReservationManagePage() {
  const { slug, token } = useParams();
  const [reservation, setReservation] = useState(null);
  const [state, setState] = useState("loading");
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(null); // { variant, text }

  useEffect(() => {
    let active = true;
    getReservation(slug, token)
      .then((data) => {
        if (!active) return;
        setReservation(data);
        setState("ready");
        document.title = `Tu turno · ${data.business.name}`;
      })
      .catch((err) => { if (active) setState(err?.status === 404 ? "not_found" : "error"); });
    return () => { active = false; };
  }, [slug, token]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelReservation(slug, token);
      setReservation(updated);
      setConfirming(false);
      setMessage({ variant: "ok", text: "Listo, cancelamos tu turno. ¡Gracias por avisar!" });
    } catch (err) {
      setConfirming(false);
      setMessage({
        variant: "error",
        text:
          err?.status === 409
            ? "Ya no se puede cancelar desde acá. Escribinos por WhatsApp."
            : "No pudimos cancelar el turno. Probá de nuevo en un momento.",
      });
    } finally {
      setCancelling(false);
    }
  }

  if (state !== "ready") {
    return (
      <div className="bk-page">
        <div className="bk-center">
          {state === "loading" ? (
            <p className="bk-loading-text"><PawIcon size={16} /> Cargando tu turno…</p>
          ) : (
            <>
              <h1 className="bk-center__title">{state === "not_found" ? "No encontramos este turno" : "Algo salió mal"}</h1>
              <p className="bk-center__text">
                {state === "not_found" ? "Revisá el link que te mandamos." : "Revisá tu conexión y probá recargar la página."}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const r = reservation;
  const { business } = r;
  const themeStyle = accentStyle(business.primary_color);
  const pageClass = `bk-page${business.primary_color ? " has-brand" : ""}`;
  const today = argentinaToday();
  const dateLabel = r.date === today ? "HOY" : r.date === addDaysISO(today, 1) ? "MAÑANA" : monthShort(r.date);
  const priceText = r.price !== null && r.price !== undefined ? formatPriceRange(r.price) : formatPriceRange(r.price_from, r.price_to);
  const durationText = r.duration_min ? formatDurationRange(r.duration_min, r.duration_max) : null;
  const wa = whatsappLink(
    business.whatsapp,
    `¡Hola! Te escribo por el turno de ${r.pet_name} del ${formatLongDate(r.date)} a las ${r.time}.`
  );
  const bookAgain = `/reservar/${slug}`;
  const isReserved = r.status === "reserved";

  const addToCalendar = () =>
    downloadIcs(
      `turno-${r.pet_name.toLowerCase().replace(/\s+/g, "-")}.ics`,
      buildIcs({
        uid: token,
        title: `${r.service_name || "Turno"} · ${r.pet_name} (${business.name})`,
        description: `Turno en ${business.name}. Si no podés venir: ${window.location.href}`,
        location: business.address,
        date: r.date,
        time: r.time,
        duration: r.duration,
      })
    );

  return (
    <div className={pageClass} style={themeStyle}>
      <div className="bk-wrap" style={{ paddingTop: 20 }}>
        <div className="bk-topbar" style={{ paddingTop: 0 }}>
          <ShopAvatar name={business.name} logoUrl={business.logo_url} size={36} />
          <span className="bk-topbar__name">{business.name}</span>
        </div>

        <div className="bk-turn-head">
          <h1>Tu turno</h1>
          <span className={`bk-badge bk-badge--${r.status}`}>{STATUS_TEXT[r.status]}</span>
        </div>

        {message && (
          <div style={{ marginBottom: 14 }}>
            <Notice variant={message.variant} role="status">{message.text}</Notice>
          </div>
        )}

        {isReserved ? (
          <>
            <section className="bk-card">
              <div className="bk-when">
                <div className="bk-when__date">
                  <span className="bk-when__month">{dateLabel}</span>
                  <span className="bk-when__day">{Number(r.date.slice(8))}</span>
                </div>
                <div>
                  <p className="bk-when__title">{formatLongDateCap(r.date)}</p>
                  <p className="bk-when__sub">
                    {r.time} h{durationText ? ` · dura de ${durationText}` : ""}
                  </p>
                </div>
              </div>
              <dl className="bk-details">
                {r.service_name && <div><dt>Servicio</dt><dd>{r.service_name}</dd></div>}
                <div><dt>Perro</dt><dd>{r.pet_name}</dd></div>
                {business.address && (
                  <div>
                    <dt>Dirección</dt>
                    <dd>
                      {business.address}
                      <br />
                      <a href={mapsLink(business.address)} target="_blank" rel="noreferrer">Cómo llegar</a>
                    </dd>
                  </div>
                )}
                {priceText && (
                  <div>
                    <dt>Precio</dt>
                    <dd>
                      {priceText}
                      {r.price === null && r.price_to !== r.price_from && <small>se confirma en el local</small>}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {!r.can_cancel && (
              <div style={{ marginTop: 14 }}>
                <Notice variant="warn" icon={false}>
                  <span className="bk-inline-icon">
                    <ClockIcon size={18} />
                    <span>
                      Faltan menos de {r.cancel_hours} horas, así que ya no se puede cancelar desde acá. Si no podés venir,
                      avisanos por WhatsApp.
                    </span>
                  </span>
                </Notice>
              </div>
            )}

            <div className="bk-actions">
              {r.can_cancel ? (
                <>
                  <Button variant="ghost" size="lg" onClick={addToCalendar}>
                    <CalendarIcon size={18} /> Agregar a mi calendario
                  </Button>
                  {wa && (
                    <Button variant="whatsapp" size="lg" href={wa}>
                      <WhatsAppIcon /> Escribinos por WhatsApp
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {wa && (
                    <Button variant="whatsapp" size="lg" href={wa}>
                      <WhatsAppIcon /> Avisar por WhatsApp
                    </Button>
                  )}
                  <Button variant="ghost" size="lg" onClick={addToCalendar}>
                    Agregar a mi calendario
                  </Button>
                </>
              )}
            </div>

            {r.can_cancel && (
              <>
                <button type="button" className="bk-danger-link" onClick={() => setConfirming(true)}>
                  Cancelar turno
                </button>
                <p className="bk-cancel-hint" style={{ marginTop: 4 }}>
                  Podés cancelar hasta el {shortDay(r.cancel_until.date)} a las {r.cancel_until.time}.
                </p>
              </>
            )}
          </>
        ) : (
          <section className="bk-card bk-state-card">
            {r.status === "cancelled" && (
              <>
                <p className="bk-when__title is-struck">{formatLongDateCap(r.date)} · {r.time} h</p>
                <p style={{ marginTop: 10 }}>Listo, liberamos el horario. Cuando quieras, reservá de nuevo.</p>
                <a className="bk-btn bk-btn--primary bk-btn--block" href={bookAgain}>Reservar otro turno</a>
              </>
            )}
            {r.status === "finished" && (
              <>
                <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckIcon size={16} color="#15803d" /> ¡Gracias por traer a {r.pet_name}!
                </h2>
                <p>Esperamos que haya quedado hermoso. ¿Le reservamos el próximo?</p>
                <a className="bk-btn bk-btn--primary bk-btn--block" href={bookAgain}>Reservar de nuevo</a>
              </>
            )}
            {r.status === "no_show" && (
              <>
                <h2 style={{ marginTop: 0 }}>Te esperamos y no pudiste venir</h2>
                <p>Pasa. Si querés otro turno, reservalo acá o escribinos.</p>
                <div className="bk-row-actions">
                  <a className="bk-btn bk-btn--primary" href={bookAgain}>Reservar</a>
                  {wa && <Button variant="whatsapp-outline" href={wa}>WhatsApp</Button>}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={confirming} onClose={() => setConfirming(false)} labelledBy="bk-cancel-title">
        <h2 className="bk-sheet__title" id="bk-cancel-title">¿Seguro que querés cancelar?</h2>
        <p className="bk-sheet__text">
          Vamos a liberar el turno de <strong>{r.pet_name}</strong> del {shortDay(r.date)} a las {r.time} para que lo use otro perro.
        </p>
        <Button variant="danger" size="lg" className="bk-btn--block" disabled={cancelling} onClick={handleCancel}>
          {cancelling ? "Cancelando…" : "Sí, cancelar turno"}
        </Button>
        <Button variant="ghost" size="lg" className="bk-btn--block" onClick={() => setConfirming(false)}>
          No, mantener mi turno
        </Button>
      </BottomSheet>
    </div>
  );
}
