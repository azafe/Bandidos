/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  apiRequest,
  publicRequest,
  setStoredToken,
  getStoredToken,
  setUnauthorizedHandler,
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
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    setStoredToken(token);
  }, [token]);

  const loadMe = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const me = await apiRequest("/me");
      setUser(me?.user || me);
    } catch (err) {
      console.error("[AuthContext] Error cargando /me:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (payload) => {
    const data = await publicRequest("/auth/login", {
      method: "POST",
      body: payload,
    });
    setToken(data?.token);
    setUser(data?.user || null);
  };

  const register = async (payload) => {
    const data = await publicRequest("/auth/register", {
      method: "POST",
      body: payload,
    });
    setToken(data?.token);
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
