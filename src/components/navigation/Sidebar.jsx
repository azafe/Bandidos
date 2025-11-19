// src/components/navigation/Sidebar.jsx
import { NavLink } from "react-router-dom";
import logo from "/src/assets/bandidos-logo.jpg";



export default function Sidebar({ isOpen = true, onNavigate }) {
  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo-circle">
            <img
            src={logo}
            alt="Bandidos Logo"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          /> 
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-title">Bandidos</span>
          <span className="sidebar__brand-subtitle">Peluquería Canina</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Servicios
        </NavLink>

        <NavLink
          to="/expenses/daily"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Gastos diarios
        </NavLink>

        <NavLink
          to="/expenses/fixed"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Gastos fijos
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Empleados
        </NavLink>

        <NavLink
          to="/suppliers"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
          onClick={handleNavigate}
        >
          Proveedores
        </NavLink>
      </nav>
    </aside>
  );
}
