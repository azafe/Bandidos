// src/pages/employees/EmployeesPage.jsx
// Equipo: personal y organigrama, como el módulo Equipo de la ONG. El puesto
// es la caja del organigrama, la persona es el empleado (el mismo de agenda,
// comisiones y Bandimóviles) y el permiso sigue en el usuario.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import ResponsiveTable from "../../components/ui/ResponsiveTable";
import { colorForName } from "../../utils/colorPalette";
import { showApiError } from "../../utils/errorDialog";
import { createTemplate, getTeam } from "../../services/teamApi";
import { areaOf, buildTree, formatDay, indexAssignments, initials, isActiveEmployee, teamStats } from "../../lib/team";
import OrgChart from "./OrgChart";
import PositionForm from "./PositionForm";
import PersonSheet from "./PersonSheet";
import "../../styles/pets.css";
import "../../styles/team.css";

const byName = (a, b) => String(a.name).localeCompare(String(b.name), "es");

export default function EmployeesPage() {
  const { items: employees, loading, error, refresh } = useApiResource("/v2/employees");
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("vista") === "organigrama" ? "organigrama" : "personal";

  const [team, setTeam] = useState(null);
  const [teamError, setTeamError] = useState("");
  const [teamReload, setTeamReload] = useState(0);
  const [positionMode, setPositionMode] = useState(null);
  // { employee } para ver una ficha; { employee: null } para el alta.
  const [personSheet, setPersonSheet] = useState(null);
  const [showDischarged, setShowDischarged] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    getTeam()
      .then((data) => {
        if (cancelled) return;
        setTeam(data);
        setTeamError("");
      })
      .catch((err) => !cancelled && setTeamError(err?.message || "No se pudo cargar el organigrama."));
    return () => {
      cancelled = true;
    };
  }, [teamReload]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const reloadTeam = useCallback(() => setTeamReload((n) => n + 1), []);
  const tree = useMemo(() => (team ? buildTree(team) : []), [team]);
  const stats = useMemo(() => (team ? teamStats(team) : null), [team]);
  const positionsByEmployee = useMemo(() => {
    if (!team) return new Map();
    const byId = new Map(team.positions.map((p) => [String(p.id), p]));
    const { byEmployee } = indexAssignments(team.assignments);
    return new Map(
      [...byEmployee.entries()].map(([id, ids]) => [id, ids.map((pid) => byId.get(pid)).filter(Boolean)])
    );
  }, [team]);

  const activeEmployees = useMemo(() => employees.filter(isActiveEmployee).sort(byName), [employees]);
  const discharged = useMemo(() => employees.filter((e) => !isActiveEmployee(e)).sort(byName), [employees]);

  function setView(next) {
    setSearchParams(next === "organigrama" ? { vista: "organigrama" } : {});
  }

  function afterSave(message) {
    setPersonSheet(null);
    setPositionMode(null);
    setToast(message);
    refresh();
    reloadTeam();
  }

  async function handleTemplate() {
    setCreatingTemplate(true);
    try {
      setTeam(await createTemplate());
      setToast("Organigrama sugerido creado. Tocá cada puesto para ajustarlo.");
    } catch (err) {
      showApiError(err, "No se pudo crear el organigrama sugerido.");
    } finally {
      setCreatingTemplate(false);
    }
  }

  const columns = [
    {
      label: "Nombre",
      title: true,
      render: (e) => (
        <div className="staff-name">
          <span className="org-avatar staff-name__avatar" style={{ background: colorForName(e.name) }} aria-hidden="true">
            {initials(e.name)}
          </span>
          <div className="staff-name__text">
            <span className="staff-name__name">{e.name}</span>
            {e.dni && <span className="staff-muted">DNI {e.dni}</span>}
          </div>
        </div>
      ),
    },
    {
      label: "Puestos",
      render: (e) => {
        if (!isActiveEmployee(e)) {
          return <span className="staff-muted">Baja{e.end_date ? ` ${formatDay(e.end_date)}` : ""}</span>;
        }
        if (teamError) return <span className="staff-muted">—</span>;
        const list = positionsByEmployee.get(String(e.id)) ?? [];
        if (!list.length) return <em className="staff-muted">Sin puesto</em>;
        return (
          <span className="team-pills team-pills--inline">
            {list.map((position) => (
              <span key={position.id} className="team-pill" style={{ "--area": areaOf(position.area).color }}>
                {position.name}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      label: "Rol",
      render: (e) => (
        <span className="staff-role">
          {e.role || "Sin rol"}
          {e.is_driver && e.role !== "Chofer" ? " · Chofer" : ""}
        </span>
      ),
    },
    {
      label: "Contacto",
      render: (e) =>
        e.phone ? (
          <a className="staff-phone" href={`tel:${String(e.phone).replace(/[^\d+]/g, "")}`}>
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor" />
            </svg>
            {e.phone}
          </a>
        ) : (
          <span className="staff-muted">sin teléfono</span>
        ),
    },
    {
      label: "Ingreso",
      desktopOnly: true,
      render: (e) => <span className="staff-muted">{e.hire_date ? formatDay(e.hire_date) : "—"}</span>,
    },
    {
      label: "Acciones",
      action: true,
      align: "right",
      render: (e) => (
        <button type="button" className="staff-open" onClick={() => setPersonSheet({ employee: e })}>
          Ver ficha
        </button>
      ),
    },
  ];

  return (
    <div className="page-content team-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="page-subtitle">
            Quién ocupa cada puesto y de quién depende. Tocá una caja o una persona para ver el detalle.
          </p>
        </div>
      </header>

      <section className="card team-panel">
        <div className="team-toolbar">
          <nav className="team-tabs" aria-label="Secciones de Equipo">
            {[
              { id: "personal", label: `Personal${activeEmployees.length ? ` (${activeEmployees.length})` : ""}` },
              { id: "organigrama", label: "Organigrama" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={view === tab.id ? "tab tab--active" : "tab"}
                aria-current={view === tab.id ? "page" : undefined}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="team-toolbar__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setView("organigrama");
                setPositionMode({ type: "new", parentId: null });
              }}
              disabled={!team}
            >
              + Puesto
            </button>
            <button type="button" className="btn-primary" onClick={() => setPersonSheet({ employee: null })}>
              + Alta de empleado
            </button>
          </div>
        </div>

        {view === "personal" ? (
          <div className="team-staff">
            {error && <p className="org-error" role="alert">{error}</p>}
            {loading && employees.length === 0 ? (
              <p className="team-org__state">Cargando…</p>
            ) : (
              <>
                <ResponsiveTable
                  columns={columns}
                  rows={showDischarged ? discharged : activeEmployees}
                  rowKey={(e) => e.id}
                  empty={showDischarged ? "No hay nadie dado de baja." : "Todavía no hay nadie en el personal. Usá “Alta de empleado”."}
                  rowClassName={(e) => (isActiveEmployee(e) ? "" : "staff-row--discharged")}
                />
                {discharged.length > 0 && (
                  <button type="button" className="staff-toggle" onClick={() => setShowDischarged((v) => !v)}>
                    {showDischarged ? "Volver al personal activo" : `Ver dados de baja (${discharged.length})`}
                  </button>
                )}
              </>
            )}
          </div>
        ) : teamError ? (
          <div className="team-org__state" role="alert">
            <p>{teamError}</p>
            <button type="button" className="btn-secondary" onClick={reloadTeam}>Reintentar</button>
          </div>
        ) : !team ? (
          <p className="team-org__state">Cargando organigrama…</p>
        ) : team.positions.length === 0 ? (
          <div className="team-org__empty">
            <h2 className="card-title">Todavía no hay organigrama</h2>
            <p className="card-subtitle">
              Podés empezar con uno sugerido para una peluquería (Dirección, Administración, Recepción,
              Peluquería, Bandimóviles y PetShop) con cada integrante ubicado según su rol, y después ajustarlo.
            </p>
            <div className="team-org__empty-actions">
              <button type="button" className="btn-primary" onClick={handleTemplate} disabled={creatingTemplate}>
                {creatingTemplate ? "Armando…" : "Usar el organigrama sugerido"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPositionMode({ type: "new", parentId: null })}>
                Empezar de cero
              </button>
            </div>
          </div>
        ) : (
          <div className="team-org">
            <dl className="team-stats">
              <div><dt>Puestos</dt><dd>{stats.positions}</dd></div>
              <div className={stats.vacant ? "is-warn" : undefined}><dt>Vacantes</dt><dd>{stats.vacant}</dd></div>
              <div><dt>Personas activas</dt><dd>{stats.active}</dd></div>
              <div className={stats.withoutPosition ? "is-warn" : undefined}><dt>Sin puesto</dt><dd>{stats.withoutPosition}</dd></div>
            </dl>
            <OrgChart
              tree={tree}
              onSelect={(id) => setPositionMode({ type: "edit", positionId: id })}
              onAddBelow={(id) => setPositionMode({ type: "new", parentId: id })}
            />
          </div>
        )}
      </section>

      {positionMode && team && (
        <PositionForm
          key={JSON.stringify(positionMode)}
          team={team}
          mode={positionMode}
          onClose={() => setPositionMode(null)}
          onAddBelow={(id) => setPositionMode({ type: "new", parentId: id })}
          onSaved={afterSave}
        />
      )}

      {personSheet && (
        <PersonSheet
          key={personSheet.employee?.id ?? "nuevo"}
          employee={personSheet.employee}
          team={team}
          onClose={() => setPersonSheet(null)}
          onSaved={afterSave}
        />
      )}

      {toast && <div className="team-toast" role="status">{toast}</div>}
    </div>
  );
}
