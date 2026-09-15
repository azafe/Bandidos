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
  // Cambiar de mes rápido puede dejar dos fetches en vuelo; sin esto el que
  // responde último gana aunque sea de un rango viejo.
  const requestIdRef = useRef(0);

  const fetchCounts = useCallback(
    async (force = false) => {
      if (!enabled || !from || !to) return;
      const requestId = ++requestIdRef.current;
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
        const { rows } = await listAgendaCounts({ from, to });
        if (requestIdRef.current !== requestId) return;
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
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err.message || "No se pudieron cargar los conteos.");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
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

  return { countsByDate, loading, error, invalidate };
}
