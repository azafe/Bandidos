import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/bandimoviles-inicio.css";

export default function BandimovilesLayout() {
  const { user } = useAuth();
  if (user?.chofer_id) return <Outlet />;
  return <div className="bandi-section">
    <div className="bandi-section__nav">
      <nav aria-label="Secciones de Bandimóviles">
        <NavLink to="/traslados" end>Inicio</NavLink>
        <NavLink to="/traslados/dia">Recorrido del día</NavLink>
        {user?.role === "admin" && <>
          <NavLink to="/traslados/rendiciones">Rendiciones</NavLink>
          <NavLink to="/traslados/resultados">Resultados</NavLink>
          <NavLink to="/traslados/configuracion">Configuración</NavLink>
        </>}
      </nav>
      <Link className="bandi-help" to="/traslados?guia=1">Guía paso a paso</Link>
    </div>
    <Outlet />
  </div>;
}
