// src/lib/booking/ics.js
// Archivo .ics para "Agregar a mi calendario": funciona en iPhone (Calendario),
// Android y Google/Outlook sin depender de un servicio en particular.

const escapeIcs = (text) => String(text ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// Argentina es UTC-3 todo el año.
function toUtcStamp(date, time, extraMinutes = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh + 3, mm + extraMinutes));
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs({ uid, title, description, location, date, time, duration }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bandidos//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@bandidos`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${toUtcStamp(date, time)}`,
    `DTEND:${toUtcStamp(date, time, Number(duration) || 60)}`,
    `SUMMARY:${escapeIcs(title)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : null,
    location ? `LOCATION:${escapeIcs(location)}` : null,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

// Descarga el .ics en el navegador.
export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
