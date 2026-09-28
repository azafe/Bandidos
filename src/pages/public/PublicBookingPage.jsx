// src/pages/public/PublicBookingPage.jsx
// Página pública de reservas (/reservar/:slug), rediseño v2.0.
// La usa el cliente del local desde el celular, sin login: elige servicio,
// día y horario libre, deja sus datos y confirma. El tamaño del perro no se
// elige: lo define la peluquería al recibirlo.
//
// El estado del flujo vive en la URL (?s=servicio&d=día&t=hora&p=datos) para
// que el botón "atrás" del navegador funcione paso a paso.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { createReservation, getAvailability, getBookingPage } from "../../services/publicBookingApi";
import { accentStyle } from "../../lib/booking/accent";
import {
  addDaysISO,
  argentinaToday,
  dayChipParts,
  formatDurationRange,
  formatLongDate,
  formatLongDateCap,
  formatPriceRange,
  formatShortDate,
  groupSlots,
  isSinglePrice,
  isValidArPhone,
  mapsLink,
  normalizeArPhone,
  weekdayOf,
  whatsappLink,
} from "../../lib/booking/format";
import { buildIcs, downloadIcs } from "../../lib/booking/ics";
import {
  BottomSheet,
  Button,
  DayChip,
  Field,
  Notice,
  PawWatermark,
  PoweredBy,
  ShopAvatar,
  StepIndicator,
  TimeSlot,
} from "../../components/booking/BookingUI";
import Celebration from "../../components/booking/Celebration";
import {
  BackIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  InfoIcon,
  PawIcon,
  PinIcon,
  WhatsAppIcon,
} from "../../components/booking/Icons";
import "../../styles/booking-ui.css";

const DAYS_PER_PAGE = 14;
const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const EMPTY_FORM = { phone: "", owner_name: "", pet_name: "", breed: "", email: "", notes: "", accept_policy: false, website: "" };
const storageKey = (slug) => `bandidos_reserva_${slug}`;

function loadSavedForm(slug) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(slug)) || "null");
    return saved ? { ...EMPTY_FORM, ...saved, accept_policy: false, website: "" } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
}

function saveForm(slug, form) {
  try {
    const { phone, owner_name, pet_name, breed, email } = form;
    window.localStorage.setItem(storageKey(slug), JSON.stringify({ phone, owner_name, pet_name, breed, email }));
  } catch {
    /* sin localStorage: la próxima vez se completa a mano */
  }
}

function validateField(name, form) {
  switch (name) {
    case "phone":
      if (!form.phone.trim()) return "Necesitamos tu celular para confirmarte el turno.";
      if (!isValidArPhone(form.phone)) return "Parece que falta un número. Escribilo sin el 15, por ejemplo: 11 2345 6789.";
      return null;
    case "owner_name":
      return form.owner_name.trim() ? null : "¿Cómo te llamás? Así te saludamos cuando llegues.";
    case "pet_name":
      return form.pet_name.trim() ? null : "¿Cómo se llama tu perro? Lo necesitamos para recibirlo.";
    case "email":
      return !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ? null
        : "Revisá el email: parece que le falta algo.";
    case "accept_policy":
      return form.accept_policy ? null : "Para reservar tenés que aceptar la política.";
    default:
      return null;
  }
}

const REQUIRED_FIELDS = ["phone", "owner_name", "pet_name", "email", "accept_policy"];

// Detecta el teclado del celular abierto con visualViewport.
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(hidden > 120 ? hidden : 0);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return offset;
}

// ── Piezas de la página ───────────────────────────────────────────────────

