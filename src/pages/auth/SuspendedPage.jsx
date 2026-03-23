import { useAuth } from "../../context/AuthContext";
import "./login.css";

const REASON_LABELS = {
  payment: "Pago pendiente",
  maintenance: "Plataforma en mantenimiento",
  admin: "Suspensión administrativa",
};

export default function SuspendedPage({ reason }) {
  const { logout } = useAuth();

  const reasonLabel = reason
    ? REASON_LABELS[reason] ?? reason
    : null;

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
        <h1 className="login-title" style={{ fontSize: "1.4rem" }}>
          Cuenta suspendida
        </h1>

        {reasonLabel ? (
          <p className="login-subtitle" style={{ marginBottom: 8 }}>
            Motivo: <strong>{reasonLabel}</strong>
          </p>
        ) : (
          <p className="login-subtitle">
            Tu acceso ha sido suspendido temporalmente.
          </p>
        )}

        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #888)", marginBottom: 24 }}>
          Contactá al administrador para más información.
        </p>

        <button className="login-button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
