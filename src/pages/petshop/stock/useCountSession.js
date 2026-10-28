// Sesión de conteo guardada en el navegador: si se corta la batería o se
// cierra la pestaña, el conteo se retoma en el mismo producto. Lo contado ya
// está en la base (cada producto se guarda antes de avanzar); esto es la cola.
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bandidos:petshop:conteo";

function readSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session?.version === 1 && Array.isArray(session.queue) ? session : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento el conteo funciona igual, solo no se retoma.
  }
}

export function useCountSession() {
  const [session, setSessionState] = useState(readSession);
  const setSession = useCallback((next) => {
    setSessionState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      writeSession(value);
      return value;
    });
  }, []);

  // Otra pestaña que termina o descarta el conteo.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSessionState(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { session, setSession };
}
