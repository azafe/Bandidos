// src/context/ServicesContext.jsx
import { createContext, useContext, useState } from "react";

const ServicesContext = createContext(null);

const initialServices = [
  {
    id: 1,
    date: "2025-11-19",
    dogName: "Luna",
    ownerName: "Cliente demo",
    breed: "Schnauzer",
    serviceType: "Baño + corte",
    price: 8000,
    paymentMethod: "Efectivo",
    groomer: "Jorge",
    notes: "",
  },
];

export function ServicesProvider({ children }) {
  const [services, setServices] = useState(initialServices);

  function addService(serviceData) {
    setServices((prev) => {
      const nextId = prev.length ? prev[0].id + 1 : 1;
      const newService = { id: nextId, ...serviceData };
      return [newService, ...prev];
    });
  }

  return (
    <ServicesContext.Provider value={{ services, addService }}>
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
