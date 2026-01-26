// src/context/FixedExpensesContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const FixedExpensesContext = createContext(null);

const initialFixedExpenses = [
  {
    id: 1,
    name: "Alquiler local",
    category: "Alquiler",
    amount: 250000,
    dueDay: 10,
    paymentMethod: "Transferencia",
    supplier: "Propietario local",
    status: "Activo",
  },
  {
    id: 2,
    name: "Luz",
    category: "Servicios",
    amount: 45000,
    dueDay: 5,
    paymentMethod: "Débito automático",
    supplier: "EDET",
    status: "Activo",
  },
];

export function FixedExpensesProvider({ children }) {
  const [fixedExpenses, setFixedExpenses] = useState(initialFixedExpenses);

  function addFixedExpense(data) {
    const newItem = {
      id: Date.now(),
      ...data,
    };
    setFixedExpenses((prev) => [...prev, newItem]);
  }

  const monthlyTotal = fixedExpenses
    .filter((e) => e.status === "Activo")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <FixedExpensesContext.Provider
      value={{ fixedExpenses, addFixedExpense, monthlyTotal }}
    >
      {children}
    </FixedExpensesContext.Provider>
  );
}

export function useFixedExpenses() {
  const ctx = useContext(FixedExpensesContext);
  if (!ctx) {
    throw new Error(
      "useFixedExpenses debe usarse dentro de FixedExpensesProvider"
    );
  }
  return ctx;
}
