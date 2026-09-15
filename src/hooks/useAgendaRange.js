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
  // Cambiar de semana rápido puede dejar dos fetches en vuelo; sin esto el
  // que responde último gana aunque sea de un rango viejo.
  const requestIdRef = useRef(0);

  const fetchRange = useCallback(
    async (force = false) => {
      if (!enabled || !from || !to) return;
      const requestId = ++requestIdRef.current;
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
        if (requestIdRef.current !== requestId) return;
        cacheRef.current.set(key, rangeItems);
        setItems(rangeItems);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err.message || "No se pudo cargar la agenda.");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
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
