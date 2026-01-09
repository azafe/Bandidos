// src/components/dashboard/SkeletonDashboard.jsx
export default function SkeletonDashboard() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton skeleton-header" />
      <div className="skeleton-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`kpi-${i}`} className="skeleton skeleton-card" />
        ))}
      </div>
      <div className="skeleton-chart-row">
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-chart" />
      </div>
      <div className="skeleton-chart-row">
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-chart" />
      </div>
    </div>
  );
}
