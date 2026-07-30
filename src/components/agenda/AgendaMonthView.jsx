// src/components/agenda/AgendaMonthView.jsx
import { useMemo } from "react";
import { getMonthGrid } from "../../utils/dates";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Nivel del heatmap según cantidad de turnos activos (reservados + finalizados).
function heatLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export default function AgendaMonthView({
  monthDate,
  countsByDate,
  loading,
  error,
  todayIso,
  onSelectDay,
}) {
  const weeks = useMemo(() => getMonthGrid(monthDate), [monthDate]);

  if (error) {
    return (
      <div className="agenda-month card">
        <div className="agenda-empty">{error}</div>
      </div>
    );
  }

  return (
    <div className={`agenda-month card${loading ? " is-loading" : ""}`}>
      <div className="agenda-month__weekdays">
        {WEEKDAY_LABELS.map((label, idx) => (
          <span key={`${label}-${idx}`} className="agenda-month__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="agenda-month__grid">
        {weeks.flat().map((cell) => {
          if (!cell.inMonth) {
            return (
              <div key={cell.iso} className="agenda-month__day is-out">
                <span className="agenda-month__num">{cell.day}</span>
              </div>
            );
          }
          const counts = countsByDate?.[cell.iso];
          const activeCount = counts ? counts.finished + counts.reserved : 0;
          const level = heatLevel(activeCount);
          return (
            <button
              key={cell.iso}
              type="button"
              className={`agenda-month__day agenda-month__day--l${level}${
                cell.iso === todayIso ? " is-today" : ""
              }`}
              onClick={() => onSelectDay(cell.iso)}
              aria-label={`${cell.day}: ${activeCount} turno${
                activeCount === 1 ? "" : "s"
              }`}
            >
              <span className="agenda-month__num">{cell.day}</span>
              {activeCount > 0 && (
                <span className="agenda-month__count">{activeCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
