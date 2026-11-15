import { useCallback, useState } from "react";

// Lo que la base todavía no guarda (quién viene, horarios, colores, renglones
// agregados y lista de espera) queda en este dispositivo.
const KEY = "bandidos_planilla_local_v1";
const VACIO = { days: {}, defaultHours: {}, colors: {}, wait: [] };

function leer() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" ? { ...VACIO, ...data } : VACIO;
  } catch {
    return VACIO;
  }
}

export default function usePlanillaLocal() {
  const [data, setData] = useState(leer);
  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(structuredClone(prev));
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
      return next;
    });
  }, []);
  return [data, update];
}
