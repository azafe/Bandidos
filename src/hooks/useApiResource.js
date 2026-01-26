import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/apiClient";

export function useApiResource(path, params) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(path, { params: paramsRef.current });
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err.message || "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, paramsKey]);

  const createItem = useCallback(
    async (payload) => {
      await apiRequest(path, { method: "POST", body: payload });
      await fetchItems();
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
