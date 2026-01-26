/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const SuppliersContext = createContext();

export function SuppliersProvider({ children }) {
  const [suppliers, setSuppliers] = useState([]);

  function addSupplier(newSupplier) {
    setSuppliers((prev) => [...prev, { id: Date.now(), ...newSupplier }]);
  }

  return (
    <SuppliersContext.Provider value={{ suppliers, addSupplier }}>
      {children}
    </SuppliersContext.Provider>
  );
}

export function useSuppliers() {
  return useContext(SuppliersContext);
}
