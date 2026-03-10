// src/components/dashboard/RevenueChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function formatCurrency(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("es-AR")}`;
}

function formatDateLabel(label) {
  if (!label || label.length < 10) return label;
  return `${label.slice(8, 10)}/${label.slice(5, 7)}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div className="recharts-custom-tooltip">
      <p className="recharts-custom-tooltip__label">{formatDateLabel(label)}</p>
      <p>Servicios: {formatCurrency(d.servicesIncome)}</p>
      {d.petshopIncome > 0 && <p>PetShop: {formatCurrency(d.petshopIncome)}</p>}
      <p><strong>Total: {formatCurrency(d.income)}</strong></p>
    </div>
  );
}

export default function RevenueChart({ data }) {
  if (!data || !data.length) {
    return <div className="chart-empty">Sin datos para este rango.</div>;
  }

  const hasPetshop = data.some((d) => d.petshopIncome > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={24}>
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
        <Tooltip content={<CustomTooltip />} />
        {hasPetshop && (
          <Legend
            formatter={(value) =>
              ({ servicesIncome: "Servicios", petshopIncome: "PetShop" }[value] || value)
            }
            wrapperStyle={{ fontSize: 12 }}
          />
        )}
        <Bar dataKey="servicesIncome" stackId="income" fill="#22c55e" radius={hasPetshop ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
        {hasPetshop && (
          <Bar dataKey="petshopIncome" stackId="income" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
