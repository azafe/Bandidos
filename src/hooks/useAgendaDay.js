// src/hooks/useAgendaDay.js
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/apiClient";

export function useAgendaDay(date) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDay = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest("/v2/agenda", { params: { date } });
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err.message || "No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  return { items, loading, error, refetch: fetchDay };
}
