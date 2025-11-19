// src/App.jsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import ServicesListPage from "./pages/services/ServicesListPage";
import LoginPage from "./pages/auth/LoginPage"; // por ahora no lo usamos en el layout
// futuras páginas
// import DailyExpensesPage from "./pages/expenses/DailyExpensesPage";
// etc.

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesListPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Después agregamos las demás rutas */}
      </Routes>
    </MainLayout>
  );
}

export default App;