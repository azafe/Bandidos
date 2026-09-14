// src/hooks/useAgendaRange.js
import { useCallback, useEffect, useRef, useState } from "react";
import { listAgendaRange } from "../services/agendaApi";

// Turnos por rango de fechas para la vista Semana. Cachea por clave
// `${from}_${to}` para que alternar vistas con la misma fecha no re-fetchee.
export function useAgendaRange(from, to, enabled) {
  const cacheRef = useRef(new Map());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRange = useCallback(
    async (force = false) => {
      if (!enabled || !from || !to) return;
      const key = `${from}_${to}`;
      if (!force && cacheRef.current.has(key)) {
        setItems(cacheRef.current.get(key));
        setLoading(false);
        setError(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { items: rangeItems } = await listAgendaRange({ from, to });
        cacheRef.current.set(key, rangeItems);
        setItems(rangeItems);
      } catch (err) {
        setError(err.message || "No se pudo cargar la agenda.");
      } finally {
        setLoading(false);
      }
    },
    [from, to, enabled]
  );

  useEffect(() => {
    fetchRange();
  }, [fetchRange]);

  const invalidate = useCallback(() => {
    cacheRef.current.clear();
    if (enabled) fetchRange(true);
  }, [enabled, fetchRange]);

  return { items, loading, error, invalidate };
}
