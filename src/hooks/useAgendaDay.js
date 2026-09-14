// src/hooks/useAgendaDay.js
import { useCallback, useEffect, useState } from "react";
import { listAgendaDay, listAgendaSummary } from "../services/agendaApi";

export function useAgendaDay(date) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryTotals, setSummaryTotals] = useState({
    totalEstimated: null,
    totalDeposit: null,
  });

  const fetchDay = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      const { items: dayItems } = await listAgendaDay(date);
      setItems(dayItems);
      try {
        const summary = await listAgendaSummary({ from: date, to: date });
        setSummaryTotals({
          totalEstimated: summary.totalEstimated,
          totalDeposit: summary.totalDeposit,
        });
      } catch {
        setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      }
    } catch (err) {
      setError(err.message || "No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  return { items, loading, error, summaryTotals, refetch: fetchDay };
}
