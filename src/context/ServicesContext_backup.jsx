// src/context/ServicesContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { fetchServiciosFromSheet } from "../services/googleSheetsService";

const ServicesContext = createContext();

function parseDateDMY(value) {
  if (!value) return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;

  const [dayStr, monthStr, yearStr] = parts;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!day || !month || !year) return null;

  // Mes en JS es 0–11
  return new Date(year, month - 1, day);
}

export function ServicesProvider({ children }) {
  const [state, setState] = useState({
    services: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchServiciosFromSheet()
      .then((rows) => {
        console.log("📥 Servicios recibidos en contexto:", rows.slice(0, 5));
        console.log("📊 Total filas:", rows.length);

        const mapped = rows.map((r, index) => {
          const rawDate =
            r.Fecha || r.fecha || r[" FECHA"] || r["Fecha "] || "";

          const dateObj = parseDateDMY(rawDate);

          return {
            id: index + 1,
            date: rawDate,
            dateObj, // 👈 usamos esto para filtros
            dogName: r.Perro || r.perro,
            ownerName: r.Dueño || r.dueno || r.duenio || r["Dueño"],
            type: r.Servicio || r.servicio,
            price: Number(r.Precio || r.precio || 0),
            paymentMethod: r["Método de pago"] || r.metodo || r["Metodo de pago"],
            groomer: r.Groomer || r.groomer || "",
          };
        });

        setState({
          services: mapped,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        console.error("❌ Error cargando servicios:", err);
        setState({
          services: [],
          loading: false,
          error: err.message || "Error al cargar servicios",
        });
      });
  }, []);

  return (
    <ServicesContext.Provider
      value={{
        services: state.services,
        loading: state.loading,
        error: state.error,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices debe usarse dentro de ServicesProvider");
  }
  return ctx;
}
