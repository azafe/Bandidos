// src/hooks/useAgendaCounts.js
import { useCallback, useEffect, useRef, useState } from "react";
import { listAgendaCounts } from "../services/agendaApi";

// Conteos de turnos por día para la vista Mes. Devuelve countsByDate:
// { "YYYY-MM-DD": { total, finished, reserved, cancelled } }.
// Cachea por clave `${from}_${to}` igual que useAgendaRange.
export function useAgendaCounts(from, to, enabled) {
  const cacheRef = useRef(new Map());
  const [countsByDate, setCountsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const fetchCounts = useCallback(
    async (force = false) => {
      if (!enabled || !from || !to) return;
      const key = `${from}_${to}`;
      if (!force && cacheRef.current.has(key)) {
        setCountsByDate(cacheRef.current.get(key));
        setLoading(false);
        setError(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setWarning(null);
        const { rows, fallback } = await listAgendaCounts({ from, to });
        const byDate = {};
        rows.forEach((row) => {
          byDate[row.date] = {
            total: Number(row.total) || 0,
            finished: Number(row.finished) || 0,
            reserved: Number(row.reserved) || 0,
            cancelled: Number(row.cancelled) || 0,
          };
        });
        cacheRef.current.set(key, byDate);
        setCountsByDate(byDate);
        setWarning(fallback ? "Endpoint de conteos no encontrado. Calculando localmente." : null);
      } catch (err) {
        setError(err.message || "No se pudieron cargar los conteos.");
      } finally {
        setLoading(false);
      }
    },
    [from, to, enabled]
  );

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const invalidate = useCallback(() => {
    cacheRef.current.clear();
    if (enabled) fetchCounts(true);
  }, [enabled, fetchCounts]);

  return { countsByDate, loading, error, warning, invalidate };
}
