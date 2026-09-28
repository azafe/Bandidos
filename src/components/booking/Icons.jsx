// src/components/booking/Icons.jsx
// Íconos de la página pública de reservas (trazos simples, heredan el color).

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };

export function PawIcon({ size = 16, color = "currentColor", style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} className={className} aria-hidden="true">
      <ellipse cx="12" cy="16.5" rx="5.2" ry="4.5" />
      <ellipse cx="5" cy="10.5" rx="2.2" ry="2.8" />
      <ellipse cx="9.2" cy="6" rx="2.2" ry="2.9" />
      <ellipse cx="14.8" cy="6" rx="2.2" ry="2.9" />
      <ellipse cx="19" cy="10.5" rx="2.2" ry="2.8" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3z" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 18, up = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden="true">
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

export function BackIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function PinIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function ClockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CalendarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function InfoIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function AlertIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

export function WarnIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="3" {...stroke} stroke={color || "currentColor"} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
