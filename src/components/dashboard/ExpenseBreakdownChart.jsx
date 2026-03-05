// src/components/dashboard/ExpenseBreakdownChart.jsx
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#ff4fa8", "#f97316", "#22c55e", "#38bdf8", "#a855f7"];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function ExpenseBreakdownChart({ data }) {
  if (!data || !data.length) {
    return <div className="chart-empty">Sin gastos para este rango.</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const renderLabel = ({ name, value }) => {
    const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
    return `${name} (${pct}%)`;
  };

  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name]}
          />
          <Legend
            formatter={(value, entry) => {
              const pct =
                total > 0
                  ? ((entry.payload.value / total) * 100).toFixed(0)
                  : 0;
              return `${value} (${pct}%)`;
            }}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -68%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--color-text-soft)" }}>
          Total
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1b1f2f" }}>
          {formatCurrency(total)}
        </div>
      </div>
    </div>
  );
}
