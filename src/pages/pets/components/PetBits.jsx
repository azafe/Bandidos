// Piezas chicas compartidas por las pantallas de Mascotas.
import { useEffect } from "react";
import { petColor, petInitial, TURNO_STATUS } from "../../../utils/pets";

export function PetAvatar({ pet, size = 44, onClick, className = "" }) {
  const color = petColor(pet?.name);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (pet?.photo_url) {
    const img = (
      <img src={pet.photo_url} alt="" className={`pv-avatar ${className}`} style={style} />
    );
    return onClick ? (
      <button type="button" className="pv-avatar-btn" onClick={onClick} aria-label="Ver foto en grande">
        {img}
      </button>
    ) : (
      img
    );
  }
  return (
    <span className={`pv-avatar pv-avatar--initial ${className}`} style={{ ...style, background: color }} aria-hidden="true">
      {petInitial(pet?.name)}
    </span>
  );
}

// tone: ok | muted | info | warn | err | brand | dashed
export function Pill({ tone = "muted", children, title }) {
  return (
    <span className={`pv-pill pv-pill--${tone}`} title={title}>
      {children}
    </span>
  );
}

export function StatusPill({ status }) {
  const info = TURNO_STATUS[status] || TURNO_STATUS.reserved;
  return <Pill tone={info.tone}>{info.label}</Pill>;
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="pv-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

const ICONS = {
  whatsapp: (
    <path
      fill="currentColor"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.79 14.02c-.24.68-1.42 1.3-1.95 1.35-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.97 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.2.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.7-.17 1.37Z"
    />
  ),
  calendar: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 7v5m-2.5-2.5h5"
    />
  ),
  edit: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4"
    />
  ),
  more: (
    <path fill="currentColor" d="M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  ),
  camera: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      d="M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
    />
  ),
  back: (
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
  ),
  search: (
    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4" />
  ),
  user: (
    <path fill="currentColor" d="M12 12a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z" />
  ),
  phone: (
    <path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
  ),
  alert: (
    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 4 2.5 20h19L12 4Zm0 6v4m0 3v.01" />
  ),
};

export function Icon({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}
