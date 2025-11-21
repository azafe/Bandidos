// src/context/ServicesContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  fetchServiciosFromSheet,
  createServiceOnSheet,
} from "../services/googleSheetsService";

const ServicesContext = createContext();

export function ServicesProvider({ children }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar servicios desde el CSV (solo lectura)
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchServiciosFromSheet(); // 👈 AHORA SÍ IMPORTADO
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

  // Crear un nuevo servicio (panel -> Apps Script -> hoja)
  async function addService(service) {
    // `service` viene con la forma:
    // { date, dogName, ownerName, type, price, paymentMethod, groomer, notes }
    try {
      setError(null);

      await createServiceOnSheet(service);
      console.log("[ServicesContext] Servicio creado en sheet");

      // Agregamos el servicio también en memoria para verlo sin recargar
      const nuevoServicio = {
        id: services.length + 1,
        rawDate: service.date,
        date: service.date,
        dateObj: new Date(service.date),
        dogName: service.dogName,
        ownerName: service.ownerName,
        type: service.type,
        price: Number(service.price || 0),
        paymentMethod: service.paymentMethod,
        groomer: service.groomer,
        notes: service.notes || "",
      };

      setServices((prev) => [...prev, nuevoServicio]);
    } catch (err) {
      console.error("[ServicesContext] Error creando servicio:", err);
      setError(err.message || "Error al crear servicio.");
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