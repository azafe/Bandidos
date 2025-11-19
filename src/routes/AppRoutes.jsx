import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ServicesListPage from "../pages/services/ServicesListPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/services" element={<ServicesListPage />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}