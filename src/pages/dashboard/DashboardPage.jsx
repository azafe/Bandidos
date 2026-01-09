// src/pages/dashboard/DashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}

function pickNumber(summary, keys) {
  for (const key of keys) {
    if (summary?.[key] !== undefined) {
      return Number(summary[key]) || 0;
    }
  }
  return 0;
}

export default function DashboardPage() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const [range, setRange] = useState(() => {
    const { from, to } = getMonthRange();
    return { from: formatDate(from), to: formatDate(to) };
  });
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError(null);
        const summaryData = await apiRequest("/reports/summary", {
          params: { ...range, include_fixed: true },
        });
        const dailyData = await apiRequest("/reports/daily", {
          params: range,
        });
        if (!active) return;
        setSummary(summaryData || {});
        setDaily(Array.isArray(dailyData) ? dailyData : dailyData?.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudieron cargar los reportes.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();
    return () => {
      active = false;
    };
  }, [range]);

  const kpis = useMemo(() => {
    return {
      income: pickNumber(summary, ["total_income", "income", "totalIncome"]),
      expenses: pickNumber(summary, [
        "total_expenses",
        "expenses",
        "totalExpenses",
      ]),
      fixed: pickNumber(summary, [
        "total_fixed",
        "fixed_expenses",
        "fixedExpenses",
      ]),
      services: pickNumber(summary, [
        "total_services",
        "services",
        "serviceCount",
      ]),
    };
  }, [summary]);

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="page-subtitle">
            Resumen del negocio de Bandidos · {formattedDate}
          </p>
        </div>
        <Link to="/services/new">
          <button className="btn-primary">+ Registrar servicio</button>
        </Link>
      </header>

      {/* KPIs principales */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Ingresos del período</span>
          <span className="kpi-value">
            ${kpis.income.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Gastos del período</span>
          <span className="kpi-value">
            ${kpis.expenses.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Gastos fijos</span>
          <span className="kpi-value">
            ${kpis.fixed.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Servicios del período</span>
          <span className="kpi-value">{kpis.services}</span>
        </div>
      </section>

      {/* Grilla de tarjetas */}
      <section className="dashboard-grid">
        {/* Resumen diario */}
        <div className="card">
          <h2 className="card-title">Resumen diario</h2>
          <p className="card-subtitle">
            Reporte por día para el rango seleccionado.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <label className="form-field">
              <span>Desde</span>
              <input
                type="date"
                value={range.from}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, from: e.target.value }))
                }
              />
            </label>
            <label className="form-field">
              <span>Hasta</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </label>
          </div>

          {loading ? (
            <div className="card-subtitle">Cargando reportes...</div>
          ) : error ? (
            <div className="card-subtitle" style={{ color: "#f37b7b" }}>
              {error}
            </div>
          ) : (
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Servicios</th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 16 }}>
                      No hay datos para el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  daily.map((row, index) => (
                    <tr key={row.date || index}>
                      <td>{row.date || row.day || "-"}</td>
                      <td>
                        $
                        {Number(
                          row.income || row.total_income || row.totalIncome || 0
                        ).toLocaleString("es-AR")}
                      </td>
                      <td>
                        $
                        {Number(
                          row.expenses ||
                            row.total_expenses ||
                            row.totalExpenses ||
                            0
                        ).toLocaleString("es-AR")}
                      </td>
                      <td>{row.services || row.total_services || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h2 className="card-title">Accesos rápidos</h2>
          <p className="card-subtitle">Tareas frecuentes de Bandidos</p>

          <div className="quick-actions">
            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">
                  Registrar nuevo servicio
                </div>
                <div className="quick-actions__hint">
                  Baño, corte o completo
                </div>
              </div>
              <Link to="/services/new">
                <button className="btn-primary" style={{ padding: "6px 14px" }}>
                  Ir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">Ver servicios</div>
                <div className="quick-actions__hint">
                  Historial de perros atendidos
                </div>
              </div>
              <Link to="/services">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">Registrar gasto diario</div>
                <div className="quick-actions__hint">
                  Shampoo, limpieza, snacks
                </div>
              </div>
              <Link to="/expenses/daily">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>

            <div className="quick-actions__item">
              <div>
                <div className="quick-actions__label">
                  Gastos fijos del mes
                </div>
                <div className="quick-actions__hint">
                  Alquiler, servicios, sueldos
                </div>
              </div>
              <Link to="/expenses/fixed">
                <button className="btn-secondary" style={{ padding: "6px 14px" }}>
                  Abrir
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
