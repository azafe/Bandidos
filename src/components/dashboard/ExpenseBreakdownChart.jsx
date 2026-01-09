// src/components/dashboard/ExpenseBreakdownChart.jsx
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#ff4fa8", "#f97316", "#22c55e", "#38bdf8", "#a855f7"];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function ExpenseBreakdownChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">Sin gastos para este rango.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
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
          formatter={(value) => formatCurrency(value)}
          labelFormatter={(label) => `Categoría: ${label}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
