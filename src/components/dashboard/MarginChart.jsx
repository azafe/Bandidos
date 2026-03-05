// src/components/dashboard/MarginChart.jsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function formatDateLabel(label) {
  if (!label || label.length < 10) return label;
  return `${label.slice(8, 10)}/${label.slice(5, 7)}`;
}

export default function MarginChart({ data }) {
  if (!data || !data.length) {
    return <div className="chart-empty">Sin datos para este rango.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={formatDateLabel}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          width={44}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(value) => [`${(value * 100).toFixed(1)}%`, "Margen"]}
          labelFormatter={(label) => formatDateLabel(label)}
        />
        <ReferenceLine
          y={0}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{ value: "0%", position: "insideLeft", fontSize: 10, fill: "#9ca3af" }}
        />
        <ReferenceLine
          y={0.3}
          stroke="#22c55e"
          strokeDasharray="6 3"
          label={{ value: "Meta 30%", position: "insideLeft", fontSize: 10, fill: "#16a34a" }}
        />
        <Area
          type="monotone"
          dataKey="margin"
          stroke="#22c55e"
          fill="url(#marginGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
