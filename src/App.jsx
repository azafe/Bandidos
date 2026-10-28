// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import DashboardHome from "./pages/DashboardHome";
import ServicesListPage from "./pages/services/ServicesListPage";
import ServiceFormPage from "./pages/services/ServiceFormPage";
import AgendaPage from "./pages/agenda/AgendaPage";
import DailyExpensesPage from "./pages/expenses/DailyExpensesPage";
import FixedExpensesPage from "./pages/expenses/FixedExpensesPage";
import DailyIncomesPage from "./pages/expenses/DailyIncomesPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import SupplierDetailPage from "./pages/suppliers/SupplierDetailPage";
import TrasladosSettingsPage from "./pages/traslados/TrasladosSettingsPage";
import TrasladosDiaPage from "./pages/traslados/TrasladosDiaPage";
import TrasladosResultadosPage from "./pages/traslados/TrasladosResultadosPage";
import TrasladosRendicionesPage from "./pages/traslados/TrasladosRendicionesPage";
import BandimovilesLayout from "./pages/traslados/BandimovilesLayout";
import BandimovilesInicioPage from "./pages/traslados/BandimovilesInicioPage";
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
import PetshopStockPage from "./pages/petshop/stock/PetshopStockPage";
import ComunicacionesPage from "./pages/comunicaciones/ComunicacionesPage";
import BookingSettingsPage from "./pages/booking/BookingSettingsPage";
import NuevaSucursalPage from "./pages/sucursal/NuevaSucursalPage";
import PublicBookingPage from "./pages/public/PublicBookingPage";
import ReservationManagePage from "./pages/public/ReservationManagePage";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ThemeApplier from "./components/ui/ThemeApplier";
import ErrorDialog from "./components/ui/ErrorDialog";

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

// Pantallas de configuración que solo ve el admin del local.
function AdminGuard({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/agenda" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <ThemeApplier />
      <ErrorDialog />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Web de reservas: pública, sin login ni menú del panel. */}
        <Route path="/reservar/:slug" element={<PublicBookingPage />} />
        <Route path="/reservar/:slug/turno/:token" element={<ReservationManagePage />} />
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
                  <Route path="/traslados" element={<BandimovilesLayout />}>
                    <Route index element={<BandimovilesInicioPage />} />
                    <Route path="dia" element={<TrasladosDiaPage />} />
                    <Route path="resultados" element={<AdminGuard><TrasladosResultadosPage /></AdminGuard>} />
                    <Route path="rendiciones" element={<AdminGuard><TrasladosRendicionesPage /></AdminGuard>} />
                    <Route path="configuracion" element={<AdminGuard><TrasladosSettingsPage /></AdminGuard>} />
                  </Route>
                  <Route path="/reservas-online" element={<AdminGuard><BookingSettingsPage /></AdminGuard>} />
                  <Route path="/nueva-sucursal" element={<AdminGuard><NuevaSucursalPage /></AdminGuard>} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/pets" element={<PetsPage />} />
                  <Route path="/pets/:id" element={<PetDetailPage />} />
                  <Route path="/expenses/daily-incomes" element={<DailyIncomesPage />} />
                  <Route path="/expenses/daily" element={<DailyExpensesPage />} />
                  <Route path="/expenses/fixed" element={<StaffGuard><FixedExpensesPage /></StaffGuard>} />
                  <Route path="/employees" element={<StaffGuard><EmployeesPage /></StaffGuard>} />
                  <Route path="/employees/:id" element={<StaffGuard><EmployeeDetailPage /></StaffGuard>} />
                  <Route path="/suppliers" element={<StaffGuard><SuppliersPage /></StaffGuard>} />
                  <Route path="/suppliers/:id" element={<StaffGuard><SupplierDetailPage /></StaffGuard>} />
                  <Route
                    path="/catalog/service-types"
                    element={<ServiceTypesPage />}
                  />
                  <Route
                    path="/catalog/payment-methods"
                    element={<StaffGuard><PaymentMethodsPage /></StaffGuard>}
                  />
                  <Route
                    path="/catalog/expense-categories"
                    element={<StaffGuard><ExpenseCategoriesPage /></StaffGuard>}
                  />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/super" element={<SuperAdminPage />} />
                  <Route path="/petshop" element={<PetShopPage />} />
                  <Route path="/petshop/stock" element={<PetshopStockPage />} />
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
