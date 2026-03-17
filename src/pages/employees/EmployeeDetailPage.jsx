// src/pages/employees/EmployeeDetailPage.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";

const ROLE_COLORS = {
  "Groomer":        "#ff4fa8",
  "Recepción":      "#38bdf8",
  "Ayudante":       "#22c55e",
  "Administración": "#a855f7",
  "Otro":           "#8b94a9",
};

const EMPLOYEE_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

function employeeColor(name) {
  if (!name) return EMPLOYEE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EMPLOYEE_COLORS[Math.abs(hash) % EMPLOYEE_COLORS.length];
}

function initial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange() {
  const now = new Date();
  return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now), label: "Mes" };
}

function getWeekRange() {
  const now = new Date();
  const from = new Date(now); from.setDate(now.getDate() - 6);
  return { from: toISO(from), to: toISO(now), label: "Semana" };
}

function getTodayRange() {
  const v = toISO(new Date());
  return { from: v, to: v, label: "Hoy" };
}

function formatDate(value) {
  if (!value) return "-";
  const raw = String(value).split("T")[0];
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function fmt(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("es-AR")}`;
}

function resolvePrice(s) {
  return Number(s.price || s.service_type?.default_price || s.service_price || s.amount || 0) || 0;
}

const COMMISSION_RATE = 0.40;

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [services, setServices]  = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState(null);
  const [range, setRange]        = useState(getMonthRange);
  const [rangeType, setRangeType] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  // Carga service types una sola vez
  useEffect(() => {
    apiRequest("/v2/service-types").then((data) => {
      setServiceTypes(Array.isArray(data) ? data : data?.items || []);
    }).catch(() => {});
  }, []);

  function resolveServiceTypeName(s) {
    return (
      s.service_type?.name ||
      s.service_name ||
      s.type ||
      serviceTypes.find((t) => String(t.id) === String(s.service_type_id))?.name ||
      "Servicio"
    );
  }

  // Carga al montar o cuando cambia el rango
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [empData, agendaData] = await Promise.all([
          apiRequest(`/v2/employees/${id}`),
          apiRequest("/agenda", { params: { from: range.from, to: range.to } }),
        ]);
        if (!active) return;
        setEmployee(empData);
        const all = Array.isArray(agendaData) ? agendaData : agendaData?.items || [];
        setServices(
          all.filter((s) =>
            String(s.groomer_id) === String(id) ||
            String(s.groomer?.id) === String(id)
          )
        );
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudo cargar la ficha.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, range]);

  function applyPreset(type) {
    setRangeType(type);
    if (type === "today") setRange(getTodayRange());
    if (type === "week")  setRange(getWeekRange());
    if (type === "month") setRange(getMonthRange());
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    setRangeType("custom");
    setRange({ from: customFrom, to: customTo, label: "Personalizado" });
  }

  // Métricas
  const totalRevenue     = services.reduce((s, srv) => s + resolvePrice(srv), 0);
  const commission       = totalRevenue * COMMISSION_RATE;
  const avgTicket        = services.length > 0 ? totalRevenue / services.length : 0;
  const sorted           = [...services].sort((a, b) => {
    const da = new Date(a.date || 0), db = new Date(b.date || 0);
    return db - da;
  });

  // Conteo por tipo de servicio
  const byType = services.reduce((acc, s) => {
    const name = resolveServiceTypeName(s) || "Sin tipo";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const color     = employeeColor(employee?.name);
  const roleColor = ROLE_COLORS[employee?.role] || "#8b94a9";
  const isActive  = employee?.status === "active" || employee?.status === "Activo";

  const PRESETS = [
    { key: "today", label: "Hoy" },
    { key: "week",  label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ficha del estilista</h1>
          <p className="page-subtitle">Servicios brindados y métricas del período.</p>
        </div>
        <Link to="/employees" className="btn-secondary">← Volver</Link>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {loading && !employee ? (
        <div className="card card-subtitle" style={{ padding: 32, textAlign: "center" }}>Cargando ficha...</div>
      ) : employee && (
        <>
          {/* Perfil */}
          <div className="pet-detail-profile">
            <div className="pet-detail-profile__bar" style={{ background: color }} />
            <div className="pet-detail-profile__body">
              <div className="pet-detail-profile__left">
                <div className="pet-detail-profile__avatar" style={{ background: color }}>
                  {initial(employee.name)}
                </div>
                <div>
                  <h2 className="pet-detail-profile__name">{employee.name}</h2>
                  <div className="pet-detail-profile__badges" style={{ marginBottom: 8 }}>
                    <span className="employee-card__role-badge" style={{ background: `${roleColor}20`, color: roleColor }}>
                      {employee.role || "Sin rol"}
                    </span>
                    <span className={`fe-card__status${isActive ? " fe-card__status--active" : ""}`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pet-detail-profile__info">
                {employee.phone && <div className="pet-detail-profile__row"><span className="pet-detail-profile__row-label">Teléfono</span><span>{employee.phone}</span></div>}
                {employee.email && <div className="pet-detail-profile__row"><span className="pet-detail-profile__row-label">Email</span><span>{employee.email}</span></div>}
                {employee.notes && <div className="pet-detail-profile__row"><span className="pet-detail-profile__row-label">Notas</span><span>{employee.notes}</span></div>}
              </div>
            </div>
          </div>

          {/* Selector de período */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="emp-detail-range">
              <div className="emp-detail-range__presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`emp-detail-range__btn${rangeType === p.key ? " emp-detail-range__btn--active" : ""}`}
                    onClick={() => applyPreset(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {rangeType === "custom" && (
                <div className="emp-detail-range__custom">
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>→</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                  <button type="button" className="btn-primary" style={{ padding: "6px 14px" }} onClick={applyCustom}>
                    Aplicar
                  </button>
                </div>
              )}
              <span className="emp-detail-range__label">
                {range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} — ${formatDate(range.to)}`}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="card fixed-expenses-summary" style={{ marginBottom: 16 }}>
            <div className="fixed-expenses-summary__kpis">
              <div className="fe-kpi">
                <span>Servicios brindados</span>
                <strong>{services.length}</strong>
              </div>
              <div className="fe-kpi fe-kpi--total">
                <span>Ingresos generados</span>
                <strong>{fmt(totalRevenue)}</strong>
              </div>
              <div className="fe-kpi">
                <span>Comisión del período</span>
                <strong>{fmt(commission)}</strong>
                <small>40% de ingresos</small>
              </div>
              <div className="fe-kpi">
                <span>Ticket promedio</span>
                <strong>{services.length > 0 ? fmt(avgTicket) : "-"}</strong>
              </div>
            </div>

            {/* Top servicios */}
            {topTypes.length > 0 && (
              <div className="fixed-expenses-summary__breakdown">
                <h3 className="card-title" style={{ marginBottom: 12 }}>Servicios más frecuentes</h3>
                <div className="fe-category-bars">
                  {topTypes.map(([name, count]) => {
                    const pct = services.length > 0 ? (count / services.length) * 100 : 0;
                    return (
                      <div key={name} className="fe-category-bar">
                        <div className="fe-category-bar__label">
                          <span className="fe-category-bar__dot" style={{ background: color }} />
                          <span className="fe-category-bar__name">{name}</span>
                          <span className="fe-category-bar__pct">{pct.toFixed(0)}%</span>
                          <span className="fe-category-bar__amount">{count} servicios</span>
                        </div>
                        <div className="fe-category-bar__track">
                          <div className="fe-category-bar__fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <h2 className="card-title">Historial de servicios</h2>
              <p className="card-subtitle">
                {loading ? "Cargando..." : `${services.length} ${services.length === 1 ? "servicio" : "servicios"} · Del más reciente al más antiguo.`}
              </p>
            </div>

            {!loading && services.length === 0 && (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
                Sin servicios en este período.
              </div>
            )}

            <div className="fe-cards-grid">
              {sorted.map((s) => (
                <div key={s.id} className="fe-card" style={{ "--fe-accent": color }}>
                  <div className="fe-card__accent" />
                  <div className="fe-card__body">
                    <div className="fe-card__top">
                      <span className="fe-card__name">{resolveServiceTypeName(s)}</span>
                      <span className="fe-card__date-badge">{formatDate(s.date)}</span>
                    </div>
                    <div className="fe-card__amount">{fmt(resolvePrice(s))}</div>
                    <div className="fe-card__meta">
                      {s.pet_name && <span className="fe-card__badge">{s.pet_name}</span>}
                      {s.payment_method?.name && (
                        <span className="fe-card__meta-item">{s.payment_method.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
