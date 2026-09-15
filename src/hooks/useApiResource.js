import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/apiClient";

export function useApiResource(path, params) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);
  const paramsRef = useRef(params);
  // Si dos fetches quedan en vuelo (params cambia rápido, o un refresh se
  // dispara mientras otro sigue pendiente), sin esto el que responde último
  // gana aunque sea el más viejo y pise el resultado bueno con uno stale.
  const requestIdRef = useRef(0);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fetchItems = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(path, { params: paramsRef.current });
      if (requestIdRef.current !== requestId) return;
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err.message || "Error al cargar datos.");
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, paramsKey]);

  const createItem = useCallback(
    async (payload) => {
      const created = await apiRequest(path, { method: "POST", body: payload });
      await fetchItems();
      return created;
    },
    [path, fetchItems]
  );

  const updateItem = useCallback(
    async (id, payload) => {
      await apiRequest(`${path}/${id}`, { method: "PUT", body: payload });
      await fetchItems();
    },
    [path, fetchItems]
  );

  const deleteItem = useCallback(
    async (id) => {
      await apiRequest(`${path}/${id}`, { method: "DELETE" });
      await fetchItems();
    },
    [path, fetchItems]
  );

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    setItems,
  };
}
