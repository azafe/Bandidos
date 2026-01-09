// src/components/dashboard/ProfitTrendChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function ProfitTrendChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">Sin datos para este rango.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          labelFormatter={(label) => `Fecha: ${label}`}
        />
        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#ff4fa8"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
