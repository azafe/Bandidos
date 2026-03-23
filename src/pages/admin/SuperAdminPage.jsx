import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/ui/Modal";
import {
  getTenants,
  createTenant,
  updateTenant,
  createTenantAdmin,
} from "../../services/superAdminApi";

const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "agenda", label: "Agenda" },
  { id: "services", label: "Servicios" },
  { id: "customers", label: "Clientes" },
  { id: "pets", label: "Mascotas" },
  { id: "expenses", label: "Gastos (Diarios y Fijos)" },
  { id: "employees", label: "Estilistas" },
  { id: "suppliers", label: "Proveedores" },
  { id: "catalog", label: "Catálogos" },
  { id: "petshop", label: "PetShop" },
  { id: "comunicaciones", label: "Comunicaciones" },
];

const DEFAULT_MODULES = MODULES.reduce((acc, m) => ({ ...acc, [m.id]: true }), {});

const EMPTY_TENANT_FORM = { 
  name: "", 
  logo_url: "", 
  primary_color: "#d948ef", 
  secondary_color: "#ff4fa8", 
  plan: "basic",
  enabled_modules: DEFAULT_MODULES
};
const EMPTY_ADMIN_FORM  = { email: "", password: "" };

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [tenants, setTenants]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Modal: nuevo tenant
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [tenantForm, setTenantForm]       = useState(EMPTY_TENANT_FORM);
  const [savingTenant, setSavingTenant]   = useState(false);

  // Modal: nuevo admin
  const [adminTarget, setAdminTarget]     = useState(null); // tenant al que se agrega admin
  const [adminForm, setAdminForm]         = useState(EMPTY_ADMIN_FORM);
  const [savingAdmin, setSavingAdmin]     = useState(false);

  // Modal: editar tenant
  const [editTarget, setEditTarget]       = useState(null);
  const [editForm, setEditForm]           = useState(EMPTY_TENANT_FORM);
  const [savingEdit, setSavingEdit]       = useState(false);

  // Modal: suspender tenant
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendCustom, setSuspendCustom] = useState("");
  const [savingSuspend, setSavingSuspend] = useState(false);

  if (user?.role !== "super_admin") {
    return (
      <div className="page-content">
        <div className="card">Acceso exclusivo para Super Admin.</div>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      setError(err.message || "Error al cargar tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleModuleToggle = (modId, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        enabled_modules: {
          ...prev.enabled_modules,
          [modId]: !prev.enabled_modules?.[modId]
        }
      }));
    } else {
      setTenantForm(prev => ({
        ...prev,
        enabled_modules: {
          ...prev.enabled_modules,
          [modId]: !prev.enabled_modules?.[modId]
        }
      }));
    }
  };

  // ── Nuevo tenant ─────────────────────────────────────────────────────────
  async function handleCreateTenant(e) {
    e.preventDefault();
    if (!tenantForm.name.trim()) { alert("Ingresá un nombre."); return; }
    setSavingTenant(true);
    try {
      await createTenant({
        ...tenantForm,
        name:            tenantForm.name.trim(),
        logo_url:        tenantForm.logo_url.trim()         || null,
      });
      setShowNewTenant(false);
      setTenantForm(EMPTY_TENANT_FORM);
      await load();
    } catch (err) {
      alert(err.message || "No se pudo crear el tenant.");
    } finally {
      setSavingTenant(false);
    }
  }

  // ── Editar tenant ─────────────────────────────────────────────────────────
  function openEdit(tenant) {
    setEditTarget(tenant);
    setEditForm({
      name:            tenant.name            || "",
      logo_url:        tenant.logo_url        || "",
      primary_color:   tenant.primary_color   || "#d948ef",
      secondary_color: tenant.secondary_color || "#ff4fa8",
      plan:            tenant.plan            || "basic",
      enabled_modules: tenant.enabled_modules || DEFAULT_MODULES,
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editForm.name.trim()) { alert("Ingresá un nombre."); return; }
    setSavingEdit(true);
    try {
      await updateTenant(editTarget.id, {
        ...editForm,
        name: editForm.name.trim(),
        logo_url: editForm.logo_url.trim() || null,
      });
      setEditTarget(null);
      await load();
    } catch (err) {
      alert(err.message || "No se pudo guardar.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────
  function openSuspend(tenant) {
    setSuspendTarget(tenant);
    setSuspendReason("payment");
    setSuspendCustom("");
  }

  async function handleSuspend(e) {
    e.preventDefault();
    const reason = suspendReason === "other" ? suspendCustom.trim() : suspendReason;
    setSavingSuspend(true);
    try {
      await updateTenant(suspendTarget.id, { status: "inactive", suspended_reason: reason || null });
      setSuspendTarget(null);
      await load();
    } catch (err) {
      alert(err.message || "No se pudo suspender.");
    } finally {
      setSavingSuspend(false);
    }
  }

  async function reactivateTenant(tenant) {
    if (!window.confirm(`¿Reactivar el tenant "${tenant.name}"?`)) return;
    try {
      await updateTenant(tenant.id, { status: "active", suspended_reason: null });
      await load();
    } catch (err) {
      alert(err.message || "No se pudo reactivar.");
    }
  }

  // ── Crear admin ───────────────────────────────────────────────────────────
  async function handleCreateAdmin(e) {
    e.preventDefault();
    if (!adminForm.email.trim() || !adminForm.password) {
      alert("Completá email y contraseña.");
      return;
    }
    setSavingAdmin(true);
    try {
      await createTenantAdmin(adminTarget.id, {
        email:    adminForm.email.trim(),
        password: adminForm.password,
      });
      alert(`Admin creado: ${adminForm.email.trim()}`);
      setAdminTarget(null);
      setAdminForm(EMPTY_ADMIN_FORM);
      await load();
    } catch (err) {
      alert(err.message || "No se pudo crear el admin.");
    } finally {
      setSavingAdmin(false);
    }
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString("es-AR");

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Super Admin</h1>
          <p className="page-subtitle">Gestión global de tenants del SaaS.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewTenant(true)}>
          + Nuevo tenant
        </button>
      </header>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Tenants</h2>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error   && <div className="card-subtitle" style={{ color: "#f37b7b" }}>{error}</div>}

        <div className="list-wrapper">
          {!loading && tenants.length === 0 && (
            <div className="card-subtitle" style={{ textAlign: "center" }}>Sin tenants.</div>
          )}
          {tenants.map((t) => (
            <div key={t.id} className="list-item" style={{ alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="list-item__header">
                  <span className="list-item__title">{t.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: t.status === "active" ? "#dcfce7" : "#fee2e2",
                      color:      t.status === "active" ? "#166534" : "#991b1b",
                    }}
                  >
                    {t.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="list-item__meta">
                  <span>Plan: {t.plan}</span>
                  <span>Usuarios: {t.user_count}</span>
                  <span>Alta: {fmt(t.created_at)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={() => openEdit(t)}>
                  Editar
                </button>
                <button className="btn-secondary" onClick={() => { setAdminTarget(t); setAdminForm(EMPTY_ADMIN_FORM); }}>
                  Crear admin
                </button>
                {t.status === "active" ? (
                  <button className="btn-danger" onClick={() => openSuspend(t)}>
                    Suspender
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => reactivateTenant(t)}>
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: nuevo tenant */}
      <Modal isOpen={showNewTenant} onClose={() => setShowNewTenant(false)} title="Nuevo tenant">
        <form onSubmit={handleCreateTenant}>
          <div className="form-grid">
            <div className="form-field">
              <label>Nombre *</label>
              <input value={tenantForm.name} onChange={(e) => setTenantForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Plan</label>
              <select value={tenantForm.plan} onChange={(e) => setTenantForm(p => ({ ...p, plan: e.target.value }))}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className="form-field">
              <label>Logo URL</label>
              <input type="url" value={tenantForm.logo_url} onChange={(e) => setTenantForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-field">
              <label>Color primario</label>
              <input type="color" value={tenantForm.primary_color} onChange={(e) => setTenantForm(p => ({ ...p, primary_color: e.target.value }))} style={{ height: 38, padding: 2 }} />
            </div>
            <div className="form-field">
              <label>Color secundario</label>
              <input type="color" value={tenantForm.secondary_color} onChange={(e) => setTenantForm(p => ({ ...p, secondary_color: e.target.value }))} style={{ height: 38, padding: 2 }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Módulos habilitados</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {MODULES.map(m => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={tenantForm.enabled_modules?.[m.id] !== false} 
                    onChange={() => handleModuleToggle(m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowNewTenant(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingTenant}>
              {savingTenant ? "Guardando..." : "Crear tenant"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: editar tenant */}
      <Modal isOpen={Boolean(editTarget)} onClose={() => setEditTarget(null)} title={`Editar: ${editTarget?.name}`}>
        <form onSubmit={handleSaveEdit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Nombre *</label>
              <input value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Plan</label>
              <select value={editForm.plan} onChange={(e) => setEditForm(p => ({ ...p, plan: e.target.value }))}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className="form-field">
              <label>Logo URL</label>
              <input type="url" value={editForm.logo_url} onChange={(e) => setEditForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-field">
              <label>Color primario</label>
              <input type="color" value={editForm.primary_color} onChange={(e) => setEditForm(p => ({ ...p, primary_color: e.target.value }))} style={{ height: 38, padding: 2 }} />
            </div>
            <div className="form-field">
              <label>Color secundario</label>
              <input type="color" value={editForm.secondary_color} onChange={(e) => setEditForm(p => ({ ...p, secondary_color: e.target.value }))} style={{ height: 38, padding: 2 }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: "block" }}>Módulos habilitados</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {MODULES.map(m => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.enabled_modules?.[m.id] !== false} 
                    onChange={() => handleModuleToggle(m.id, true)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingEdit}>
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: crear admin */}
      <Modal isOpen={Boolean(adminTarget)} onClose={() => setAdminTarget(null)} title={`Crear admin para: ${adminTarget?.name}`}>
        <form onSubmit={handleCreateAdmin}>
          <div className="form-grid">
            <div className="form-field">
              <label>Email *</label>
              <input type="email" value={adminForm.email} onChange={(e) => setAdminForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Contraseña temporal *</label>
              <input type="password" value={adminForm.password} onChange={(e) => setAdminForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setAdminTarget(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingAdmin}>
              {savingAdmin ? "Creando..." : "Crear admin"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: suspender tenant */}
      <Modal isOpen={Boolean(suspendTarget)} onClose={() => setSuspendTarget(null)} title={`Suspender: ${suspendTarget?.name}`}>
        <form onSubmit={handleSuspend}>
          <div className="form-grid">
            <div className="form-field">
              <label>Motivo</label>
              <select value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}>
                <option value="payment">Falta de pago</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="admin">Decisión administrativa</option>
                <option value="other">Otro...</option>
              </select>
            </div>
            {suspendReason === "other" && (
              <div className="form-field">
                <label>Especificá el motivo</label>
                <input
                  value={suspendCustom}
                  onChange={(e) => setSuspendCustom(e.target.value)}
                  placeholder="Motivo de suspensión..."
                />
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setSuspendTarget(null)}>Cancelar</button>
            <button type="submit" className="btn-danger" disabled={savingSuspend}>
              {savingSuspend ? "Suspendiendo..." : "Confirmar suspensión"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
