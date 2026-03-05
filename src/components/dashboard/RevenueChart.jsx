// src/components/dashboard/RevenueChart.jsx
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDateLabel(label) {
  if (!label || label.length < 10) return label;
  return `${label.slice(8, 10)}/${label.slice(5, 7)}`;
}

export default function RevenueChart({ data }) {
  if (!data || !data.length) {
    return <div className="chart-empty">Sin datos para este rango.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} barGap={4}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={formatDateLabel}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => {
            const labels = {
              income: "Ingresos",
              expense: "Gastos",
              profit: "Ganancia",
            };
            return [formatCurrency(value), labels[name] || name];
          }}
          labelFormatter={(label) => formatDateLabel(label)}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload || {};
            return (
              <div className="recharts-custom-tooltip">
                <p className="recharts-custom-tooltip__label">{formatDateLabel(label)}</p>
                {d.servicesIncome !== undefined && (
                  <p>Servicios: {formatCurrency(d.servicesIncome)}</p>
                )}
                {d.petshopIncome !== undefined && (
                  <p>PetShop: {formatCurrency(d.petshopIncome)}</p>
                )}
                <p><strong>Ingresos: {formatCurrency(d.income)}</strong></p>
                <p>Gastos: {formatCurrency(d.expense)}</p>
                <p>Ganancia: {formatCurrency(d.profit)}</p>
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) =>
            ({ income: "Ingresos", expense: "Gastos", profit: "Ganancia" }[value] || value)
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
        <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="expense" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#ff4fa8"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
