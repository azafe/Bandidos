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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStoredToken(null);
  }, []);

  useEffect(() => {
    setStoredToken(token);
  }, [token]);

  // Ref para que el suspendedHandler siempre use la versión más reciente de loadMe
  const loadMeRef = useRef(null);

  const loadMe = useCallback(async () => {
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
      setUser(me?.user || me);
    } catch (err) {
      console.error("[AuthContext] Error cargando /me:", err);
      if (err?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
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
