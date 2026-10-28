// src/components/navigation/Sidebar.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/bandidos-logo.jpg";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
} from "../../services/pushNotifications.js";
import { todayISO } from "../../utils/dates";
import { showApiError } from "../../utils/errorDialog";
import { roleLabel, visibleNav } from "../../lib/permissions";

// Recordatorios pendientes de hoy (los cuenta la pantalla de Comunicaciones).
function ComunicacionesBadge() {
  const today = todayISO();
  const count = Number(localStorage.getItem("bandidos_comunicaciones_count") || 0);
  const seen = localStorage.getItem("bandidos_comunicaciones_seen");
  if (!(count > 0 && seen !== today)) return null;
  return (
    <span style={{
      background: "#ef4444",
      color: "white",
      fontSize: "10px",
      fontWeight: "600",
      padding: "2px 6px",
      borderRadius: "10px",
      marginLeft: "6px",
      lineHeight: 1.4,
    }}>
      {count}
    </span>
  );
}

export default function Sidebar({ isOpen = true, onNavigate }) {
  const { user, permissions, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = !user?.chofer_id && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (!pushSupported) return;
    getSubscriptionStatus().then(setPushEnabled).catch(() => setPushEnabled(false));
  }, [pushSupported]);

  async function handlePushToggle() {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        await subscribeToPush();
        setPushEnabled(true);
      }
    } catch (err) {
      showApiError(err, "Error al configurar notificaciones.");
    } finally {
      setPushLoading(false);
    }
  }
  
  // Branding dinámico
  const brandName = user?.tenant_name || "Bandidos";
  const brandLogo = user?.tenant_logo || logo;
  const brandSubtitle = user?.role === "super_admin" ? "SaaS Admin" : "Peluquería Canina";

  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  const makeClassName = (isActive) =>
    "sidebar__nav-link" + (isActive ? " sidebar__nav-link--active" : "");


  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo-circle">
          <img
            src={brandLogo}
            alt={`${brandName} Logo`}
            className="sidebar__logo-img"
          />
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-title">{brandName}</span>
          <span className="sidebar__brand-subtitle">{brandSubtitle}</span>
          {user?.role === "admin" && (
            <span className="sidebar__brand-role sidebar__brand-role--admin">admin</span>
          )}
          {user?.role && user.role !== "admin" && user.role !== "super_admin" && (
            <span className="sidebar__brand-role">{roleLabel(user.role).toLowerCase()}</span>
          )}
        </div>
      </div>

      <nav className="sidebar__nav">
        {user?.chofer_id && <NavLink to="/traslados/dia" className={({ isActive }) => makeClassName(isActive)} onClick={handleNavigate}>Mis traslados</NavLink>}
        {user?.role !== "super_admin" && !user?.chofer_id &&
          visibleNav(permissions, user?.enabled_modules).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => makeClassName(isActive)}
              onClick={handleNavigate}
              style={item.badge ? { display: "flex", alignItems: "center" } : undefined}
            >
              {item.label}
              {item.badge === "comunicaciones" && <ComunicacionesBadge />}
            </NavLink>
          ))}

        {user?.role === "super_admin" && (
          <NavLink
            to="/admin/super"
            className={({ isActive }) => makeClassName(isActive)}
            onClick={handleNavigate}
          >
            Super Admin
          </NavLink>
        )}
      </nav>

      <div className="sidebar__nav" style={{ marginTop: "auto" }}>
        {pushSupported && user?.role !== "super_admin" && (
          <button
            type="button"
            className={`sidebar__nav-link sidebar__push-toggle${pushEnabled ? " sidebar__push-toggle--on" : ""}`}
            onClick={handlePushToggle}
            disabled={pushLoading}
          >
            {pushLoading ? "..." : pushEnabled ? "🔔 Notificaciones activas" : "🔕 Activar notificaciones"}
          </button>
        )}
        <button
          type="button"
          className="sidebar__nav-link sidebar__nav-link--logout"
          onClick={() => {
            logout();
            handleNavigate();
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
