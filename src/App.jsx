// src/App.jsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import ServicesListPage from "./pages/services/ServicesListPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import LoginPage from "./pages/auth/LoginPage";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesListPage />} />
        <Route path="/services/new" element={<ServiceFormPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
