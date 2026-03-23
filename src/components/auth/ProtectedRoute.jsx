import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SuspendedPage from "../../pages/auth/SuspendedPage";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">Cargando sesión...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.tenant_status === "inactive") {
    return <SuspendedPage reason={user.suspended_reason} />;
  }

  return children;
}
