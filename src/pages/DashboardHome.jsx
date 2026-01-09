// src/pages/DashboardHome.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import KpiGrid from "../components/dashboard/KpiGrid";
import ChartsSection from "../components/dashboard/ChartsSection";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SkeletonDashboard from "../components/dashboard/SkeletonDashboard";
import { fetchDashboardData } from "../lib/dashboardApi";
import { buildDashboardMetrics } from "../lib/dashboardMetrics";
import "../styles/dashboard.css";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getTodayRange() {
  const today = new Date();
  const value = formatDate(today);
  return { from: value, to: value, label: "Hoy" };
}

function getWeekRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  return {
    from: formatDate(from),
    to: formatDate(today),
    label: "Últimos 7 días",
  };
}

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: formatDate(from),
    to: formatDate(now),
    label: "Mes en curso",
  };
}

function daysBetween(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getPreviousRange(range) {
  const totalDays = daysBetween(range.from, range.to);
  const end = new Date(range.from);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - (totalDays - 1));
  return {
    from: formatDate(start),
    to: formatDate(end),
    label: "Período anterior",
  };
}

export default function DashboardHome() {
  const [rangeType, setRangeType] = useState("month");
  const [range, setRange] = useState(() => getMonthRange());
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rangeType === "today") setRange(getTodayRange());
    if (rangeType === "week") setRange(getWeekRange());
    if (rangeType === "month") setRange(getMonthRange());
    if (rangeType === "custom") {
      setRange((prev) => ({ ...prev, label: "Personalizado" }));
    }
  }, [rangeType]);

  function handleRangeChange(nextRange) {
    setRange({ ...nextRange, label: "Personalizado" });
  }

  const previousRange = useMemo(() => getPreviousRange(range), [range]);

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
          rangeType={rangeType}
          range={range}
          onRangeTypeChange={setRangeType}
          onRangeChange={handleRangeChange}
        />
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <DashboardHeader
          rangeType={rangeType}
          range={range}
          onRangeTypeChange={setRangeType}
          onRangeChange={handleRangeChange}
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
          rangeType={rangeType}
          range={range}
          onRangeTypeChange={setRangeType}
          onRangeChange={handleRangeChange}
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
        rangeType={rangeType}
        range={range}
        onRangeTypeChange={setRangeType}
        onRangeChange={handleRangeChange}
      />

      <KpiGrid kpis={metrics.kpis} />

      <ChartsSection series={metrics.series} />

      <section className="dashboard-bottom">
        <div className="dashboard-bottom__main">
          <RecentActivity items={metrics.recentActivity} />
        </div>
        <div className="dashboard-bottom__side">
          <QuickActions />
          <AlertsPanel alerts={metrics.alerts} />
        </div>
      </section>
    </div>
  );
}
