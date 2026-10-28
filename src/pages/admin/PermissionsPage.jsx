// Usuarios › Permisos: qué secciones abre cada rol (como StaffPermisosPage de
// la ONG). El administrador no aparece como editable: entra a todo siempre,
// así ningún local queda sin quien administre esta pantalla. Los cambios se
// guardan al tocar y valen desde el próximo pedido de cada usuario.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { roleLabel } from "../../lib/permissions";
import "../../styles/permissions.css";

const WIDE_QUERY = "(min-width: 1024px)";

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}

export default function PermissionsPage() {
  const wide = useWide();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [savingRole, setSavingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState("staff");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest("/v2/permissions"), apiRequest("/v2/users").catch(() => [])])
      .then(([matrix, list]) => {
        if (cancelled) return;
        setData(matrix);
        setUsers(Array.isArray(list) ? list : list?.items || []);
        setError("");
      })
      .catch((err) => !cancelled && setError(err?.message || "No se pudieron cargar los permisos."));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const groups = useMemo(() => (data ? [...new Set(data.modules.map((m) => m.group))] : []), [data]);
  const usersByRole = useMemo(() => {
    const counts = {};
    for (const u of users) {
      const role = u.role === "user" ? "staff" : u.role;
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }, [users]);

  const has = (role, module) => data?.permissions[role]?.includes(module) ?? false;

  async function save(role, modules, message) {
    const previous = data.permissions[role];
    setSavingRole(role);
    setData((d) => ({ ...d, permissions: { ...d.permissions, [role]: modules } }));
    try {
      const saved = await apiRequest(`/v2/permissions/${role}`, { method: "PUT", body: { modules } });
      setData((d) => ({ ...d, permissions: { ...d.permissions, [role]: saved.modules } }));
      setToast(message);
    } catch (err) {
      setData((d) => ({ ...d, permissions: { ...d.permissions, [role]: previous } }));
      setToast(err?.message || "No se pudieron guardar los permisos.");
    } finally {
      setSavingRole(null);
    }
  }

  function toggle(role, module) {
    const current = data.permissions[role] ?? [];
    const removing = current.includes(module.id);
    const modules = removing ? current.filter((m) => m !== module.id) : [...current, module.id];
    save(role, modules, `${roleLabel(role)} ${removing ? "ya no tiene" : "ahora tiene"} ${module.label}.`);
  }

  function resetRole(role) {
    if (!window.confirm(`¿Volver ${roleLabel(role)} a sus permisos por defecto?`)) return;
    save(role, data.defaults[role] ?? [], `${roleLabel(role)} volvió a sus permisos por defecto.`);
  }

  const usersText = (role) => {
    const n = usersByRole[role] || 0;
    return n === 1 ? "1 usuario" : `${n} usuarios`;
  };

  return (
    <div className="page-content perm-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Permisos</h1>
          <p className="page-subtitle">
            Qué secciones abre cada rol. Los cambios se guardan al tocar y valen desde el próximo uso de cada uno.
          </p>
        </div>
      </header>

      <section className="card perm-card">
        {error ? (
          <div className="perm-state" role="alert">
            <p>{error}</p>
            <button type="button" className="btn-secondary" onClick={() => setReload((n) => n + 1)}>Reintentar</button>
          </div>
        ) : !data ? (
          <p className="perm-state">Cargando…</p>
        ) : wide ? (
          <div className="perm-table-wrap">
            <table className="perm-table">
              <thead>
                <tr>
                  <th scope="col">Sección</th>
                  <th scope="col" className="perm-col">
                    {roleLabel("admin")}
                    <small>{usersText("admin")}</small>
                  </th>
                  {data.roles.map((role) => (
                    <th key={role.id} scope="col" className="perm-col">
                      {role.label}
                      <small>{usersText(role.id)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group}>
                  <tr className="perm-group">
                    <th colSpan={2 + data.roles.length} scope="colgroup">{group}</th>
                  </tr>
                  {data.modules
                    .filter((m) => m.group === group)
                    .map((module) => (
                      <tr key={module.id}>
                        <th scope="row" className="perm-module">
                          <span>{module.label}</span>
                          <small>{module.description}</small>
                        </th>
                        <td className="perm-col">
                          <span className="perm-always" aria-label="Siempre">✓</span>
                        </td>
                        {data.roles.map((role) => (
                          <td key={role.id} className="perm-col">
                            <input
                              type="checkbox"
                              className="perm-check"
                              checked={has(role.id, module.id)}
                              disabled={savingRole === role.id}
                              onChange={() => toggle(role.id, module)}
                              aria-label={`${role.label}: ${module.label}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              ))}
              <tfoot>
                <tr>
                  <th scope="row" />
                  <td className="perm-col" />
                  {data.roles.map((role) => (
                    <td key={role.id} className="perm-col">
                      <button type="button" className="perm-reset" onClick={() => resetRole(role.id)} disabled={savingRole === role.id}>
                        Por defecto
                      </button>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="perm-mobile">
            <div className="perm-roles" role="radiogroup" aria-label="Rol">
              {data.roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === role.id}
                  className={`perm-role${selectedRole === role.id ? " is-active" : ""}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  {role.label}
                  <span>{data.permissions[role.id]?.length ?? 0}</span>
                </button>
              ))}
            </div>
            <p className="perm-muted">{usersText(selectedRole)} con este rol.</p>
            {groups.map((group) => (
              <fieldset key={group} className="perm-fieldset">
                <legend>{group}</legend>
                <ul>
                  {data.modules
                    .filter((m) => m.group === group)
                    .map((module) => (
                      <li key={module.id}>
                        <label>
                          <span>
                            <strong>{module.label}</strong>
                            <small>{module.description}</small>
                          </span>
                          <input
                            type="checkbox"
                            className="perm-check"
                            checked={has(selectedRole, module.id)}
                            disabled={savingRole === selectedRole}
                            onChange={() => toggle(selectedRole, module)}
                          />
                        </label>
                      </li>
                    ))}
                </ul>
              </fieldset>
            ))}
            <button type="button" className="btn-secondary perm-reset-mobile" onClick={() => resetRole(selectedRole)} disabled={savingRole === selectedRole}>
              Volver {roleLabel(selectedRole)} a los permisos por defecto
            </button>
          </div>
        )}

        <p className="perm-note">
          <span aria-hidden="true">🔒</span>
          <span>
            El administrador entra a todo y es el único que ve esta pantalla y Usuarios. El rol de cada persona se elige
            en <Link to="/admin/users">Usuarios</Link>. Las finanzas de Bandimóviles (resultados, rendiciones y
            configuración) siguen siendo solo del administrador.
          </span>
        </p>
      </section>

      {toast && <div className="perm-toast" role="status">{toast}</div>}
    </div>
  );
}
