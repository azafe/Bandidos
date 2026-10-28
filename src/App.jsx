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
import PermissionsPage from "./pages/admin/PermissionsPage";
import NoAccessPage from "./pages/auth/NoAccessPage";
import { ADMIN_ONLY, landingPath } from "./lib/permissions";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ThemeApplier from "./components/ui/ThemeApplier";
import ErrorDialog from "./components/ui/ErrorDialog";

// Inicio, o la primera pantalla que el rol puede abrir.
function DashboardHomeWrapper() {
  const { user, permissions, can } = useAuth();
  if (user?.role === "super_admin") {
    return <Navigate to="/admin/super" replace />;
  }
  if (!permissions) return null;
  if (can("inicio") && user?.enabled_modules?.dashboard !== false) return <DashboardHome />;
  const landing = landingPath(permissions, user?.enabled_modules);
  return <Navigate to={landing && landing !== "/" ? landing : "/sin-acceso"} replace />;
}

// La puerta de cada pantalla (Usuarios › Permisos): sin el módulo, vuelve al
// inicio, que lo manda a la primera pantalla que sí tiene. El backend frena
// lo mismo; esto es para no mostrar una pantalla que se va a llenar de 403.
function RequireModule({ module, children }) {
  const { permissions, can } = useAuth();
  if (!permissions) return null;
  if (!can(module)) return <Navigate to="/" replace />;
  return children;
}

// Lo que no se delega: finanzas de Bandimóviles, usuarios y permisos.
function AdminGuard({ children }) {
  return <RequireModule module={ADMIN_ONLY}>{children}</RequireModule>;
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
                  <Route path="/services" element={<RequireModule module="servicios"><ServicesListPage /></RequireModule>} />
                  <Route path="/services/new" element={<RequireModule module="servicios"><ServiceFormPage /></RequireModule>} />
                  <Route path="/services/:id" element={<RequireModule module="servicios"><ServiceFormPage /></RequireModule>} />
                  <Route path="/agenda" element={<RequireModule module="agenda"><AgendaPage /></RequireModule>} />
                  <Route path="/traslados" element={<RequireModule module="bandimoviles"><BandimovilesLayout /></RequireModule>}>
                    <Route index element={<BandimovilesInicioPage />} />
                    <Route path="dia" element={<TrasladosDiaPage />} />
                    <Route path="resultados" element={<AdminGuard><TrasladosResultadosPage /></AdminGuard>} />
                    <Route path="rendiciones" element={<AdminGuard><TrasladosRendicionesPage /></AdminGuard>} />
                    <Route path="configuracion" element={<AdminGuard><TrasladosSettingsPage /></AdminGuard>} />
                  </Route>
                  <Route path="/reservas-online" element={<RequireModule module="reservas"><BookingSettingsPage /></RequireModule>} />
                  <Route path="/nueva-sucursal" element={<RequireModule module="inicio"><NuevaSucursalPage /></RequireModule>} />
                  <Route path="/customers" element={<RequireModule module="mascotas"><CustomersPage /></RequireModule>} />
                  <Route path="/pets" element={<RequireModule module="mascotas"><PetsPage /></RequireModule>} />
                  <Route path="/pets/:id" element={<RequireModule module="mascotas"><PetDetailPage /></RequireModule>} />
                  <Route path="/expenses/daily-incomes" element={<RequireModule module="caja"><DailyIncomesPage /></RequireModule>} />
                  <Route path="/expenses/daily" element={<RequireModule module="gastos"><DailyExpensesPage /></RequireModule>} />
                  <Route path="/expenses/fixed" element={<RequireModule module="gastos_fijos"><FixedExpensesPage /></RequireModule>} />
                  <Route path="/employees" element={<RequireModule module="equipo"><EmployeesPage /></RequireModule>} />
                  <Route path="/employees/:id" element={<RequireModule module="equipo"><EmployeeDetailPage /></RequireModule>} />
                  <Route path="/suppliers" element={<RequireModule module="proveedores"><SuppliersPage /></RequireModule>} />
                  <Route path="/suppliers/:id" element={<RequireModule module="proveedores"><SupplierDetailPage /></RequireModule>} />
                  <Route
                    path="/catalog/service-types"
                    element={<RequireModule module="tipos_servicio"><ServiceTypesPage /></RequireModule>}
                  />
                  <Route
                    path="/catalog/payment-methods"
                    element={<RequireModule module="configuracion"><PaymentMethodsPage /></RequireModule>}
                  />
                  <Route
                    path="/catalog/expense-categories"
                    element={<RequireModule module="configuracion"><ExpenseCategoriesPage /></RequireModule>}
                  />
                  <Route path="/admin/users" element={<AdminGuard><UsersPage /></AdminGuard>} />
                  <Route path="/admin/permisos" element={<AdminGuard><PermissionsPage /></AdminGuard>} />
                  <Route path="/sin-acceso" element={<NoAccessPage />} />
                  <Route path="/admin/super" element={<SuperAdminPage />} />
                  <Route path="/petshop" element={<RequireModule module="petshop"><PetShopPage /></RequireModule>} />
                  <Route path="/petshop/stock" element={<RequireModule module="petshop"><PetshopStockPage /></RequireModule>} />
                  <Route path="/comunicaciones" element={<RequireModule module="comunicaciones"><ComunicacionesPage /></RequireModule>} />
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
