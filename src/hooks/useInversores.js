// Inversores guardados en este navegador, más la sucursal y el resumen del
// local que guarda el simulador de /nueva-sucursal.
import { useCallback, useMemo, useRef, useState } from "react";
import { SIMULADOR_STORAGE_KEY } from "../lib/sucursal";
import {
  branchFromSimulator,
  INVERSORES_STORAGE_KEY,
  mergeInvestors,
  normalizeInvestor,
  parseStore,
  serializeStore,
} from "../lib/inversores";

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStore() {
  try {
    return parseStore(window.localStorage.getItem(INVERSORES_STORAGE_KEY));
  } catch {
    return parseStore(null);
  }
}

function persist(store) {
  try {
    window.localStorage.setItem(INVERSORES_STORAGE_KEY, serializeStore(store));
  } catch {
    // Sin almacenamiento funciona igual, solo no recuerda.
  }
}

export function useInversores() {
  const [store, setRawStore] = useState(readStore);
  const [simulador] = useState(() => readJson(SIMULADOR_STORAGE_KEY));
  const current = useRef(store);

  // Se guarda en el momento (no en un efecto ni en el actualizador de React):
  // al crear un inversor se navega a su pantalla y esta se desmonta antes de
  // procesar el cambio.
  const setStore = useCallback((fn) => {
    const next = fn(current.current);
    current.current = next;
    persist(next);
    setRawStore(next);
  }, []);

  const branch = useMemo(() => branchFromSimulator(simulador), [simulador]);

  const saveInvestor = useCallback((investor) => {
    const inv = normalizeInvestor({ ...investor, actualizado: new Date().toISOString() });
    setStore((prev) => {
      const exists = prev.inversores.some((i) => i.id === inv.id);
      return {
        ...prev,
        inversores: exists ? prev.inversores.map((i) => (i.id === inv.id ? inv : i)) : [...prev.inversores, inv],
      };
    });
    return inv;
  }, [setStore]);

  const removeInvestor = useCallback((id) => {
    setStore((prev) => ({ ...prev, inversores: prev.inversores.filter((i) => i.id !== id) }));
  }, [setStore]);

  const setProyecto = useCallback((proyecto) => {
    setStore((prev) => ({ ...prev, proyecto: { ...prev.proyecto, ...proyecto } }));
  }, [setStore]);

  // Devuelve cuántos inversores trajo el archivo.
  const importText = useCallback((text) => {
    const data = parseStore(text);
    setStore((prev) => ({ proyecto: prev.proyecto, inversores: mergeInvestors(prev.inversores, data.inversores) }));
    return data.inversores.length;
  }, [setStore]);

  const exportText = useCallback(() => serializeStore(store), [store]);

  return {
    proyecto: store.proyecto,
    inversores: store.inversores,
    branch,
    local: simulador?.local ?? null,
    saveInvestor,
    removeInvestor,
    setProyecto,
    importText,
    exportText,
  };
}
