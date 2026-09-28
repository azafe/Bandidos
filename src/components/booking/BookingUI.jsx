// src/components/booking/BookingUI.jsx
// Piezas reutilizables de la página pública de reservas (ver "1q" del diseño).
// Los estilos están en src/styles/booking-ui.css con el prefijo "bk-".
import { useEffect, useRef } from "react";
import { AlertIcon, CheckIcon, InfoIcon, PawIcon, WarnIcon } from "./Icons";

export function ShopAvatar({ name, logoUrl, size = 60 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.round(size * 0.44) };
  if (logoUrl) return <img className="bk-avatar" src={logoUrl} alt="" style={style} />;
  return (
    <span className="bk-avatar bk-avatar--initial" style={style} aria-hidden="true">
      {initial}
    </span>
  );
}

// variant: primary | whatsapp | whatsapp-outline | secondary | ghost | danger
export function Button({ variant = "primary", href, children, className = "", size, ...props }) {
  const cls = `bk-btn bk-btn--${variant}${size ? ` bk-btn--${size}` : ""}${className ? ` ${className}` : ""}`;
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}

const NOTICE_ICONS = { info: PawIcon, warn: WarnIcon, error: AlertIcon, ok: CheckIcon };

// variant: info | warn | error | ok
export function Notice({ variant = "info", icon = true, children, role }) {
  const Icon = variant === "info" && icon === "info" ? InfoIcon : NOTICE_ICONS[variant];
  return (
    <div className={`bk-notice bk-notice--${variant}`} role={role}>
      {icon && Icon && (
        <span className="bk-notice__icon">
          <Icon size={16} />
        </span>
      )}
      <div className="bk-notice__body">{children}</div>
    </div>
  );
}

// status: open | full | closed
export function DayChip({ weekday, day, month, status, selected, onSelect }) {
  const disabled = status !== "open";
  return (
    <button
      type="button"
      className={`bk-day${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={`${weekday} ${day} ${month}${status === "full" ? ", completo" : status === "closed" ? ", cerrado" : ""}`}
      onClick={() => !disabled && onSelect()}
    >
      <span className="bk-day__wd">{weekday}</span>
      <span className="bk-day__num">{day}</span>
      <span className="bk-day__month">{status === "full" ? "Completo" : status === "closed" ? "Cerrado" : month}</span>
    </button>
  );
}

export function TimeSlot({ time, selected, onSelect }) {
  return (
    <button type="button" className={`bk-slot${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={onSelect}>
      {selected && <CheckIcon size={14} />}
      {time}
    </button>
  );
}

export function Field({ label, required, optional, help, error, children, htmlFor }) {
  return (
    <div className={`bk-field${error ? " has-error" : ""}`}>
      <label className="bk-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="bk-field__req"> *</span>}
        {optional && <span className="bk-field__opt"> (opcional)</span>}
      </label>
      {children}
      {error ? (
        <p className="bk-field__error" id={`${htmlFor}-error`}>{error}</p>
      ) : (
        help && <p className="bk-field__help">{help}</p>
      )}
    </div>
  );
}

export function StepIndicator({ step }) {
  const steps = [
    { key: "time", label: "1 · Día y hora" },
    { key: "data", label: "2 · Tus datos" },
  ];
  const current = steps.findIndex((s) => s.key === step);
  return (
    <ol className="bk-steps" aria-label="Pasos">
      {steps.map((s, i) => (
        <li key={s.key} className={`bk-steps__item${i === current ? " is-active" : ""}${i < current ? " is-done" : ""}`} aria-current={i === current ? "step" : undefined}>
          <span className="bk-steps__bar" />
          <span className="bk-steps__label">
            {i < current && <CheckIcon size={13} color="#15803d" />}
            {i < current ? s.label.replace(/^\d · /, "") : s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Hoja inferior modal (confirmaciones, horario tomado, calendario).
export function BottomSheet({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="bk-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="bk-sheet__backdrop" onClick={onClose} />
      <div className="bk-sheet__panel" ref={ref} tabIndex={-1}>
        <span className="bk-sheet__handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function PoweredBy() {
  return (
    <p className="bk-powered">
      Reservas con <strong>Bandidos</strong>
    </p>
  );
}

// Huellita grande de fondo en el encabezado.
export function PawWatermark() {
  return (
    <span className="bk-watermark" aria-hidden="true">
      <PawIcon size={92} />
    </span>
  );
}
