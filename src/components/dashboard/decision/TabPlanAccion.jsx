// src/components/dashboard/decision/TabPlanAccion.jsx
const fmt = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

export default function TabPlanAccion({ kpis, fixedBreakdown }) {
  const { income, servicesIncome, petshopIncome, profit, servicesCount, avgTicket, groomerCommissions } = kpis;

  const commissionRate = servicesIncome > 0 ? groomerCommissions / servicesIncome : 0.40;
  const targetProfit   = income * 0.30;
  const gap            = Math.max(0, targetProfit - profit);

  const alquiler = fixedBreakdown.find((i) => /alquiler/i.test(i.label))?.value || 0;

  const actions = [
    {
      icon: "📈",
      title: "Subir precios 10%",
      desc: `Subir el precio promedio un 10% sobre los ${fmt(income)} de ingresos actuales generaría ${fmt(income * 0.10 * (1 - commissionRate))} adicionales de ganancia neta (ya descontando comisión del ${pct(commissionRate)}).`,
      impact: income * 0.10 * (1 - commissionRate),
      impactLevel: "ALTO",
      diffLevel: "MODERADO",
    },
    commissionRate > 0.35
      ? {
          icon: "🤝",
          title: "Renegociar comisión al 35%",
          desc: `La comisión actual es del ${pct(commissionRate)}. Bajarla al 35% ahorraría ${fmt(servicesIncome * Math.max(0, commissionRate - 0.35))} por mes.`,
          impact: servicesIncome * Math.max(0, commissionRate - 0.35),
          impactLevel: "ALTO",
          diffLevel: "DIFÍCIL",
        }
      : {
          icon: "✅",
          title: "Comisión en objetivo",
          desc: `La comisión actual (${pct(commissionRate)}) ya está en el objetivo ≤35%. ¡Bien!`,
          impact: 0,
          impactLevel: "BAJO",
          diffLevel: "FÁCIL",
          achieved: true,
        },
    {
      icon: "👥",
      title: "+8 clientes nuevos",
      desc: `Sumar 8 clientes al ticket promedio de ${fmt(avgTicket)} generaría ${fmt(8 * avgTicket * (1 - commissionRate))} de ganancia neta adicional por mes.`,
      impact: 8 * avgTicket * (1 - commissionRate),
      impactLevel: avgTicket * 8 > 5000 ? "ALTO" : "MEDIO",
      diffLevel: "MODERADO",
    },
    {
      icon: "🏠",
      title: "Revisar alquiler",
      desc: alquiler > 0
        ? `El alquiler registrado es ${fmt(alquiler)}. Renegociar un 10% de reducción ahorraría ${fmt(alquiler * 0.10)} por mes.`
        : "No se encontró un ítem de alquiler en los gastos fijos. Revisá si está cargado correctamente.",
      impact: alquiler * 0.10,
      impactLevel: alquiler * 0.10 > 3000 ? "ALTO" : "MEDIO",
      diffLevel: "DIFÍCIL",
    },
    {
      icon: "🛒",
      title: "Duplicar ventas PetShop",
      desc: petshopIncome > 0
        ? `Las ventas de PetShop generan ${fmt(petshopIncome)}/mes sin comisión. Duplicarlas agregaría ${fmt(petshopIncome)} de ganancia directa.`
        : "No hay ventas de PetShop registradas. Activar este canal es 100% ganancia adicional.",
      impact: petshopIncome,
      impactLevel: petshopIncome > 5000 ? "ALTO" : petshopIncome > 1000 ? "MEDIO" : "BAJO",
      diffLevel: "MODERADO",
    },
    {
      icon: "📅",
      title: "Reducir no-shows",
      desc: `Reducir los no-shows un 10% equivale a ${fmt(servicesCount * 0.10 * avgTicket * (1 - commissionRate))} de ganancia recuperada por mes (sobre ${servicesCount} servicios a ${fmt(avgTicket)} promedio).`,
      impact: servicesCount * 0.10 * avgTicket * (1 - commissionRate),
      impactLevel: "MEDIO",
      diffLevel: "FÁCIL",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="cd-action-header">
        {gap > 0 ? (
          <>
            <div className="cd-action-header__gap">{fmt(gap)}</div>
            <div className="cd-action-header__sub">
              Faltan {fmt(gap)} para llegar al 30% de margen ({fmt(targetProfit)} objetivo vs {fmt(profit)} actual)
            </div>
          </>
        ) : (
          <>
            <div className="cd-action-header__ok">¡Objetivo 30% alcanzado!</div>
            <div className="cd-action-header__sub">
              Margen actual por encima del objetivo. Estas acciones pueden mejorar aún más tu posición.
            </div>
          </>
        )}
      </div>

      {/* Grid de acciones */}
      <div className="cd-action-grid">
        {actions.map((action) => (
          <div className="cd-action-card" key={action.title}>
            <div className="cd-action-card__icon">{action.icon}</div>
            <div className="cd-action-card__title">{action.title}</div>
            <div className="cd-action-card__desc">{action.desc}</div>
            <div className={`cd-action-card__impact${action.achieved ? " negative" : ""}`}>
              {action.achieved ? "Ya en objetivo" : `+${fmt(action.impact)}/mes`}
            </div>
            <div className="cd-action-card__badges">
              <span className={`cd-badge-impact cd-badge-impact--${action.impactLevel.toLowerCase()}`}>
                {action.impactLevel}
              </span>
              <span className={`cd-badge-diff cd-badge-diff--${action.diffLevel === "FÁCIL" ? "facil" : action.diffLevel === "MODERADO" ? "moderado" : "dificil"}`}>
                {action.diffLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
