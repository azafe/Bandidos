// src/hooks/useAgendaDay.js
import { useCallback, useEffect, useState } from "react";
import { listAgendaDay } from "../services/agendaApi";

export function useAgendaDay(date) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const fetchDay = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const { items: dayItems, fallback } = await listAgendaDay(date);
      setItems(dayItems);
      if (fallback) {
        setWarning("Endpoint de agenda no encontrado. Usando datos locales.");
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

  return { items, loading, error, warning, refetch: fetchDay };
}
