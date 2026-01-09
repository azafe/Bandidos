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
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import CustomersPage from "./pages/customers/CustomersPage";
import PetsPage from "./pages/pets/PetsPage";
import ServiceTypesPage from "./pages/catalog/ServiceTypesPage";
import PaymentMethodsPage from "./pages/catalog/PaymentMethodsPage";
import ExpenseCategoriesPage from "./pages/catalog/ExpenseCategoriesPage";
import UsersPage from "./pages/admin/UsersPage";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/services" element={<ServicesListPage />} />
                  <Route path="/services/new" element={<ServiceFormPage />} />
                  <Route path="/services/:id" element={<ServiceFormPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/pets" element={<PetsPage />} />
                  <Route path="/expenses/daily" element={<DailyExpensesPage />} />
                  <Route path="/expenses/fixed" element={<FixedExpensesPage />} />
                  <Route path="/employees" element={<EmployeesPage />} />
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
