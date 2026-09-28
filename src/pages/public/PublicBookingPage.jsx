// src/pages/public/PublicBookingPage.jsx
// Página pública de reservas (/reservar/:slug). La usa el cliente del local
// desde el celular, sin login: elige servicio y tamaño del perro, día y
// horario libre, deja sus datos y listo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createReservation,
  formatLongDate,
  formatMinutes,
  formatMoney,
  formatMonthName,
  formatWeekdayShort,
  getAvailability,
  getBookingPage,
  googleCalendarUrl,
} from "../../services/publicBookingApi";
import { whatsappUrl } from "../../utils/pets";
import "../../styles/public-booking.css";

const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAYS_PER_PAGE = 14;
const STEPS = ["time", "data"];
const STEP_LABELS = { time: "Día y hora", data: "Tus datos" };

const EMPTY_FORM = {
  phone: "",
  owner_name: "",
  pet_name: "",
  breed: "",
  email: "",
  notes: "",
  accept_policy: false,
  website: "",
};

// "$15.000" o "$15.000 a $30.000" si el precio cambia según el tamaño.
function priceRange(service) {
  if (!service || service.price_from === null || service.price_from === undefined) return null;
  if (service.price_to === null || service.price_to === undefined || service.price_to === service.price_from) {
    return formatMoney(service.price_from);
  }
  return `${formatMoney(service.price_from)} a ${formatMoney(service.price_to)}`;
}

const varies = (service) => Boolean(service && service.price_to && service.price_to !== service.price_from);

function groupSlots(slots) {
  const groups = [
    { key: "morning", label: "Mañana", slots: [] },
    { key: "afternoon", label: "Tarde", slots: [] },
    { key: "evening", label: "Noche", slots: [] },
  ];
  for (const slot of slots) {
    const hour = Number(slot.slice(0, 2));
    if (hour < 13) groups[0].slots.push(slot);
    else if (hour < 19) groups[1].slots.push(slot);
    else groups[2].slots.push(slot);
  }
  return groups.filter((g) => g.slots.length);
}

function durationRange(service) {
  if (service.duration_min === service.duration_max) return formatMinutes(service.duration_min);
  return `${formatMinutes(service.duration_min)} a ${formatMinutes(service.duration_max)}`;
}

