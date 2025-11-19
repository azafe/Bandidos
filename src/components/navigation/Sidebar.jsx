// src/components/navigation/Sidebar.jsx
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo-circle">
          {/* Si todavía no tenés el logo en /assets, podés borrar el <img> y dejar solo el círculo */}
         
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
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
        >
          Servicios
        </NavLink>

        <NavLink
          to="/expenses/daily"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
        >
          Gastos diarios
        </NavLink>

        <NavLink
          to="/expenses/fixed"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
        >
          Gastos fijos
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
        >
          Empleados
        </NavLink>

        <NavLink
          to="/suppliers"
          className={({ isActive }) =>
            "sidebar__nav-link" +
            (isActive ? " sidebar__nav-link--active" : "")
          }
        >
          Proveedores
        </NavLink>
      </nav>
    </aside>
  );
}