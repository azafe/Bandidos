import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import DashboardHome from "../pages/DashboardHome";
import ServicesListPage from "../pages/services/ServicesListPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<DashboardHome />} />
      <Route path="/services" element={<ServicesListPage />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
