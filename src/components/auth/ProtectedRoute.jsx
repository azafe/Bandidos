import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
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

  if (user.chofer_id && location.pathname !== "/traslados/dia") {
    return <Navigate to="/traslados/dia" replace />;
  }

  return children;
}
