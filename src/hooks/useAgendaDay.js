// src/hooks/useAgendaDay.js
import { useCallback, useEffect, useState } from "react";
import { listAgendaDay, listAgendaSummary } from "../services/agendaApi";

export function useAgendaDay(date) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [summaryTotals, setSummaryTotals] = useState({
    totalEstimated: null,
    totalDeposit: null,
  });

  const fetchDay = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      const { items: dayItems, fallback } = await listAgendaDay(date);
      setItems(dayItems);
      const warnings = [];
      if (fallback) warnings.push("Endpoint de agenda no encontrado. Usando datos locales.");
      try {
        const summary = await listAgendaSummary({ from: date, to: date });
        setSummaryTotals({
          totalEstimated: summary.totalEstimated,
          totalDeposit: summary.totalDeposit,
        });
        if (summary.fallback) {
          warnings.push("Endpoint de totales no encontrado. Calculando localmente.");
        }
      } catch {
        setSummaryTotals({ totalEstimated: null, totalDeposit: null });
      }
      setWarning(warnings.length ? warnings.join(" ") : null);
    } catch (err) {
      setError(err.message || "No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  return { items, loading, error, warning, summaryTotals, refetch: fetchDay };
}
