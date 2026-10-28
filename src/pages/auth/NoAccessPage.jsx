// Un rol sin ningún módulo entra igual y ve este aviso: es más claro que
// rebotarlo al login sin explicación (como en la ONG).
import { useAuth } from "../../context/AuthContext";
import { roleLabel } from "../../lib/permissions";

export default function NoAccessPage() {
  const { user, permissions, logout } = useAuth();
  return (
    <div className="page-content">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 className="card-title" style={{ margin: 0 }}>Todavía no tenés secciones asignadas</h1>
        <p className="card-subtitle" style={{ margin: 0 }}>
          Tu usuario ({user?.email}) tiene el rol <strong>{roleLabel(permissions?.role ?? user?.role)}</strong>, que
          por ahora no abre ninguna sección. Pedile al administrador que te dé acceso desde Usuarios › Permisos.
        </p>
        <button type="button" className="btn-secondary" style={{ alignSelf: "flex-start", minHeight: 44 }} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
