// src/App.jsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import ServicesListPage from "./pages/services/ServicesListPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import DailyExpensesPage from "./pages/expenses/DailyExpensesPage";
import FixedExpensesPage from "./pages/expenses/FixedExpensesPage";
import LoginPage from "./pages/auth/LoginPage";

import { ServicesProvider } from "./context/ServicesContext";

function App() {
  return (
    <ServicesProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/services" element={<ServicesListPage />} />
          <Route path="/services/new" element={<ServiceFormPage />} />
          <Route path="/expenses/daily" element={<DailyExpensesPage />} />
          <Route path="/expenses/fixed" element={<FixedExpensesPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MainLayout>
    </ServicesProvider>
  );
}

export default App;
