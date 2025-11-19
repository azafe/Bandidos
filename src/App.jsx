// src/App.jsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import ServicesListPage from "./pages/services/ServicesListPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import DailyExpensesPage from "./pages/expenses/DailyExpensesPage";
import FixedExpensesPage from "./pages/expenses/FixedExpensesPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import EmployeesPage from "./pages/employees/EmployeesPage";
import LoginPage from "./pages/auth/LoginPage";

import { ServicesProvider } from "./context/ServicesContext";
import { SuppliersProvider } from "./context/SuppliersContext";
import { EmployeesProvider } from "./context/EmployeesContext";
import { FixedExpensesProvider } from "./context/FixedExpensesContext";

function App() {
  return (
    <ServicesProvider>
      <SuppliersProvider>
        <EmployeesProvider>
          <FixedExpensesProvider>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/services" element={<ServicesListPage />} />
                <Route path="/services/new" element={<ServiceFormPage />} />
                <Route path="/expenses/daily" element={<DailyExpensesPage />} />
                <Route path="/expenses/fixed" element={<FixedExpensesPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </MainLayout>
          </FixedExpensesProvider>
        </EmployeesProvider>
      </SuppliersProvider>
    </ServicesProvider>
  );
}

export default App;