function HoursList({ hours }) {
  const todayWeekday = weekdayOf(argentinaToday());
  return (
    <ul className="bk-hours">
      {WEEK_ORDER.map((weekday) => {
        const ranges = hours.filter((h) => h.weekday === weekday);
        return (
          <li key={weekday} className={weekday === todayWeekday ? "is-today" : ""}>
            <span className="bk-hours__day">
              {WEEKDAY_NAMES[weekday]}
              {weekday === todayWeekday ? " (hoy)" : ""}
            </span>
            <span className="bk-hours__time">
              {ranges.length ? ranges.map((r) => `${r.start_time} a ${r.end_time}`).join(" · ") : "Cerrado"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ServiceCard({ service, onReserve }) {
  const [open, setOpen] = useState(false);
  const long = (service.description || "").length > 90;
  const single = isSinglePrice(service);
  return (
    <article className="bk-service">
      <h3 className="bk-service__name">{service.name}</h3>
      {service.description && (
        <>
          <p className={`bk-service__desc${open ? " is-open" : ""}`}>{service.description}</p>
          {long && !open && (
            <button type="button" className="bk-link bk-service__more" onClick={() => setOpen(true)}>
              Ver más
            </button>
          )}
        </>
      )}
      <div className="bk-service__foot">
        <div>
          {service.price_from !== null && (
            <strong className="bk-service__price">{formatPriceRange(service.price_from, service.price_to)}</strong>
          )}
          <span className="bk-service__meta">
            <ClockIcon size={13} />
            {formatDurationRange(service.duration_min, service.duration_max)} · {single ? "precio único" : "según tamaño"}
          </span>
        </div>
        <Button onClick={() => onReserve(service.id)} aria-label={`Reservar ${service.name}`}>
          Reservar
        </Button>
      </div>
    </article>
  );
}

function MonthCalendar({ days, selected, onSelect }) {
  const months = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      const key = d.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    return [...map.entries()];
  }, [days]);

  return months.map(([key, list]) => {
    const first = list[0].date;
    const lead = (weekdayOf(`${key}-01`) + 6) % 7; // lunes primero
    const byDate = new Map(list.map((d) => [d.date, d]));
    const [y, m] = key.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push(<span key={`e${i}`} />);
    for (let day = 1; day <= lastDay; day += 1) {
      const iso = `${key}-${String(day).padStart(2, "0")}`;
      const info = byDate.get(iso);
      if (!info) {
        cells.push(<span key={iso} />);
        continue;
      }
      const disabled = info.status !== "open";
      cells.push(
        <button
          key={iso}
          type="button"
          className={`bk-month__day${disabled ? " is-disabled" : ""}${iso === selected ? " is-selected" : ""}`}
          aria-disabled={disabled}
          aria-pressed={iso === selected}
          aria-label={formatLongDate(iso)}
          onClick={() => !disabled && onSelect(iso)}
        >
          {day}
        </button>
      );
    }
    return (
      <div key={key} className="bk-month">
        <p className="bk-month__title">{formatLongDate(first).split(" de ").pop()}</p>
        <div className="bk-month__grid">
          {["L", "M", "M", "J", "V", "S", "D"].map((wd, i) => (
            <span key={i} className="bk-month__wd">{wd}</span>
          ))}
          {cells}
        </div>
      </div>
    );
  });
}

function NotFound() {
  return (
    <div className="bk-page">
      <div className="bk-center">
        <div className="bk-lost" aria-hidden="true">
          <PawIcon size={30} style={{ transform: "rotate(-20deg) translateY(10px)" }} />
          <PawIcon size={30} style={{ transform: "rotate(10deg)" }} />
          <span className="bk-lost__q">?</span>
        </div>
        <h1 className="bk-center__title">No encontramos esta página</h1>
        <p className="bk-center__text">
          Seguimos el rastro pero no hay nada acá. Puede que el link esté mal escrito: pedile a la peluquería que te lo mande de nuevo.
        </p>
        <PoweredBy />
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const serviceId = params.get("s");
  const date = params.get("d");
  const time = params.get("t");
  const onDataStep = params.get("p") === "datos";

  const [page, setPage] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [showHours, setShowHours] = useState(false);

  const [days, setDays] = useState([]);
  const [daysFor, setDaysFor] = useState(null);
  const [daysLoading, setDaysLoading] = useState(false);
  const [daysError, setDaysError] = useState(false);
  const [hasMoreDays, setHasMoreDays] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [form, setForm] = useState(() => loadSavedForm(slug));
  const [errors, setErrors] = useState({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [slotTaken, setSlotTaken] = useState(null); // { time, alternatives }
  const [reservation, setReservation] = useState(null);

  const barRef = useRef(null);
  const pageRef = useRef(null);
  const keyboardOffset = useKeyboardOffset();

  // ── Carga del local ─────────────────────────────────────────────────
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
    () => (serviceId ? page?.services?.find((s) => s.id === serviceId) ?? null : null),
    [page, serviceId]
  );
  const step = !service ? "home" : onDataStep && date && time ? "data" : "time";

  const updateParams = useCallback(
    (changes, { replace = false } = {}) => {
      const next = new URLSearchParams(params);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      });
      setParams(next, { replace });
      if (!replace) window.scrollTo({ top: 0 });
    },
    [params, setParams]
  );

  // ── Disponibilidad ──────────────────────────────────────────────────
  const loadDays = useCallback(
    async (id, from, append) => {
      setDaysLoading(true);
      setDaysError(false);
      try {
        const data = await getAvailability(slug, { serviceTypeId: id, from, days: DAYS_PER_PAGE });
        setDays((prev) => (append ? [...prev, ...data.days] : data.days));
        setDaysFor(id);
        setHasMoreDays(data.days.length === DAYS_PER_PAGE);
        return data.days;
      } catch {
        setDaysError(true);
        return null;
      } finally {
        setDaysLoading(false);
      }
    },
    [slug]
  );

  // Al elegir un servicio (o entrar con ?s= en la URL) se busca la disponibilidad.
  useEffect(() => {
    if (!service || daysFor === service.id || daysLoading || daysError) return;
    loadDays(service.id);
  }, [service, daysFor, daysLoading, daysError, loadDays]);

  // Por defecto queda elegido el primer día con lugar.
  useEffect(() => {
    if (step !== "time" || daysFor !== service?.id || !days.length) return;
    if (date && days.some((d) => d.date === date)) return;
    const firstOpen = days.find((d) => d.status === "open");
    if (firstOpen) updateParams({ d: firstOpen.date, t: null }, { replace: true });
  }, [step, days, daysFor, service, date, updateParams]);

  async function loadAllDays() {
    // "Más fechas": completa hasta la anticipación máxima para el calendario.
    let current = days;
    const limit = addDaysISO(argentinaToday(), page.rules.max_days_ahead);
    while (current.length && current[current.length - 1].date < limit) {
      const more = await loadDays(service.id, addDaysISO(current[current.length - 1].date, 1), true);
      if (!more || !more.length) break;
      current = [...current, ...more];
      if (more.length < DAYS_PER_PAGE) break;
    }
    setHasMoreDays(false);
  }

  function openCalendar() {
    setCalendarOpen(true);
    if (hasMoreDays) loadAllDays();
  }

  // ── Barra inferior: su alto se reserva abajo del contenido ───────────
  useEffect(() => {
    const bar = barRef.current;
    const root = pageRef.current;
    if (!bar || !root) return undefined;
    const update = () => root.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  });

  // ── Formulario ──────────────────────────────────────────────────────
  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (errors[name]) setErrors((e) => ({ ...e, [name]: validateField(name, next) }));
      return next;
    });
    setSubmitError("");
  }

  function blurField(name) {
    setErrors((e) => ({ ...e, [name]: validateField(name, form) }));
  }

  function validateAll() {
    const next = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, validateField(f, form)]));
    setErrors(next);
    const missing = REQUIRED_FIELDS.filter((f) => next[f]);
    setShowErrorSummary(missing.length > 0);
    if (missing.length) {
      const first = document.getElementById(`bk-${missing[0]}`);
      first?.focus();
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return missing.length === 0;
  }

  async function submit(overrideTime) {
    if (!validateAll()) return;
    const chosenTime = overrideTime || time;
    setSubmitting(true);
    setSubmitError("");
    saveForm(slug, form);
    try {
      const created = await createReservation(slug, {
        service_type_id: service.id,
        date,
        time: chosenTime,
        owner_name: form.owner_name.trim(),
        phone: normalizeArPhone(form.phone),
        pet_name: form.pet_name.trim(),
        breed: form.breed.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        accept_policy: true,
        website: form.website,
      });
      setSlotTaken(null);
      setReservation({ ...created, service });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err?.status === 409) {
        setSlotTaken({ time: chosenTime, alternatives: err.payload?.alternatives || [] });
        setDaysFor(null); // la disponibilidad cambió: se vuelve a pedir
      } else if (err?.status === 429) {
        setSubmitError("Ya tenés varias reservas activas o hiciste muchos intentos. Escribinos por WhatsApp y te ayudamos.");
      } else if (err?.status === 400) {
        setSubmitError("Revisá los datos: el email o el celular no parecen válidos.");
      } else {
        setSubmitError("No pudimos confirmar la reserva. Revisá tu conexión y probá de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function chooseAlternative(slot) {
    updateParams({ t: slot }, { replace: true });
    submit(slot);
  }

  // ── Estados de carga ────────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="bk-page">
        <div className="bk-center">
          <p className="bk-loading-text"><PawIcon size={16} /> Cargando…</p>
        </div>
      </div>
    );
  }
  if (loadState === "not_found") return <NotFound />;
  if (loadState === "error") {
    return (
      <div className="bk-page">
        <div className="bk-center">
          <h1 className="bk-center__title">Algo salió mal</h1>
          <p className="bk-center__text">Revisá tu conexión y probá recargar la página.</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const { business, rules, hours } = page;
  const themeStyle = accentStyle(business.primary_color);
  const pageClass = `bk-page${business.primary_color ? " has-brand" : ""}`;
  const waGeneric = whatsappLink(business.whatsapp, "¡Hola! Quería sacar un turno.");

  // ── Reservas apagadas ───────────────────────────────────────────────
  if (!page.enabled) {
    return (
      <div className={pageClass} style={themeStyle}>
        <div className="bk-center">
          <ShopAvatar name={business.name} logoUrl={business.logo_url} size={76} />
          <p className="bk-center__name">{business.name}</p>
          <h1 className="bk-center__title">Por ahora no tomamos reservas online</h1>
          <p className="bk-center__text">Escribinos por WhatsApp y te buscamos un lugar para tu perro.</p>
          {waGeneric && (
            <Button variant="whatsapp" size="lg" href={waGeneric}>
              <WhatsAppIcon /> Escribinos por WhatsApp
            </Button>
          )}
          {business.address && (
            <Button variant="secondary" href={mapsLink(business.address)}>
              Ver dirección
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Confirmación ────────────────────────────────────────────────────
  if (reservation) {
    const r = reservation;
    const svc = r.service;
    const firstName = r.owner_name.split(" ")[0];
    const managePath = `/reservar/${slug}/turno/${r.token}`;
    const wa = whatsappLink(
      business.whatsapp,
      `¡Hola! Reservé un turno para ${r.pet_name} el ${formatLongDate(r.date)} a las ${r.time}.`
    );
    const addToCalendar = () =>
      downloadIcs(
        `turno-${r.pet_name.toLowerCase().replace(/\s+/g, "-")}.ics`,
        buildIcs({
          uid: r.token,
          title: `${r.service_name} · ${r.pet_name} (${business.name})`,
          description: `Turno en ${business.name}. Si no podés venir: ${window.location.origin}${managePath}`,
          location: business.address,
          date: r.date,
          time: r.time,
          duration: r.duration,
        })
      );

    return (
      <div className={pageClass} style={themeStyle} ref={pageRef}>
        <div className="bk-wrap bk-done">
          <Celebration accent={themeStyle["--accent"]} />
          <h1 className="bk-done__title">¡Listo, {firstName}!</h1>
          <p className="bk-done__lead">
            Te esperamos con <strong>{r.pet_name}</strong> el <strong>{formatLongDate(r.date)}</strong> a las{" "}
            <strong>{r.time}</strong>.
          </p>
          <dl className="bk-details">
            <div><dt>Servicio</dt><dd>{r.service_name}</dd></div>
            <div><dt>Duración</dt><dd>{formatDurationRange(svc.duration_min, svc.duration_max)}</dd></div>
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
            {svc.price_from !== null && (
              <div>
                <dt>Precio</dt>
                <dd>
                  {r.price !== null ? formatPriceRange(r.price) : formatPriceRange(svc.price_from, svc.price_to)}
                  {!isSinglePrice(svc) && r.price === null && <small>según tamaño, se confirma en el local</small>}
                </dd>
              </div>
            )}
          </dl>
          <div className="bk-actions">
            <Button size="lg" onClick={addToCalendar}>
              <CalendarIcon size={18} /> Agregar a mi calendario
            </Button>
            {wa && (
              <Button variant="whatsapp-outline" size="lg" href={wa}>
                <WhatsAppIcon /> Escribinos por WhatsApp
              </Button>
            )}
          </div>
          <p className="bk-cancel-hint">
            {r.can_cancel ? (
              <>
                <a className="bk-link" href={managePath}>Cancelá tu turno</a>
                <br />
                Podés hacerlo hasta el {formatLongDate(r.cancel_until.date).split(" ").slice(0, 2).join(" ")} a las{" "}
                {r.cancel_until.time}.
              </>
            ) : (
              <>
                Si no podés venir, avisanos por WhatsApp. <a className="bk-link" href={managePath}>Ver mi turno</a>
              </>
            )}
          </p>
          <button
            type="button"
            className="bk-link bk-again"
            onClick={() => {
              setReservation(null);
              setForm((prev) => ({ ...prev, pet_name: "", breed: "", notes: "", accept_policy: false }));
              setParams(new URLSearchParams());
            }}
          >
            Reservar otro turno
          </button>
        </div>
      </div>
    );
  }

  // ── Portada ─────────────────────────────────────────────────────────
  if (step === "home") {
    return (
      <div className={pageClass} style={themeStyle}>
        <div className="bk-wrap bk-home">
          <header className="bk-hero">
            <PawWatermark />
            <div className="bk-hero__brand">
              <ShopAvatar name={business.name} logoUrl={business.logo_url} size={60} />
              <div>
                <h1 className="bk-hero__name">{business.name}</h1>
                {business.address && (
                  <p className="bk-hero__address">
                    <PinIcon size={14} /> {business.address}
                  </p>
                )}
              </div>
            </div>
            <div className="bk-hero__actions">
              {waGeneric && (
                <Button variant="whatsapp" href={waGeneric}>
                  <WhatsAppIcon /> WhatsApp
                </Button>
              )}
              {hours.length > 0 && (
                <Button
                  variant={showHours ? "dark" : "secondary"}
                  className="bk-hide-desktop"
                  onClick={() => setShowHours((v) => !v)}
                  aria-expanded={showHours}
                >
                  {showHours ? "Ocultar horarios" : "Ver horarios"} <ChevronDownIcon up={showHours} />
                </Button>
              )}
            </div>
            {hours.length > 0 && (
              <div className={showHours ? "" : "bk-hours-desktop-only"}>
                <HoursList hours={hours} />
                {rules.cancel_hours > 0 && (
                  <p className="bk-rule">Cancelás sin costo hasta {rules.cancel_hours} h antes.</p>
                )}
              </div>
            )}
          </header>

          <main>
            <h2 className="bk-home__title">¿Qué necesita tu perro?</h2>
            <p className="bk-home__subtitle">Elegí un servicio y reservá en menos de un minuto.</p>
            {page.services.length === 0 ? (
              <Notice variant="info">Todavía no hay servicios para reservar online. Escribinos por WhatsApp.</Notice>
            ) : (
              <div className="bk-services">
                {page.services.map((s) => (
                  <ServiceCard key={s.id} service={s} onReserve={(id) => updateParams({ s: id, d: null, t: null, p: null })} />
                ))}
              </div>
            )}
            <PoweredBy />
          </main>
        </div>
      </div>
    );
  }

  // ── Pasos: día y hora / tus datos ───────────────────────────────────
  const priceText = formatPriceRange(service.price_from, service.price_to);
  const single = isSinglePrice(service);
  const selectedDay = days.find((d) => d.date === date) || null;
  const nextOpen = selectedDay ? days.find((d) => d.date > selectedDay.date && d.status === "open") : null;
  const errorCount = REQUIRED_FIELDS.filter((f) => errors[f]).length;
  const whenText = date && time ? `${formatShortDate(date)} · ${time} h` : null;
  const priceLine = priceText ? `${priceText}${single ? "" : " · se confirma en el local"}` : "Precio a confirmar en el local";

  const barAction =
    step === "time"
      ? {
          label: time ? "Continuar" : "Elegí un horario para seguir",
          disabled: !time,
          onClick: () => updateParams({ p: "datos" }),
        }
      : {
          label: submitting ? "Reservando…" : "Confirmar reserva",
          disabled: submitting,
          softDisabled: REQUIRED_FIELDS.some((f) => validateField(f, form)),
          onClick: () => submit(),
        };

  const summaryButton = (extraClass = "") => (
    <Button
      size="lg"
      className={`bk-btn--block ${extraClass}`}
      disabled={barAction.disabled}
      aria-disabled={barAction.softDisabled || undefined}
      onClick={barAction.onClick}
    >
      {barAction.label}
    </Button>
  );

  return (
    <div className={pageClass} style={themeStyle} ref={pageRef}>
      <div className="bk-wrap">
        <div className="bk-topbar">
          <button
            type="button"
            className="bk-back"
            aria-label="Volver"
            onClick={() => (step === "data" ? updateParams({ p: null }) : updateParams({ s: null, d: null, t: null }))}
          >
            <BackIcon />
          </button>
          <ShopAvatar name={business.name} logoUrl={business.logo_url} size={30} />
          <span className="bk-topbar__name">{business.name}</span>
        </div>
        <StepIndicator step={step} />

        <div className="bk-flow">
          <div className="bk-flow__main">
            {step === "time" && (
              <>
                <section className="bk-card bk-chosen bk-hide-desktop">
                  <div className="bk-chosen__row">
                    <div>
                      <p className="bk-chosen__name">{service.name}</p>
                      <p className="bk-chosen__meta">
                        {[priceText, formatDurationRange(service.duration_min, service.duration_max)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button type="button" className="bk-link" onClick={() => updateParams({ s: null, d: null, t: null })}>
                      Cambiar
                    </button>
                  </div>
                  {!single && (
                    <Notice variant="info">
                      El precio final depende del tamaño y el pelaje de tu perro: lo confirmamos cuando lo recibimos.
                    </Notice>
                  )}
                </section>

                <div className="bk-section-head">
                  <h2 className="bk-section-title">Elegí el día</h2>
                  <button type="button" className="bk-more-dates" onClick={openCalendar}>
                    <CalendarIcon /> Más fechas
                  </button>
                </div>

                {daysError && (
                  <Notice variant="error" role="alert">
                    <strong>No pudimos cargar los horarios.</strong> Revisá tu conexión y probá de nuevo.
                    <div style={{ marginTop: 10 }}>
                      <Button variant="ghost" size="sm" onClick={() => loadDays(service.id)}>Reintentar</Button>
                    </div>
                  </Notice>
                )}

                {days.length > 0 && daysFor === service.id && (
                  <div className="bk-days" role="group" aria-label="Días">
                    {days.slice(0, Math.max(DAYS_PER_PAGE, days.findIndex((d) => d.date === date) + 1)).map((d) => {
                      const parts = dayChipParts(d.date);
                      return (
                        <DayChip
                          key={d.date}
                          {...parts}
                          status={d.status}
                          selected={d.date === date}
                          onSelect={() => updateParams({ d: d.date, t: null }, { replace: true })}
                        />
                      );
                    })}
                  </div>
                )}
                <p className="bk-rule">
                  <InfoIcon size={14} /> Podés reservar hasta con {rules.max_days_ahead} días de anticipación.
                </p>

                <div className="bk-section-head">
                  <h2 className="bk-section-title">Elegí el horario</h2>
                </div>

                {(daysLoading && daysFor !== service.id) || (!days.length && !daysError) ? (
                  <div aria-busy="true">
                    <div className="bk-skeleton bk-skeleton--line" />
                    <div className="bk-slots">
                      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bk-skeleton bk-skeleton--slot" />)}
                    </div>
                    <p className="bk-loading-text"><PawIcon size={14} /> Buscando horarios libres…</p>
                  </div>
                ) : selectedDay && selectedDay.slots.length > 0 ? (
                  <>
                    <p className="bk-section-sub">
                      {formatLongDateCap(selectedDay.date)} · {selectedDay.slots.length}{" "}
                      {selectedDay.slots.length === 1 ? "horario libre" : "horarios libres"}
                    </p>
                    {groupSlots(selectedDay.slots).map((group) => (
                      <div key={group.key} className="bk-slot-group">
                        <p className="bk-slot-group__label">
                          {group.label}<span>{group.range}</span>
                        </p>
                        <div className="bk-slots">
                          {group.slots.map((slot) => (
                            <TimeSlot
                              key={slot}
                              time={slot}
                              selected={slot === time}
                              onSelect={() => updateParams({ t: slot }, { replace: true })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : !daysError && days.length > 0 ? (
                  <div className="bk-card bk-empty">
                    <div className="bk-empty__icon"><PawIcon size={26} /></div>
                    <p className="bk-empty__title">
                      {selectedDay
                        ? `El ${formatLongDate(selectedDay.date).split(" ").slice(0, 2).join(" ")} ya está completo`
                        : "No quedan horarios libres en estos días"}
                    </p>
                    <p className="bk-empty__text">Probá con otro día o escribinos por WhatsApp.</p>
                    {nextOpen && (
                      <Button className="bk-btn--block" onClick={() => updateParams({ d: nextOpen.date, t: null }, { replace: true })}>
                        Ver el {formatLongDate(nextOpen.date).split(" ").slice(0, 2).join(" ")} ({nextOpen.slots.length} libres)
                      </Button>
                    )}
                    {waGeneric && (
                      <Button variant="whatsapp-outline" className="bk-btn--block" href={waGeneric}>
                        Escribinos por WhatsApp
                      </Button>
                    )}
                  </div>
                ) : null}
              </>
            )}

            {step === "data" && (
              <>
                <h2 className="bk-form-title">Contanos de vos y de tu perro</h2>
                {showErrorSummary && errorCount > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Notice variant="error" role="alert">
                      Te {errorCount === 1 ? "falta" : "faltan"} <strong>{errorCount} {errorCount === 1 ? "dato" : "datos"}</strong> para confirmar. Ya casi.
                    </Notice>
                  </div>
                )}
                <form className="bk-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
                  <Field label="Celular" required htmlFor="bk-phone" help="Con característica, sin 0 ni 15." error={errors.phone}>
                    <div className="bk-phone">
                      <span className="bk-phone__prefix">+54 9</span>
                      <input
                        id="bk-phone" className="bk-input" type="tel" inputMode="tel" autoComplete="tel-national"
                        placeholder="11 2345 6789" value={form.phone}
                        aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "bk-phone-error" : undefined}
                        onChange={(e) => setField("phone", e.target.value)} onBlur={() => blurField("phone")}
                      />
                    </div>
                  </Field>
                  <Field label="Tu nombre" required htmlFor="bk-owner_name" error={errors.owner_name}>
                    <input
                      id="bk-owner_name" className="bk-input" type="text" autoComplete="name" value={form.owner_name}
                      aria-invalid={Boolean(errors.owner_name)}
                      onChange={(e) => setField("owner_name", e.target.value)} onBlur={() => blurField("owner_name")}
                    />
                  </Field>
                  <div className="bk-form__row">
                    <Field label="Tu perro" required htmlFor="bk-pet_name" error={errors.pet_name}>
                      <input
                        id="bk-pet_name" className="bk-input" type="text" value={form.pet_name}
                        aria-invalid={Boolean(errors.pet_name)}
                        onChange={(e) => setField("pet_name", e.target.value)} onBlur={() => blurField("pet_name")}
                      />
                    </Field>
                    <Field label="Raza" optional htmlFor="bk-breed">
                      <input id="bk-breed" className="bk-input" type="text" value={form.breed} onChange={(e) => setField("breed", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Email" optional htmlFor="bk-email" help="Te mandamos la confirmación." error={errors.email}>
                    <input
                      id="bk-email" className="bk-input" type="email" autoComplete="email" inputMode="email"
                      placeholder="nombre@email.com" value={form.email} aria-invalid={Boolean(errors.email)}
                      onChange={(e) => setField("email", e.target.value)} onBlur={() => blurField("email")}
                    />
                  </Field>
                  <Field label="Algo que tengamos que saber" optional htmlFor="bk-notes">
                    <textarea
                      id="bk-notes" className="bk-textarea" rows={3} maxLength={500}
                      placeholder="Ej: es nervioso con el secador" value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                    />
                  </Field>
                  <input
                    className="bk-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    value={form.website} onChange={(e) => setField("website", e.target.value)}
                  />
                  <div className={`bk-field${errors.accept_policy ? " has-error" : ""}`}>
                    <div className="bk-policy">
                      <p className="bk-policy__title">Política de cancelación</p>
                      <p className="bk-policy__text">
                        {rules.cancellation_policy ||
                          `Si no podés venir, avisanos con ${rules.cancel_hours} horas de anticipación.`}
                      </p>
                      <label className="bk-check" htmlFor="bk-accept_policy">
                        <input
                          id="bk-accept_policy" type="checkbox" checked={form.accept_policy}
                          onChange={(e) => { setField("accept_policy", e.target.checked); setErrors((er) => ({ ...er, accept_policy: null })); }}
                        />
                        Leí y acepto la política
                      </label>
                    </div>
                    {errors.accept_policy && <p className="bk-field__error">{errors.accept_policy}</p>}
                  </div>
                  {submitError && <Notice variant="error" role="alert">{submitError}</Notice>}
                  <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                </form>
              </>
            )}
          </div>

          {/* Escritorio: resumen lateral en lugar de la barra inferior. */}
          <aside className="bk-card bk-summary-card">
            <p className="bk-summary-card__label">TU RESERVA</p>
            <div className="bk-chosen__row">
              <div>
                <p className="bk-chosen__name">{service.name}</p>
                <p className="bk-chosen__meta">{formatDurationRange(service.duration_min, service.duration_max)}</p>
              </div>
              <button type="button" className="bk-link" onClick={() => updateParams({ s: null, d: null, t: null, p: null })}>
                Cambiar
              </button>
            </div>
            <dl className="bk-details" style={{ marginTop: 12 }}>
              <div><dt>Día y hora</dt><dd>{whenText || "—"}</dd></div>
              <div><dt>Precio</dt><dd>{priceText || "A confirmar"}</dd></div>
            </dl>
            {!single && (
              <Notice variant="info" icon={false}>
                El precio final depende del tamaño y el pelaje de tu perro: lo confirmamos cuando lo recibimos.
              </Notice>
            )}
            {summaryButton()}
          </aside>
        </div>
      </div>

      <div
        className={`bk-bar${keyboardOffset ? " is-compact" : ""}`}
        ref={barRef}
        style={keyboardOffset ? { bottom: keyboardOffset } : undefined}
      >
        <div className="bk-bar__inner">
          <div className="bk-bar__text">
            <p className="bk-bar__line1">
              {keyboardOffset ? whenText || service.name : [service.name, whenText].filter(Boolean).join(" · ")}
            </p>
            <p className="bk-bar__line2">{keyboardOffset ? service.name : priceLine}</p>
          </div>
          {summaryButton()}
        </div>
      </div>

      <BottomSheet open={calendarOpen} onClose={() => setCalendarOpen(false)} labelledBy="bk-cal-title">
        <h2 className="bk-sheet__title" id="bk-cal-title">Elegí una fecha</h2>
        <p className="bk-sheet__text">Podés reservar hasta con {rules.max_days_ahead} días de anticipación.</p>
        {daysLoading && hasMoreDays && <p className="bk-loading-text"><PawIcon size={14} /> Buscando fechas…</p>}
        <MonthCalendar
          days={days}
          selected={date}
          onSelect={(iso) => {
            updateParams({ d: iso, t: null }, { replace: true });
            setCalendarOpen(false);
          }}
        />
      </BottomSheet>

      <BottomSheet open={Boolean(slotTaken)} onClose={() => setSlotTaken(null)} labelledBy="bk-taken-title">
        {slotTaken && (
          <>
            <div className="bk-sheet__icon"><ClockIcon size={26} /></div>
            <h2 className="bk-sheet__title" id="bk-taken-title">
              ¡Uy! Alguien reservó las {slotTaken.time} justo antes que vos
            </h2>
            <p className="bk-sheet__text">
              No perdiste nada: tus datos quedan guardados.
              {slotTaken.alternatives.length > 0 && ` Elegí otro horario del ${formatLongDate(date).split(" ").slice(0, 2).join(" ")} y listo.`}
            </p>
            {slotTaken.alternatives.length > 0 && (
              <div className="bk-sheet__slots">
                {slotTaken.alternatives.map((slot) => (
                  <TimeSlot key={slot} time={slot} selected={false} onSelect={() => chooseAlternative(slot)} />
                ))}
              </div>
            )}
            <Button
              size="lg"
              className="bk-btn--block"
              onClick={() => {
                setSlotTaken(null);
                updateParams({ t: null, p: null });
              }}
            >
              Ver todos los horarios
            </Button>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
