// Detalle de un servicio (turno) del historial. Modal de 720 px en desktop,
// bottom sheet en mobile.
import { useNavigate } from "react-router-dom";
import Sheet from "./Sheet";
import { Pill, StatusPill } from "./PetBits";
import {
  displayName,
  displayText,
  formatDate,
  formatDuration,
  formatMoney,
  formatTime,
  weekdayName,
} from "../../../utils/pets";

// turno: fila de agenda_turnos · resolve: { groomer(t), payment(t), serviceType(t) }
export default function ServiceDetail({ turno, pet, resolve, onClose }) {
  const navigate = useNavigate();
  if (!turno) return null;

  const status = turno.status || "reserved";
  const price = Number(turno.price) || 0;
  const deposit = Number(turno.deposit_amount) || 0;
  const balance = Math.max(0, price - deposit);
  const time = formatTime(turno.time);
  const duration = formatDuration(turno.duration);
  const groomer = resolve.groomer(turno);
  const payment = resolve.payment(turno);
  const serviceName = resolve.serviceType(turno) || "Servicio";
  const petName = displayName(turno.pet_name || pet?.name) || "Mascota";
  const date = String(turno.date || "").split("T")[0];

  const eyebrow = [`${weekdayName(date)} ${formatDate(date)}`.trim(), time, duration].filter(Boolean).join(" · ");
  const subtitle = [displayName(turno.owner_name || pet?.owner_name), displayName(turno.breed || pet?.breed)]
    .filter(Boolean)
    .join(" · ");

  const operational = [
    { label: "Fecha y hora", value: [formatDate(date), time].filter(Boolean).join(" · ") },
    { label: "Duración", value: duration },
    { label: "Groomer", value: groomer },
    { label: "Método de pago", value: payment },
  ].filter((r) => r.value);

  const footer = (
    <>
      <button
        type="button"
        className="pv-btn pv-btn--ghost"
        onClick={() => navigate(`/agenda?date=${date}&turno=${encodeURIComponent(turno.id)}`)}
      >
        Ver en la agenda
      </button>
      <span className="pv-spacer" />
      <button type="button" className="pv-btn pv-btn--dark" onClick={onClose}>
        Cerrar
      </button>
    </>
  );

  return (
    <Sheet open onClose={onClose} title={`${petName} — ${serviceName}`} hideTitle width={720} footer={footer}>
      <div className="pv-service">
        <div className="pv-service__head">
          <div>
            <p className="pv-eyebrow">{eyebrow}</p>
            <h3 className="pv-service__title">
              {petName} — {serviceName}
            </h3>
            <p className="pv-muted pv-service__sub">
              {subtitle}
              {groomer && <Pill tone="groomer">{groomer}</Pill>}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="pv-service__metrics">
          <div className="pv-metric">
            <span>Precio</span>
            <strong>{formatMoney(price)}</strong>
          </div>
          <div className="pv-metric">
            <span>Seña</span>
            <strong>{deposit > 0 ? formatMoney(deposit) : "Sin seña"}</strong>
          </div>
          <div className={`pv-metric pv-metric--balance ${balance > 0 ? "is-pending" : "is-clear"}`}>
            <span>Saldo pendiente</span>
            <strong>{balance > 0 ? formatMoney(balance) : "Saldado"}</strong>
          </div>
        </div>

        <div className="pv-service__panels">
          {operational.length > 0 && (
            <section className="pv-panel">
              <h4>Detalle operativo</h4>
              <dl className="pv-rows">
                {operational.map((row) => (
                  <div key={row.label} className="pv-rows__row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="pv-panel">
            <h4>Notas</h4>
            <p className={turno.notes ? "pv-panel__text" : "pv-panel__text pv-muted"}>
              {turno.notes ? displayText(turno.notes) : "Sin notas para este turno."}
            </p>
          </section>
        </div>
      </div>
    </Sheet>
  );
}
