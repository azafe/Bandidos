// src/pages/booking/BookingSettingsPage.jsx
// Configuración de la web de reservas: link público, reglas, datos de la
// portada, horario de atención y días cerrados. Solo para admin.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addClosedDay,
  bookingPublicUrl,
  copyToClipboard,
  getBookingConfig,
  removeClosedDay,
  saveBookingHours,
  saveBookingSettings,
} from "../../services/bookingApi";
import { showApiError } from "../../utils/errorDialog";
import "../../styles/booking.css";

// Lunes primero, como se lee una semana de trabajo. weekday: 0 = domingo.
const WEEK = [
  { weekday: 1, label: "Lunes" },
  { weekday: 2, label: "Martes" },
  { weekday: 3, label: "Miércoles" },
  { weekday: 4, label: "Jueves" },
  { weekday: 5, label: "Viernes" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

const DEFAULT_RANGE = { start_time: "09:00", end_time: "18:00" };

const MIN_NOTICE_OPTIONS = [
  { value: 0, label: "Sin mínimo" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 240, label: "4 horas antes" },
  { value: 720, label: "12 horas antes" },
  { value: 1440, label: "1 día antes" },
  { value: 2880, label: "2 días antes" },
];
const MAX_DAYS_OPTIONS = [7, 14, 21, 30, 45, 60, 90];
const CANCEL_HOURS_OPTIONS = [0, 2, 6, 12, 24, 48, 72];
const INTERVAL_OPTIONS = [15, 30, 60];

function hoursToWeek(hours) {
  return Object.fromEntries(
    WEEK.map(({ weekday }) => {
      const ranges = hours
        .filter((h) => h.weekday === weekday)
        .map((h) => ({ start_time: h.start_time, end_time: h.end_time }));
      return [weekday, { open: ranges.length > 0, ranges: ranges.length ? ranges : [{ ...DEFAULT_RANGE }] }];
    })
  );
}

function weekToHours(week) {
  return WEEK.flatMap(({ weekday }) =>
    week[weekday].open ? week[weekday].ranges.map((r) => ({ weekday, ...r })) : []
  );
}

// Mismo chequeo que hace el backend, para avisar antes de mandar.
function validateWeek(week) {
  for (const { weekday, label } of WEEK) {
    const day = week[weekday];
    if (!day.open) continue;
    const sorted = [...day.ranges].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 0; i < sorted.length; i += 1) {
      if (!sorted[i].start_time || !sorted[i].end_time) return `${label}: completá el horario.`;
      if (sorted[i].start_time >= sorted[i].end_time) return `${label}: la hora de cierre tiene que ser después de la de apertura.`;
      if (i > 0 && sorted[i].start_time < sorted[i - 1].end_time) return `${label}: hay franjas superpuestas.`;
    }
  }
  return null;
}

function formatDate(iso) {
  const [yyyy, mm, dd] = iso.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function BookingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState(null);
  const [week, setWeek] = useState(() => hoursToWeek([]));
  const [closedDays, setClosedDays] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [hoursMsg, setHoursMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [newClosed, setNewClosed] = useState({ date: "", reason: "" });
  const [savedSlug, setSavedSlug] = useState(null);

  function applyConfig(config) {
    setSettings({
      ...config.settings,
      slug: config.settings.slug ?? config.suggested_slug ?? "",
      address: config.settings.address ?? "",
      whatsapp: config.settings.whatsapp ?? "",
      cancellation_policy: config.settings.cancellation_policy ?? "",
    });
    setSavedSlug(config.settings.slug ?? null);
    setWeek(hoursToWeek(config.hours));
    setClosedDays(config.closed_days);
  }

  useEffect(() => {
    let active = true;
    getBookingConfig()
      .then((config) => { if (active) applyConfig(config); })
      .catch((err) => { if (active) setLoadError(err.message || "No se pudo cargar la configuración."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setField(name, value) {
    setSettings((prev) => ({ ...prev, [name]: value }));
    setSettingsMsg("");
  }

  async function handleSaveSettings(nextEnabled = settings.enabled) {
    const slug = settings.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
      setSettingsMsg("El link solo puede tener letras sin acentos, números y guiones (mínimo 3).");
      return;
    }
    setSavingSettings(true);
    try {
      const config = await saveBookingSettings({
        enabled: nextEnabled,
        slug,
        address: settings.address,
        whatsapp: settings.whatsapp,
        cancellation_policy: settings.cancellation_policy,
        capacity: Number(settings.capacity),
        slot_interval: Number(settings.slot_interval),
        min_notice_minutes: Number(settings.min_notice_minutes),
        max_days_ahead: Number(settings.max_days_ahead),
        cancel_hours: Number(settings.cancel_hours),
      });
      setSettings((prev) => ({ ...prev, enabled: config.settings.enabled, slug: config.settings.slug }));
      setSavedSlug(config.settings.slug);
      setSettingsMsg("Cambios guardados.");
    } catch (err) {
      if (err?.status === 409) {
        setSettingsMsg("Ese link ya lo usa otra peluquería. Probá con otro.");
      } else {
        showApiError(err, "No se pudo guardar la configuración.");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  function updateDay(weekday, patch) {
    setWeek((prev) => ({ ...prev, [weekday]: { ...prev[weekday], ...patch } }));
    setHoursMsg("");
  }

  function updateRange(weekday, index, patch) {
    setWeek((prev) => {
      const ranges = prev[weekday].ranges.map((r, i) => (i === index ? { ...r, ...patch } : r));
      return { ...prev, [weekday]: { ...prev[weekday], ranges } };
    });
    setHoursMsg("");
  }

  function addRange(weekday) {
    setWeek((prev) => {
      const last = prev[weekday].ranges[prev[weekday].ranges.length - 1];
      const start = last?.end_time && last.end_time < "22:00" ? last.end_time : "16:00";
      const ranges = [...prev[weekday].ranges, { start_time: start, end_time: "20:00" }];
      return { ...prev, [weekday]: { ...prev[weekday], ranges } };
    });
    setHoursMsg("");
  }

  function removeRange(weekday, index) {
    setWeek((prev) => {
      const ranges = prev[weekday].ranges.filter((_, i) => i !== index);
      return {
        ...prev,
        [weekday]: ranges.length ? { ...prev[weekday], ranges } : { open: false, ranges: [{ ...DEFAULT_RANGE }] },
      };
    });
    setHoursMsg("");
  }

  async function handleSaveHours() {
    const problem = validateWeek(week);
    if (problem) {
      setHoursMsg(problem);
      return;
    }
    setSavingHours(true);
    try {
      const config = await saveBookingHours(weekToHours(week));
      setWeek(hoursToWeek(config.hours));
      setHoursMsg("Horario guardado.");
    } catch (err) {
      showApiError(err, "No se pudo guardar el horario.");
    } finally {
      setSavingHours(false);
    }
  }

  async function handleAddClosed(e) {
    e.preventDefault();
    if (!newClosed.date) return;
    try {
      const created = await addClosedDay({ date: newClosed.date, reason: newClosed.reason });
      setClosedDays((prev) =>
        [...prev.filter((d) => d.date !== created.date), created].sort((a, b) => a.date.localeCompare(b.date))
      );
      setNewClosed({ date: "", reason: "" });
    } catch (err) {
      showApiError(err, "No se pudo agregar el día cerrado.");
    }
  }

  async function handleRemoveClosed(id) {
    try {
      await removeClosedDay(id);
      setClosedDays((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      showApiError(err, "No se pudo quitar el día cerrado.");
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(bookingPublicUrl(savedSlug));
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="card card-subtitle">Cargando configuración…</div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="page-content">
        <div className="card" style={{ color: "var(--bad)" }}>{loadError || "No se pudo cargar la configuración."}</div>
      </div>
    );
  }

  const hasOpenDay = WEEK.some(({ weekday }) => week[weekday].open);
  const publicUrl = bookingPublicUrl(savedSlug);

  return (
    <div className="page-content booking-settings">
      <header className="page-header">
        <div>
          <h1 className="page-title">Reservas online</h1>
          <p className="page-subtitle">
            Tu página para que los clientes reserven solos desde Instagram o WhatsApp.
          </p>
        </div>
      </header>

      {/* Estado y link */}
      <section className={`card booking-status${settings.enabled ? " is-on" : ""}`}>
        <div className="booking-status__row">
          <div>
            <h2 className="card-title">
              {settings.enabled ? "Las reservas online están prendidas" : "Las reservas online están apagadas"}
            </h2>
            <p className="card-subtitle">
              {settings.enabled
                ? "Tus clientes pueden reservar desde el link."
                : "El link muestra un aviso con tu WhatsApp y no toma reservas."}
            </p>
          </div>
          <button
            type="button"
            className={`booking-switch${settings.enabled ? " is-on" : ""}`}
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Prender o apagar las reservas online"
            disabled={savingSettings}
            onClick={() => handleSaveSettings(!settings.enabled)}
          >
            <span className="booking-switch__knob" />
          </button>
        </div>

        {settings.enabled && !hasOpenDay && (
          <p className="booking-warning">
            Todavía no cargaste el horario de atención: la página no va a ofrecer ningún horario.
          </p>
        )}

        <div className="form-field booking-link-field">
          <label htmlFor="booking-slug">Tu link</label>
          <div className="booking-link-input">
            <span className="booking-link-input__prefix">{window.location.host}/reservar/</span>
            <input
              id="booking-slug"
              type="text"
              value={settings.slug}
              onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="nombre-de-tu-peluqueria"
            />
          </div>
        </div>
        {savedSlug && (
          <div className="booking-link-actions">
            <button type="button" className="btn-secondary" onClick={handleCopy}>
              {copied ? "¡Copiado!" : "Copiar link"}
            </button>
            <a className="btn-secondary" href={publicUrl} target="_blank" rel="noreferrer">
              Ver mi página
            </a>
          </div>
        )}
      </section>

      {/* Reglas */}
      <section className="form-card booking-section">
        <h2 className="card-title">Reglas de reserva</h2>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="capacity">Perros al mismo tiempo</label>
            <input
              id="capacity" type="number" min="1" max="20"
              value={settings.capacity}
              onChange={(e) => setField("capacity", e.target.value)}
            />
            <small className="form-hint">Cuántos podés atender a la vez (mesas o groomers).</small>
          </div>
          <div className="form-field">
            <label htmlFor="slot_interval">Horarios cada</label>
            <select id="slot_interval" value={settings.slot_interval} onChange={(e) => setField("slot_interval", e.target.value)}>
              {INTERVAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m === 60 ? "1 hora" : `${m} minutos`}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="min_notice">Anticipación mínima</label>
            <select id="min_notice" value={settings.min_notice_minutes} onChange={(e) => setField("min_notice_minutes", e.target.value)}>
              {MIN_NOTICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="max_days">Se puede reservar hasta</label>
            <select id="max_days" value={settings.max_days_ahead} onChange={(e) => setField("max_days_ahead", e.target.value)}>
              {MAX_DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} días antes</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="cancel_hours">El cliente puede cancelar hasta</label>
            <select id="cancel_hours" value={settings.cancel_hours} onChange={(e) => setField("cancel_hours", e.target.value)}>
              {CANCEL_HOURS_OPTIONS.map((h) => (
                <option key={h} value={h}>{h === 0 ? "El mismo momento del turno" : `${h} horas antes`}</option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="card-title booking-section__subtitle">Datos de tu página</h2>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="address">Dirección</label>
            <input id="address" type="text" value={settings.address} onChange={(e) => setField("address", e.target.value)} placeholder="Ej: Av. Aconquija 1234, Yerba Buena" />
          </div>
          <div className="form-field">
            <label htmlFor="whatsapp">WhatsApp del local</label>
            <input id="whatsapp" type="tel" value={settings.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} placeholder="Ej: 381 555-1234" />
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="policy">Política de cancelación</label>
            <textarea
              id="policy" rows={3} maxLength={1000}
              value={settings.cancellation_policy}
              onChange={(e) => setField("cancellation_policy", e.target.value)}
              placeholder="Ej: Si no podés venir, avisanos con 24 horas de anticipación. Pasados 15 minutos de tolerancia, el turno se reprograma."
            />
            <small className="form-hint">El cliente la acepta antes de confirmar la reserva.</small>
          </div>
        </div>

        <div className="form-actions booking-section__actions">
          <button type="button" className="btn-primary" disabled={savingSettings} onClick={() => handleSaveSettings()}>
            {savingSettings ? "Guardando…" : "Guardar configuración"}
          </button>
          {settingsMsg && <span className="booking-msg">{settingsMsg}</span>}
        </div>
      </section>

      {/* Horario */}
      <section className="form-card booking-section">
        <h2 className="card-title">Horario de atención</h2>
        <p className="card-subtitle">
          La web solo ofrece horarios dentro de estas franjas. Si cerrás al mediodía, agregá una segunda franja.
        </p>
        <div className="booking-week">
          {WEEK.map(({ weekday, label }) => {
            const day = week[weekday];
            return (
              <div key={weekday} className={`booking-day${day.open ? "" : " is-closed"}`}>
                <label className="booking-day__toggle">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) => updateDay(weekday, { open: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
                {day.open ? (
                  <div className="booking-day__ranges">
                    {day.ranges.map((range, index) => (
                      <div key={index} className="booking-range">
                        <input
                          type="time" step="900" aria-label={`${label}: desde`}
                          value={range.start_time}
                          onChange={(e) => updateRange(weekday, index, { start_time: e.target.value })}
                        />
                        <span>a</span>
                        <input
                          type="time" step="900" aria-label={`${label}: hasta`}
                          value={range.end_time}
                          onChange={(e) => updateRange(weekday, index, { end_time: e.target.value })}
                        />
                        <button type="button" className="booking-icon-btn" aria-label="Quitar franja" onClick={() => removeRange(weekday, index)}>
                          ×
                        </button>
                      </div>
                    ))}
                    {day.ranges.length < 4 && (
                      <button type="button" className="booking-link-btn" onClick={() => addRange(weekday)}>
                        + Agregar franja
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="booking-day__closed">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="form-actions booking-section__actions">
          <button type="button" className="btn-primary" disabled={savingHours} onClick={handleSaveHours}>
            {savingHours ? "Guardando…" : "Guardar horario"}
          </button>
          {hoursMsg && <span className="booking-msg">{hoursMsg}</span>}
        </div>
      </section>

      {/* Días cerrados */}
      <section className="form-card booking-section">
        <h2 className="card-title">Días cerrados</h2>
        <p className="card-subtitle">Feriados, vacaciones o cualquier día que no atiendas.</p>
        <form className="booking-closed-form" onSubmit={handleAddClosed}>
          <input
            type="date" aria-label="Fecha"
            value={newClosed.date}
            onChange={(e) => setNewClosed((p) => ({ ...p, date: e.target.value }))}
            required
          />
          <input
            type="text" aria-label="Motivo" placeholder="Motivo (opcional)" maxLength={200}
            value={newClosed.reason}
            onChange={(e) => setNewClosed((p) => ({ ...p, reason: e.target.value }))}
          />
          <button type="submit" className="btn-secondary">Agregar</button>
        </form>
        {closedDays.length === 0 ? (
          <p className="card-subtitle">No hay días cerrados próximos.</p>
        ) : (
          <ul className="booking-closed-list">
            {closedDays.map((d) => (
              <li key={d.id}>
                <span className="booking-closed-list__date">{formatDate(d.date)}</span>
                <span className="booking-closed-list__reason">{d.reason || ""}</span>
                <button type="button" className="booking-icon-btn" aria-label="Quitar día cerrado" onClick={() => handleRemoveClosed(d.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card booking-section booking-hint">
        <h2 className="card-title">¿Qué servicios se ven en la web?</h2>
        <p className="card-subtitle">
          En <Link to="/catalog/service-types">Tipos de servicio</Link> elegís cuáles se ofrecen online, cuánto
          duran y el precio según el tamaño del perro.
        </p>
      </section>
    </div>
  );
}
