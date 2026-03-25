// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardHome from "./pages/DashboardHome";
import ServicesListPage from "./pages/services/ServicesListPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import AgendaPage from "./pages/agenda/AgendaPage";
import DailyExpensesPage from "./pages/expenses/DailyExpensesPage";
import FixedExpensesPage from "./pages/expenses/FixedExpensesPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import EmployeesPage from "./pages/employees/EmployeesPage";
import EmployeeDetailPage from "./pages/employees/EmployeeDetailPage";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SuspendedPage from "./pages/auth/SuspendedPage";
import CustomersPage from "./pages/customers/CustomersPage";
import PetsPage from "./pages/pets/PetsPage";
import PetDetailPage from "./pages/pets/PetDetailPage";
import ServiceTypesPage from "./pages/catalog/ServiceTypesPage";
import PaymentMethodsPage from "./pages/catalog/PaymentMethodsPage";
import ExpenseCategoriesPage from "./pages/catalog/ExpenseCategoriesPage";
import UsersPage from "./pages/admin/UsersPage";
import SuperAdminPage from "./pages/admin/SuperAdminPage";
import PetShopPage from "./pages/petshop/PetShopPage";
import ComunicacionesPage from "./pages/comunicaciones/ComunicacionesPage";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ThemeApplier from "./components/ui/ThemeApplier";

function DashboardHomeWrapper() {
  const { user } = useAuth();
  if (user?.role === "super_admin") {
    return <Navigate to="/admin/super" replace />;
  }
  if (user?.role === "staff") {
    return <Navigate to="/agenda" replace />;
  }
  return <DashboardHome />;
}

function StaffGuard({ children, redirectTo = "/agenda" }) {
  const { user } = useAuth();
  if (user?.role === "staff") {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <ThemeApplier />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<DashboardHomeWrapper />} />
                  <Route path="/services" element={<StaffGuard><ServicesListPage /></StaffGuard>} />
                  <Route path="/services/new" element={<StaffGuard><ServiceFormPage /></StaffGuard>} />
                  <Route path="/services/:id" element={<StaffGuard><ServiceFormPage /></StaffGuard>} />
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/pets" element={<PetsPage />} />
                  <Route path="/pets/:id" element={<PetDetailPage />} />
                  <Route path="/expenses/daily" element={<DailyExpensesPage />} />
                  <Route path="/expenses/fixed" element={<StaffGuard><FixedExpensesPage /></StaffGuard>} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route
                    path="/catalog/service-types"
                    element={<ServiceTypesPage />}
                  />
                  <Route
                    path="/catalog/payment-methods"
                    element={<PaymentMethodsPage />}
                  />
                  <Route
                    path="/catalog/expense-categories"
                    element={<ExpenseCategoriesPage />}
                  />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/super" element={<SuperAdminPage />} />
                  <Route path="/petshop" element={<PetShopPage />} />
                  <Route path="/comunicaciones" element={<ComunicacionesPage />} />
                  <Route path="/recordatorios" element={<Navigate to="/comunicaciones" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
