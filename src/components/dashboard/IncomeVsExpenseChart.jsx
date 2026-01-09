// src/components/dashboard/IncomeVsExpenseChart.jsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function IncomeVsExpenseChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">Sin datos para este rango.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) =>
            name === "income"
              ? [`${formatCurrency(value)}`, "Ingresos"]
              : [`${formatCurrency(value)}`, "Gastos"]
          }
          labelFormatter={(label) => `Fecha: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#22c55e"
          fill="rgba(34, 197, 94, 0.25)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#f97316"
          fill="rgba(249, 115, 22, 0.25)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
