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
  const [warning, setWarning] = useState(null);

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
        setWarning(null);
        const { items: rangeItems, fallback } = await listAgendaRange({ from, to });
        cacheRef.current.set(key, rangeItems);
        setItems(rangeItems);
        setWarning(fallback ? "Endpoint de agenda no encontrado. Usando datos locales." : null);
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

  return { items, loading, error, warning, invalidate };
}