function BusinessHeader({ business, hours, showHours, onToggleHours }) {
  const wa = whatsappUrl(business.whatsapp);
  const initial = (business.name || "?").trim().charAt(0).toUpperCase();
  return (
    <header className="pb-header">
      <div className="pb-header__brand">
        {business.logo_url ? (
          <img className="pb-header__logo" src={business.logo_url} alt="" />
        ) : (
          <span className="pb-header__logo pb-header__logo--initial" aria-hidden="true">{initial}</span>
        )}
        <div className="pb-header__text">
          <h1>{business.name}</h1>
          {business.address && <p>{business.address}</p>}
        </div>
      </div>
      <div className="pb-header__actions">
        {wa && (
          <a className="pb-chip pb-chip--wa" href={wa} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        {hours && hours.length > 0 && (
          <button type="button" className="pb-chip" onClick={onToggleHours} aria-expanded={showHours}>
            {showHours ? "Ocultar horarios" : "Ver horarios"}
          </button>
        )}
      </div>
      {showHours && hours && (
        <ul className="pb-hours">
          {WEEK_ORDER.map((weekday) => {
            const ranges = hours.filter((h) => h.weekday === weekday);
            return (
              <li key={weekday}>
                <span>{WEEKDAY_NAMES[weekday]}</span>
                <span>{ranges.length ? ranges.map((r) => `${r.start_time} a ${r.end_time}`).join(" · ") : "Cerrado"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | not_found | error
  const [showHours, setShowHours] = useState(false);

  const [step, setStep] = useState("home"); // home | service | time | data | done
  const [serviceId, setServiceId] = useState(null);
  const [days, setDays] = useState([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [daysError, setDaysError] = useState("");
  const [hasMoreDays, setHasMoreDays] = useState(true);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    let active = true;
    getBookingPage(slug)
      .then((data) => {
        if (!active) return;
        setPage(data);
        setLoadState("ready");
        document.title = `Reservá tu turno · ${data.business.name}`;
      })
      .catch((err) => {
        if (active) setLoadState(err?.status === 404 ? "not_found" : "error");
      });
    return () => { active = false; };
  }, [slug]);

  const service = useMemo(
    () => page?.services?.find((s) => s.id === serviceId) ?? null,
    [page, serviceId]
  );

  // El cliente no elige tamaño: lo define el local. La disponibilidad se
  // calcula con la duración más larga del servicio.
  const loadDays = useCallback(
    async (from, append, serviceTypeId) => {
      if (!serviceTypeId) return;
      setDaysLoading(true);
      setDaysError("");
      try {
        const data = await getAvailability(slug, { serviceTypeId, from, days: DAYS_PER_PAGE });
        setDays((prev) => (append ? [...prev, ...data.days] : data.days));
        setHasMoreDays(data.days.length === DAYS_PER_PAGE);
        if (!append) {
          const firstOpen = data.days.find((d) => d.slots.length);
          setDate(firstOpen?.date ?? null);
        }
      } catch {
        setDaysError("No pudimos cargar los horarios. Probá de nuevo en un momento.");
      } finally {
        setDaysLoading(false);
      }
    },
    [slug]
  );

  function chooseService(id) {
    setServiceId(id);
    setTime(null);
    setDate(null);
    setDays([]);
    setStep("time");
    loadDays(undefined, false, id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadMoreDays() {
    const last = days[days.length - 1]?.date;
    if (!last) return;
    const [y, m, d] = last.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    loadDays(next, true, serviceId);
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  }

  async function submit() {
    if (!form.phone.trim() || !form.owner_name.trim() || !form.pet_name.trim()) {
      setFormError("Completá tu celular, tu nombre y el nombre de tu perro.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 8) {
      setFormError("Revisá el celular: poné la característica y el número, por ejemplo 381 555-1234.");
      return;
    }
    if (!form.accept_policy) {
      setFormError("Para reservar tenés que aceptar la política de cancelación.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const created = await createReservation(slug, {
        service_type_id: service.id,
        date,
        time,
        owner_name: form.owner_name.trim(),
        phone: form.phone.trim(),
        pet_name: form.pet_name.trim(),
        breed: form.breed.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        accept_policy: true,
        website: form.website,
      });
      setReservation(created);
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err?.status === 409) {
        setTime(null);
        setStep("time");
        loadDays(undefined, false, serviceId);
        setFormError("");
        alert("¡Uy! Alguien acaba de reservar ese horario. Elegí otro, por favor.");
      } else if (err?.status === 429) {
        setFormError("Ya tenés varias reservas activas o hiciste muchos intentos. Escribinos por WhatsApp y te ayudamos.");
      } else if (err?.status === 400) {
        setFormError("Revisá los datos: el email o el celular no parecen válidos.");
      } else {
        setFormError("No pudimos confirmar la reserva. Probá de nuevo en un momento.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Estados de carga ────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="pb-page">
        <div className="pb-shell"><p className="pb-muted pb-center">Cargando…</p></div>
      </div>
    );
  }

  if (loadState === "not_found" || loadState === "error") {
    return (
      <div className="pb-page">
        <div className="pb-shell pb-center">
          <h1 className="pb-title">{loadState === "not_found" ? "No encontramos esta página" : "Algo salió mal"}</h1>
          <p className="pb-muted">
            {loadState === "not_found"
              ? "Revisá el link o pedile uno nuevo a la peluquería."
              : "Probá recargar la página en un momento."}
          </p>
        </div>
      </div>
    );
  }

  const { business } = page;
  const accentStyle = business.primary_color ? { "--pb-accent": business.primary_color } : undefined;

  if (!page.enabled) {
    const wa = whatsappUrl(business.whatsapp, "¡Hola! Quería sacar un turno.");
    return (
      <div className="pb-page" style={accentStyle}>
        <div className="pb-shell">
          <BusinessHeader business={business} />
          <section className="pb-card pb-center">
            <h2 className="pb-title">Por ahora no tomamos reservas online</h2>
            <p className="pb-muted">Escribinos y coordinamos tu turno.</p>
            {wa && (
              <a className="pb-btn pb-btn--primary" href={wa} target="_blank" rel="noreferrer">
                Escribir por WhatsApp
              </a>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── Confirmación ───────────────────────────────────────────────────────

  if (step === "done" && reservation) {
    const managePath = `/reservar/${slug}/turno/${reservation.token}`;
    const calendarUrl = googleCalendarUrl({
      title: `${reservation.service_name} · ${reservation.pet_name} (${business.name})`,
      details: `Turno reservado en ${business.name}.`,
      location: business.address,
      date: reservation.date,
      time: reservation.time,
      duration: reservation.duration,
    });
    const wa = whatsappUrl(
      business.whatsapp,
      `¡Hola! Reservé un turno para ${reservation.pet_name} el ${formatLongDate(reservation.date)} a las ${reservation.time}.`
    );
    return (
      <div className="pb-page" style={accentStyle}>
        <div className="pb-shell">
          <section className="pb-card pb-done">
            <div className="pb-done__icon" aria-hidden="true">✓</div>
            <h1 className="pb-title">¡Listo, {reservation.owner_name.split(" ")[0]}!</h1>
            <p className="pb-done__lead">
              Te esperamos con <strong>{reservation.pet_name}</strong> el{" "}
              <strong>{formatLongDate(reservation.date)}</strong> a las <strong>{reservation.time}</strong>.
            </p>
            <dl className="pb-summary">
              <div><dt>Servicio</dt><dd>{reservation.service_name}</dd></div>
              {service && <div><dt>Duración</dt><dd>{durationRange(service)}</dd></div>}
              {business.address && <div><dt>Dónde</dt><dd>{business.address}</dd></div>}
              {reservation.price !== null ? (
                <div><dt>Precio</dt><dd>{formatMoney(reservation.price)}</dd></div>
              ) : (
                priceRange(service) && (
                  <div><dt>Precio</dt><dd>{priceRange(service)}{varies(service) ? " según tamaño" : ""}</dd></div>
                )
              )}
            </dl>
            <div className="pb-done__actions">
              <a className="pb-btn pb-btn--primary" href={calendarUrl} target="_blank" rel="noreferrer">
                Agregar a mi calendario
              </a>
              {wa && (
                <a className="pb-btn" href={wa} target="_blank" rel="noreferrer">
                  Escribinos por WhatsApp
                </a>
              )}
            </div>
            <p className="pb-muted pb-done__manage">
              {reservation.can_cancel ? (
                <>
                  ¿No podés venir? <Link to={managePath}>Cancelá tu turno desde acá</Link>
                  {reservation.cancel_hours > 0 ? ` (hasta ${reservation.cancel_hours} h antes)` : ""}.
                  {form.email ? " También te lo mandamos por email." : " Guardá este link."}
                </>
              ) : (
                <>
                  Si no podés venir, avisanos por WhatsApp. <Link to={managePath}>Ver mi turno</Link>
                </>
              )}
            </p>
            <button
              type="button"
              className="pb-link"
              onClick={() => {
                setReservation(null);
                setForm((prev) => ({ ...EMPTY_FORM, phone: prev.phone, owner_name: prev.owner_name, email: prev.email }));
                setServiceId(null);
                setStep("home");
              }}
            >
              Reservar otro turno
            </button>
          </section>
        </div>
      </div>
    );
  }

  // ── Flujo de reserva ───────────────────────────────────────────────────

  const selectedDay = days.find((d) => d.date === date);
  const stepIndex = STEPS.indexOf(step);

  let barAction = null;
  if (step === "time") {
    barAction = {
      label: "Continuar",
      disabled: !date || !time,
      onClick: () => { setStep("data"); window.scrollTo({ top: 0, behavior: "smooth" }); },
    };
  } else if (step === "data") {
    barAction = { label: submitting ? "Reservando…" : "Confirmar reserva", disabled: submitting, onClick: submit };
  }

  return (
    <div className="pb-page" style={accentStyle}>
      <div className="pb-shell">
        <BusinessHeader
          business={business}
          hours={page.hours}
          showHours={showHours}
          onToggleHours={() => setShowHours((v) => !v)}
        />

        {step === "home" && (
          <section>
            <h2 className="pb-section-title">¿Qué necesita tu perro?</h2>
            {page.services.length === 0 ? (
              <p className="pb-card pb-muted">Todavía no hay servicios para reservar online.</p>
            ) : (
              <div className="pb-services">
                {page.services.map((s) => (
                  <button key={s.id} type="button" className="pb-service" onClick={() => chooseService(s.id)}>
                    <span className="pb-service__name">{s.name}</span>
                    {s.description && <span className="pb-service__desc">{s.description}</span>}
                    <span className="pb-service__meta">
                      {priceRange(s) && <strong>{priceRange(s)}</strong>}
                      <span>{durationRange(s)}</span>
                      {varies(s) && <span>según tamaño</span>}
                    </span>
                    <span className="pb-service__cta">Reservar</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step !== "home" && (
          <>
            <nav className="pb-steps" aria-label="Pasos">
              {STEPS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  className={`pb-steps__item${index === stepIndex ? " is-active" : ""}${index < stepIndex ? " is-done" : ""}`}
                  disabled={index >= stepIndex}
                  onClick={() => setStep(key)}
                >
                  <span className="pb-steps__num">{index < stepIndex ? "✓" : index + 1}</span>
                  {STEP_LABELS[key]}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="pb-back"
              onClick={() => setStep(stepIndex === 0 ? "home" : STEPS[stepIndex - 1])}
            >
              ← Volver
            </button>
          </>
        )}

        {service && step !== "home" && (
          <section className="pb-card pb-chosen">
            <div className="pb-chosen__row">
              <div>
                <p className="pb-chosen__name">{service.name}</p>
                <p className="pb-muted">
                  {[priceRange(service), durationRange(service)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className="pb-link" onClick={() => setStep("home")}>
                Cambiar
              </button>
            </div>
            {varies(service) && (
              <p className="pb-chosen__note">
                El precio final depende del tamaño y el pelaje de tu perro: lo confirmamos cuando lo recibimos.
              </p>
            )}
          </section>
        )}

        {step === "time" && (
          <section className="pb-card">
            <h2 className="pb-card__title">Elegí día y hora</h2>
            {daysError && (
              <p className="pb-error">
                {daysError}{" "}
                <button type="button" className="pb-link" onClick={() => loadDays(undefined, false)}>Reintentar</button>
              </p>
            )}
            {days.length > 0 && (
              <>
                <p className="pb-month">{formatMonthName(date || days[0].date)}</p>
                <div className="pb-days" role="listbox" aria-label="Días">
                  {days.map((d) => {
                    const available = d.slots.length > 0;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        role="option"
                        aria-selected={d.date === date}
                        className={`pb-day${d.date === date ? " is-selected" : ""}`}
                        disabled={!available}
                        onClick={() => { setDate(d.date); setTime(null); }}
                      >
                        <span className="pb-day__wd">{formatWeekdayShort(d.date)}</span>
                        <span className="pb-day__num">{Number(d.date.slice(8))}</span>
                      </button>
                    );
                  })}
                  {hasMoreDays && (
                    <button type="button" className="pb-day pb-day--more" disabled={daysLoading} onClick={loadMoreDays}>
                      <span className="pb-day__wd">Más</span>
                      <span className="pb-day__num">→</span>
                    </button>
                  )}
                </div>
              </>
            )}
            {daysLoading && days.length === 0 && <p className="pb-muted">Buscando horarios libres…</p>}
            {!daysLoading && !daysError && days.length > 0 && !date && (
              <p className="pb-muted">No quedan horarios libres en estos días. Probá con “Más” o escribinos por WhatsApp.</p>
            )}
            {selectedDay && (
              <div className="pb-slots">
                <p className="pb-slots__date">{formatLongDate(selectedDay.date)}</p>
                {groupSlots(selectedDay.slots).map((group) => (
                  <div key={group.key} className="pb-slots__group">
                    <h3 className="pb-label">{group.label}</h3>
                    <div className="pb-slots__grid">
                      {group.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`pb-slot${slot === time ? " is-selected" : ""}`}
                          aria-pressed={slot === time}
                          onClick={() => setTime(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="pb-rule">
              Podés reservar hasta con {page.rules.max_days_ahead} días de anticipación.
            </p>
          </section>
        )}

        {step === "data" && (
          <section className="pb-card">
            <h2 className="pb-card__title">Tus datos</h2>
            <form className="pb-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <label className="pb-field">
                <span>Celular *</span>
                <input
                  type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej: 381 555-1234"
                  value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                />
                <small>Con característica, sin 0 ni 15.</small>
              </label>
              <label className="pb-field">
                <span>Tu nombre *</span>
                <input
                  type="text" autoComplete="name"
                  value={form.owner_name} onChange={(e) => setField("owner_name", e.target.value)}
                />
              </label>
              <div className="pb-form__row">
                <label className="pb-field">
                  <span>Nombre de tu perro *</span>
                  <input type="text" value={form.pet_name} onChange={(e) => setField("pet_name", e.target.value)} />
                </label>
                <label className="pb-field">
                  <span>Raza</span>
                  <input type="text" placeholder="Opcional" value={form.breed} onChange={(e) => setField("breed", e.target.value)} />
                </label>
              </div>
              <label className="pb-field">
                <span>Email</span>
                <input
                  type="email" autoComplete="email" placeholder="Opcional: te mandamos la confirmación"
                  value={form.email} onChange={(e) => setField("email", e.target.value)}
                />
              </label>
              <label className="pb-field">
                <span>Algo que tengamos que saber</span>
                <textarea
                  rows={2} maxLength={500} placeholder="Ej: es nervioso con el secador"
                  value={form.notes} onChange={(e) => setField("notes", e.target.value)}
                />
              </label>
              {/* Campo trampa para bots: no se ve ni se puede tabular. */}
              <input
                className="pb-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={form.website} onChange={(e) => setField("website", e.target.value)}
              />
              {page.rules.cancellation_policy && (
                <div className="pb-policy">
                  <strong>Política de cancelación</strong>
                  <p>{page.rules.cancellation_policy}</p>
                </div>
              )}
              <label className="pb-check">
                <input
                  type="checkbox" checked={form.accept_policy}
                  onChange={(e) => setField("accept_policy", e.target.checked)}
                />
                <span>
                  {page.rules.cancellation_policy
                    ? "Leí y acepto la política de cancelación."
                    : `Si no puedo venir, aviso con ${page.rules.cancel_hours} horas de anticipación.`}
                </span>
              </label>
              {formError && <p className="pb-error" role="alert">{formError}</p>}
              <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
          </section>
        )}
      </div>

      {barAction && service && (
        <div className="pb-bar">
          <div className="pb-bar__inner">
            <div className="pb-bar__summary">
              <strong>{service.name}</strong>
              <span>
                {date && time ? `${formatLongDate(date)} · ${time}` : "Elegí día y horario"}
                {priceRange(service) ? ` · ${priceRange(service)}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="pb-btn pb-btn--primary"
              disabled={barAction.disabled}
              onClick={barAction.onClick}
            >
              {barAction.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
