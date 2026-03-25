// src/components/navigation/Sidebar.jsx
import { NavLink } from "react-router-dom";
import logo from "../../assets/bandidos-logo.jpg";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ isOpen = true, onNavigate }) {
  const { user, logout } = useAuth();
  const showBackofficeLinks = user?.role === "admin" || user?.role === "super_admin";
  
  // Branding dinámico
  const brandName = user?.tenant_name || "Bandidos";
  const brandLogo = user?.tenant_logo || logo;
  const brandSubtitle = user?.role === "super_admin" ? "SaaS Admin" : "Peluquería Canina";

  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  const makeClassName = (isActive) =>
    "sidebar__nav-link" + (isActive ? " sidebar__nav-link--active" : "");

  const isEnabled = (mod) => {
    if (user?.role === "super_admin") return true;
    if (!user?.enabled_modules) return true;
    return user.enabled_modules[mod] !== false;
  };

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
        </div>
      </div>

      <nav className="sidebar__nav">
        {user?.role !== "super_admin" && (
          <>
            {isEnabled("dashboard") && (
              <NavLink
                to="/"
                end
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Inicio
              </NavLink>
            )}

            {isEnabled("agenda") && (
              <NavLink
                to="/agenda"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Agenda
              </NavLink>
            )}

            {isEnabled("comunicaciones") && (
              <NavLink
                to="/comunicaciones"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
                style={{ display: "flex", alignItems: "center" }}
              >
                Comunicaciones
                {(() => {
                  const today = new Date().toISOString().split("T")[0];
                  const count = Number(localStorage.getItem("bandidos_comunicaciones_count") || 0);
                  const seen = localStorage.getItem("bandidos_comunicaciones_seen");
                  return count > 0 && seen !== today ? (
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
                  ) : null;
                })()}
              </NavLink>
            )}

            {isEnabled("pets") && (
              <NavLink
                to="/pets"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Mascotas
              </NavLink>
            )}

            {isEnabled("services") && (
              <NavLink
                to="/services"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Servicios
              </NavLink>
            )}

            {isEnabled("petshop") && (
              <NavLink
                to="/petshop"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                PetShop
              </NavLink>
            )}

            {isEnabled("expenses") && (
              <>
                <NavLink
                  to="/expenses/daily"
                  className={({ isActive }) => makeClassName(isActive)}
                  onClick={handleNavigate}
                >
                  Gastos Diarios
                </NavLink>

                <NavLink
                  to="/expenses/fixed"
                  className={({ isActive }) => makeClassName(isActive)}
                  onClick={handleNavigate}
                >
                  Gastos Fijos
                </NavLink>
              </>
            )}

            {isEnabled("catalog") && (
              <NavLink
                to="/catalog/service-types"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Tipos de Servicio
              </NavLink>
            )}

            {isEnabled("suppliers") && (
              <NavLink
                to="/suppliers"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Proveedores
              </NavLink>
            )}

            {showBackofficeLinks && (
              <>
                <NavLink
                  to="/catalog/payment-methods"
                  className={({ isActive }) => makeClassName(isActive)}
                  onClick={handleNavigate}
                >
                  Método de Pago
                </NavLink>

                <NavLink
                  to="/catalog/expense-categories"
                  className={({ isActive }) => makeClassName(isActive)}
                  onClick={handleNavigate}
                >
                  Categoría Gastos
                </NavLink>

                {user?.role === "admin" && (
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => makeClassName(isActive)}
                    onClick={handleNavigate}
                  >
                    Usuarios
                  </NavLink>
                )}
              </>
            )}

            {isEnabled("employees") && (
              <NavLink
                to="/employees"
                className={({ isActive }) => makeClassName(isActive)}
                onClick={handleNavigate}
              >
                Estilista
              </NavLink>
            )}
          </>
        )}

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
