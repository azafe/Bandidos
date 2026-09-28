// src/pages/public/ReservationManagePage.jsx
// Link que recibe el cliente para ver o cancelar su turno
// (/reservar/:slug/turno/:token). Sin login: el código del link es la llave.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  cancelReservation,
  formatLongDate,
  formatMinutes,
  formatMoney,
  getReservation,
} from "../../services/publicBookingApi";
import { whatsappUrl } from "../../utils/pets";
import "../../styles/public-booking.css";

const STATUS_TEXT = {
  reserved: "Reservado",
  finished: "Atendido",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

export default function ReservationManagePage() {
  const { slug, token } = useParams();
  const [reservation, setReservation] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | not_found | error
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

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
    setMessage("");
    try {
      const updated = await cancelReservation(slug, token);
      setReservation(updated);
      setConfirming(false);
      setMessage("Listo, cancelamos tu turno. ¡Gracias por avisar!");
    } catch (err) {
      setMessage(
        err?.status === 409
          ? "Ya no se puede cancelar desde acá. Escribinos por WhatsApp."
          : "No pudimos cancelar el turno. Probá de nuevo en un momento."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (state !== "ready") {
    return (
      <div className="pb-page">
        <div className="pb-shell pb-center">
          {state === "loading" ? (
            <p className="pb-muted">Cargando…</p>
          ) : (
            <>
              <h1 className="pb-title">{state === "not_found" ? "No encontramos este turno" : "Algo salió mal"}</h1>
              <p className="pb-muted">
                {state === "not_found" ? "Revisá el link que te mandamos." : "Probá recargar la página en un momento."}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const { business } = reservation;
  const wa = whatsappUrl(
    business.whatsapp,
    `¡Hola! Te escribo por el turno de ${reservation.pet_name} del ${formatLongDate(reservation.date)} a las ${reservation.time}.`
  );

  return (
    <div className="pb-page">
      <div className="pb-shell">
        <section className="pb-card">
          <p className="pb-muted">{business.name}</p>
          <h1 className="pb-title">Turno de {reservation.pet_name}</h1>
          <span className={`pb-status pb-status--${reservation.status}`}>{STATUS_TEXT[reservation.status]}</span>
          <dl className="pb-summary">
            <div><dt>Cuándo</dt><dd>{formatLongDate(reservation.date)} · {reservation.time}</dd></div>
            {reservation.service_name && <div><dt>Servicio</dt><dd>{reservation.service_name}</dd></div>}
            <div><dt>Duración</dt><dd>{formatMinutes(reservation.duration)}</dd></div>
            {business.address && <div><dt>Dónde</dt><dd>{business.address}</dd></div>}
            {reservation.price !== null && <div><dt>Precio</dt><dd>{formatMoney(reservation.price)}</dd></div>}
          </dl>

          {message && <p className="pb-notice" role="status">{message}</p>}

          {reservation.can_cancel && !confirming && (
            <button type="button" className="pb-btn pb-btn--danger" onClick={() => setConfirming(true)}>
              Cancelar turno
            </button>
          )}
          {reservation.can_cancel && confirming && (
            <div className="pb-confirm">
              <p>¿Seguro que querés cancelar el turno?</p>
              <div className="pb-done__actions">
                <button type="button" className="pb-btn pb-btn--danger" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? "Cancelando…" : "Sí, cancelar"}
                </button>
                <button type="button" className="pb-btn" onClick={() => setConfirming(false)}>No, lo mantengo</button>
              </div>
            </div>
          )}
          {reservation.status === "reserved" && !reservation.can_cancel && (
            <p className="pb-muted">
              Faltan menos de {reservation.cancel_hours} horas para el turno, así que ya no se puede cancelar desde acá.
              Escribinos por WhatsApp.
            </p>
          )}

          <div className="pb-done__actions">
            {wa && (
              <a className="pb-btn" href={wa} target="_blank" rel="noreferrer">Escribinos por WhatsApp</a>
            )}
            {reservation.status !== "reserved" && (
              <Link className="pb-btn pb-btn--primary" to={`/reservar/${slug}`}>Reservar otro turno</Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
