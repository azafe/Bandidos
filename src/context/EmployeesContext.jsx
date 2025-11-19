// src/context/EmployeesContext.jsx
import { createContext, useContext, useState } from "react";

const EmployeesContext = createContext(null);

const initialEmployees = [
  {
    id: 1,
    name: "Jorge",
    role: "Groomer",
    phone: "381-000-0000",
    status: "Activo",
    notes: "Dueño de Bandidos",
  },
];

export function EmployeesProvider({ children }) {
  const [employees, setEmployees] = useState(initialEmployees);

  function addEmployee(data) {
    const newEmployee = {
      id: Date.now(),
      ...data,
    };
    setEmployees((prev) => [...prev, newEmployee]);
  }

  return (
    <EmployeesContext.Provider value={{ employees, addEmployee }}>
      {children}
    </EmployeesContext.Provider>
  );
}

export function useEmployees() {
  const ctx = useContext(EmployeesContext);
  if (!ctx) throw new Error("useEmployees debe usarse dentro de EmployeesProvider");
  return ctx;
}
