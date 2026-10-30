import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";

export default function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.tenant_status === "inactive") {
    return <Navigate to="/suspended" replace state={{ reason: user.suspended_reason }} />;
  }

  if ((user.employee_id && user.employee_active === false) || (user.chofer_id && user.chofer_activo === false)) {
    return <div className="page-content"><div className="card"><h1>Tu acceso está inactivo</h1><p>Contactá al administrador para revisar tu cuenta.</p><button className="btn-secondary" onClick={logout}>Cerrar sesión</button></div></div>;
  }

  if (user.employee_id || user.chofer_id) {
    const allowed = ["/mi-cuenta", "/chat", ...(user.chofer_id ? ["/traslados/dia"] : [])];
    if (!allowed.includes(location.pathname.replace(/\/+$/, ""))) return <Navigate to="/mi-cuenta" replace />;
  }

  return children;
}
