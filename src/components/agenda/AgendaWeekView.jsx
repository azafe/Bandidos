// src/components/agenda/AgendaWeekView.jsx
import { useMemo } from "react";
import { addDaysISO, turnoDateKey } from "../../utils/dates";

// Días laborables mostrados (offsets desde el lunes). Punto de enganche para
// una futura configuración de días de atención del negocio; hoy lun-sáb fijo.
const WORK_DAY_OFFSETS = [0, 1, 2, 3, 4, 5];
const SUNDAY_OFFSET = 6;
const MAX_PILLS = 4;

function formatDayName(iso) {
  const [yyyy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}

function pillStatusClass(status) {
  if (status === "finished") return "agenda-week__pill--finished";
  if (status === "cancelled") return "agenda-week__pill--cancelled";
  return "agenda-week__pill--reserved";
}

export default function AgendaWeekView({
  weekStart,
  items,
  loading,
  error,
  todayIso,
  onSelectTurno,
  onCreateAt,
  onGoToDay,
}) {
  const turnosByDate = useMemo(() => {
    const map = new Map();
    (items || []).forEach((turno) => {
      const key = turnoDateKey(turno.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(turno);
    });
    map.forEach((list) =>
      list.sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
    );
    return map;
  }, [items]);

  // Se fetchea lun-dom; la columna domingo solo aparece si tiene turnos.
  const dayOffsets = useMemo(() => {
    const sundayIso = addDaysISO(weekStart, SUNDAY_OFFSET);
    return turnosByDate.has(sundayIso)
      ? [...WORK_DAY_OFFSETS, SUNDAY_OFFSET]
      : WORK_DAY_OFFSETS;
  }, [weekStart, turnosByDate]);

  if (error) {
    return (
      <div className="agenda-week card">
        <div className="agenda-empty">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="agenda-week card">
        <div className="agenda-skeleton">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="agenda-card agenda-card--skeleton">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="agenda-week card">
      <div
        className={`agenda-week__grid${
          dayOffsets.length === 7 ? " agenda-week__grid--seven" : ""
        }`}
      >
        {dayOffsets.map((offset) => {
          const iso = addDaysISO(weekStart, offset);
          const dayTurnos = turnosByDate.get(iso) || [];
          const activeCount = dayTurnos.filter(
            (turno) => turno.status !== "cancelled"
          ).length;
          const visible =
            dayTurnos.length > MAX_PILLS + 1
              ? dayTurnos.slice(0, MAX_PILLS)
              : dayTurnos;
          const hiddenCount = dayTurnos.length - visible.length;
          const dayNumber = Number(iso.split("-")[2]);

          return (
            <div key={iso} className="agenda-week__col">
              <button
                type="button"
                className={`agenda-week__head${iso === todayIso ? " is-today" : ""}`}
                onClick={() => onGoToDay(iso)}
              >
                <span className="agenda-week__head-day">{formatDayName(iso)}</span>
                <span className="agenda-week__head-num">{dayNumber}</span>
                <span className="agenda-week__count">
                  {activeCount > 0
                    ? `${activeCount} turno${activeCount === 1 ? "" : "s"}`
                    : "Libre"}
                </span>
              </button>

              {visible.map((turno) => (
                <button
                  key={turno.id}
                  type="button"
                  className={`agenda-week__pill ${pillStatusClass(turno.status)}`}
                  onClick={() => onSelectTurno(turno)}
                >
                  <span className="agenda-week__pill-time">
                    {String(turno.time || "").slice(0, 5)}
                  </span>
                  <span className="agenda-week__pill-pet">
                    {turno.pet_name || "Mascota"}
                  </span>
                </button>
              ))}

              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="agenda-week__more"
                  onClick={() => onGoToDay(iso)}
                >
                  +{hiddenCount} más
                </button>
              )}

              <button
                type="button"
                className="agenda-week__slot"
                onClick={() => onCreateAt(iso)}
              >
                + Agendar
              </button>
            </div>
          );
        })}
      </div>

      <div className="agenda-week__legend">
        <span>
          <span
            className="agenda-week__legend-dot"
            style={{ background: "var(--ok)" }}
          />{" "}
          Finalizado
        </span>
        <span>
          <span
            className="agenda-week__legend-dot"
            style={{ background: "var(--warn)" }}
          />{" "}
          Pendiente
        </span>
        <span>
          <span
            className="agenda-week__legend-dot"
            style={{ background: "var(--text-muted)" }}
          />{" "}
          Cancelado
        </span>
      </div>
    </div>
  );
}
