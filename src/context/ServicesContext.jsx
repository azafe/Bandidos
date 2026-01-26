// src/context/ServicesContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import {
  fetchServiciosFromSheet,
  createServiceOnSheet,
  deleteServiceOnSheet,
} from "../services/googleSheetsService";

const ServicesContext = createContext(null);

export function ServicesProvider({ children }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar servicios desde el CSV
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServiciosFromSheet();
        if (!isMounted) return;
        setServices(data);
      } catch (err) {
        console.error("[ServicesContext] Error cargando servicios:", err);
        if (!isMounted) return;
        setError(err.message || "Error al cargar servicios.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Crear un nuevo servicio
  async function addService(servicePayload) {
    try {
      setError(null);

      // Guardar en hoja (Apps Script)
      await createServiceOnSheet(servicePayload);
      const data = await fetchServiciosFromSheet();
      setServices(data);
    } catch (err) {
      console.error("[ServicesContext] Error creando servicio:", err);
      setError(err.message || "Error al crear servicio.");
      throw err;
    }
  }

  // Eliminar servicio
  async function deleteService(service) {
    try {
      setError(null);

      if (service.sheetRow) {
        await deleteServiceOnSheet(service.sheetRow);
      } else {
        console.warn(
          "[ServicesContext] Servicio sin sheetRow, solo se eliminará en memoria."
        );
      }

      const data = await fetchServiciosFromSheet();
      setServices(data);
    } catch (err) {
      console.error("[ServicesContext] Error eliminando servicio:", err);
      setError(err.message || "Error al eliminar servicio.");
      throw err;
    }
  }

  return (
    <ServicesContext.Provider
      value={{
        services,
        loading,
        error,
        addService,
        deleteService,
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
