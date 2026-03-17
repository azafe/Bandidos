// src/pages/DashboardHome.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SkeletonDashboard from "../components/dashboard/SkeletonDashboard";
import DecisionCenter from "../components/dashboard/DecisionCenter";
import { fetchDashboardData } from "../lib/dashboardApi";
import { buildDashboardMetrics } from "../lib/dashboardMetrics";
import "../styles/dashboard.css";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset; // Date normalizes negative values
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0); // last day of month
  const today = new Date();
  const effectiveTo = to > today ? today : to;
  return {
    from: formatDate(from),
    to: formatDate(effectiveTo),
    label: from.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
  };
}

function getPreviousRange(range) {
  const from = new Date(range.from);
  const prevMonthEnd = new Date(from.getFullYear(), from.getMonth(), 0);
  const prevMonthStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  return {
    from: formatDate(prevMonthStart),
    to: formatDate(prevMonthEnd),
    label: "Mes anterior",
  };
}

export default function DashboardHome() {
  const [monthOffset, setMonthOffset] = useState(0);
  const range = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const previousRange = useMemo(() => getPreviousRange(range), [range]);

  const [metrics, setMetrics] = useState(null);
  const [rawFixedExpenses, setRawFixedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [currentData, previousData] = await Promise.all([
          fetchDashboardData(range),
          fetchDashboardData(previousRange),
        ]);
        if (!active) return;
        const computed = buildDashboardMetrics({
          range,
          current: currentData,
          previous: { range: previousRange, current: previousData },
          categories: currentData.categories,
        });
        setMetrics(computed);
        setRawFixedExpenses(currentData.fixedExpenses || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudo cargar el dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [range, previousRange]);

  if (loading) {
    return (
      <div className="page-content">
        <DashboardHeader
          monthOffset={monthOffset}
          range={range}
          onMonthOffsetChange={setMonthOffset}
        />
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <DashboardHeader
          monthOffset={monthOffset}
          range={range}
          onMonthOffsetChange={setMonthOffset}
        />
        <div className="dashboard-error card">
          <h3 className="card-title">No pudimos cargar el dashboard</h3>
          <p className="card-subtitle">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.empty) {
    return (
      <div className="page-content">
        <DashboardHeader
          monthOffset={monthOffset}
          range={range}
          onMonthOffsetChange={setMonthOffset}
        />
        <div className="dashboard-empty card">
          <h3 className="card-title">Sin datos en este período</h3>
          <p className="card-subtitle">
            Empezá registrando un servicio o un gasto para ver tus métricas.
          </p>
          <div className="modal-actions">
            <Link to="/services/new">
              <button className="btn-primary" type="button">
                + Registrar servicio
              </button>
            </Link>
            <Link to="/expenses/daily">
              <button className="btn-secondary" type="button">
                + Registrar gasto
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <DashboardHeader
        monthOffset={monthOffset}
        range={range}
        onMonthOffsetChange={setMonthOffset}
      />

      <DecisionCenter kpis={metrics.kpis} fixedExpenses={rawFixedExpenses} />

    </div>
  );
}
