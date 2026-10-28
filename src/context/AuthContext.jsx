/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  apiRequest,
  publicRequest,
  setStoredToken,
  getStoredToken,
  setUnauthorizedHandler,
  setSuspendedHandler,
} from "../services/apiClient";
import { disableLocalPush } from "../services/pushNotifications";
import { canAccess, fallbackModules } from "../lib/permissions";

// Qué módulos abre el usuario (Usuarios › Permisos). Si no se pueden leer, se
// usan los de su rol por defecto: el menú se arma igual y lo que no
// corresponda lo frena el backend.
async function loadPermissions(me, token) {
  const role = me?.role;
  if (!role || role === "super_admin") return { role, is_admin: false, modules: [] };
  try {
    return await apiRequest("/me/permissions", { token });
  } catch {
    return { role, is_admin: role === "admin", modules: role === "admin" ? [] : fallbackModules(role) };
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions(null);
    setStoredToken(null);
  }, []);

  useEffect(() => {
    // Un dispositivo compartido puede conservar una suscripción del panel.
    if (user?.chofer_id) disableLocalPush().catch(() => {});
  }, [user?.chofer_id]);

  useEffect(() => {
    setStoredToken(token);
  }, [token]);

  // Ref para que el suspendedHandler siempre use la versión más reciente de loadMe
  const loadMeRef = useRef(null);
  // El token puede cambiar (login/logout) mientras un loadMe anterior sigue
  // en vuelo; sin esto, la respuesta vieja puede pisar el user/loading del
  // token nuevo si llega después.
  const requestIdRef = useRef(0);

  const loadMe = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let me;
      try {
        me = await apiRequest("/me", { token });
      } catch (err) {
        if (err?.status === 404) {
          me = await apiRequest("/auth/me", { token });
        } else {
          throw err;
        }
      }
      if (requestIdRef.current !== requestId) return;
      const loaded = me?.user || me;
      const perms = await loadPermissions(loaded, token);
      if (requestIdRef.current !== requestId) return;
      setPermissions(perms);
      setUser(loaded);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      console.error("[AuthContext] Error cargando /me:", err);
      if (err?.status === 401) {
        logout();
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [token, logout]);

  // Mantener el ref actualizado con la última versión de loadMe
  useEffect(() => {
    loadMeRef.current = loadMe;
  }, [loadMe]);

  // Registrar handlers una sola vez al montar
  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    setSuspendedHandler(() => { loadMeRef.current?.(); });
  }, [logout]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (payload) => {
    const data = await publicRequest("/auth/login", {
      method: "POST",
      body: payload,
    });
    if (!data?.token) {
      throw new Error("No se recibió token de sesión.");
    }
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data?.user || null);
  };

  const register = async (payload) => {
    const data = await publicRequest("/auth/register", {
      method: "POST",
      body: payload,
    });
    if (!data?.token) {
      throw new Error("No se recibió token de sesión.");
    }
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data?.user || null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        logout,
        refreshMe: loadMe,
        permissions,
        can: (module) => canAccess(permissions, module),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
