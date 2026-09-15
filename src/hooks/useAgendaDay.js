// src/hooks/useAgendaDay.js
import { useCallback, useEffect, useRef, useState } from "react";
import { listAgendaDay, listAgendaSummary } from "../services/agendaApi";

export function useAgendaDay(date) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryTotals, setSummaryTotals] = useState({
    totalEstimated: null,
    totalDeposit: null,
  });
  // Cambiar de día rápido (flechas, doble click) puede dejar dos fetches en
  // vuelo; sin esto el que responde último gana aunque sea de un día viejo.
  const requestIdRef = useRef(0);

  const fetchDay = useCallback(async () => {
    if (!date) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      const { items: dayItems } = await listAgendaDay(date);
      if (requestIdRef.current !== requestId) return;
      setItems(dayItems);
      try {
        const summary = await listAgendaSummary({ from: date, to: date });
        if (requestIdRef.current !== requestId) return;
        setSummaryTotals({
          totalEstimated: summary.totalEstimated,
          totalDeposit: summary.totalDeposit,
        });
      } catch {
        if (requestIdRef.current !== requestId) return;
        setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      }
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err.message || "No se pudo cargar la agenda.");
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  return { items, loading, error, summaryTotals, refetch: fetchDay };
}
