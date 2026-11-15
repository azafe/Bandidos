// Gráficos de las propuestas a inversores. Los datos van en pesos; `fmt`
// (format.js) los muestra en la moneda de la propuesta.
// Colores (validados para daltonismo sobre fondo blanco): magenta de la marca
// para lo esperado, naranja para «si va peor», verde agua para «si va mejor».
// El verde tiene poco contraste: todos los gráficos llevan etiqueta directa y
// tabla con los números.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cloneElement, useContext } from "react";
import { INVERSION_PARTES } from "../../lib/sucursal";
import { PRINT_WIDTH, PrintContext } from "./printContext";
import { recuperoText } from "./format";

const COLORS = {
  esperado: "#b12fd1",
  peor: "#eb6834",
  mejor: "#1baf7a",
  referencia: "#6b7180",
  grid: "#f1f2f8",
  axis: "#ececf3",
  tick: "#6b7180",
};

const tick = { fontSize: 12, fill: COLORS.tick };

// En pantalla el gráfico ocupa el ancho disponible; impreso, un ancho fijo.
function ChartBox({ height, print = "full", children }) {
  const printing = useContext(PrintContext);
  if (printing) return cloneElement(children, { width: PRINT_WIDTH[print], height });
  return <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>;
}

function ChartTooltip({ active, payload, label, fmt, labelFmt, series }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="inv-tooltip">
      <strong>{labelFmt ? labelFmt(label) : label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey} className="inv-tooltip__row">
          <span className="inv-tooltip__swatch" style={{ background: p.color }} />
          <span>{series?.[p.dataKey] ?? p.name}</span>
          <b>{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

// Etiqueta con el nombre de la serie en el último punto de la línea.
function endLabel(text, color, lastIndex) {
  const EndLabel = ({ x, y, index }) =>
    index === lastIndex ? (
      <text x={x - 6} y={y - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="#14151c">
        <tspan fill={color}>●</tspan> {text}
      </text>
    ) : null;
  return EndLabel;
}

function Figure({ title, subtitle, children, table }) {
  return (
    <figure className="inv-chart">
      <figcaption>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </figcaption>
      {children}
      {table && (
        <details className="inv-details">
          <summary>Ver los números</summary>
          <div className="inv-table-wrap">{table}</div>
        </details>
      )}
    </figure>
  );
}

const monthTick = (m) => `Mes ${m}`;
// Para tablas largas: un mes por trimestre y el último.
const sampleMonths = (rows) => rows.filter((r, i) => r.month % 3 === 0 || r.month === 1 || i === rows.length - 1);

// Lo que el inversor ya cobró contra lo que puso. La comparación con su tasa
// exigida va en números (TIR): una línea de «lo que tendría en otra cosa»
// engaña, porque ignora que lo cobrado antes se puede reinvertir.
export function CobradoChart({ view, fmt, height = 300, print = "full" }) {
  const { meses, investor, esperado, horizon, plan } = view;
  const monto = investor.deal.monto;
  const data = [{ month: 0, cobrado: 0 }, ...meses];
  const last = data.length - 1;
  const recupero = esperado.inversor.payback;
  const recompra = investor.deal.tipo !== "prestamo" && plan.valorFinalMeses > 0;
  return (
    <Figure
      title="Lo que vuelve a tu bolsillo"
      subtitle={`La línea gris punteada es lo que pusiste. Recuperás todo cuando la curva la cruza${recupero ? `, en el mes ${recupero}` : ""}.`}
      table={
        <table className="inv-table">
          <thead><tr><th>Mes</th><th>Cobrado en el mes</th><th>Cobrado acumulado</th></tr></thead>
          <tbody>
            {sampleMonths(meses).map((m) => (
              <tr key={m.month}><td>{m.month}</td><td>{fmt.money(m.cobro)}</td><td>{fmt.money(m.cobrado)}</td></tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ChartBox height={height} print={print}>
        <LineChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={{ stroke: COLORS.axis }} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={80} tickFormatter={fmt.short} />
          <Tooltip content={<ChartTooltip fmt={fmt.money} labelFmt={monthTick} series={{ cobrado: "Lo que ya cobraste" }} />} />
          <ReferenceLine y={monto} stroke={COLORS.referencia} strokeDasharray="5 4"
            label={{ value: `Lo que pusiste: ${fmt.short(monto)}`, position: "insideTopLeft", fontSize: 12, fill: "#14151c" }} />
          {recupero && <ReferenceLine x={recupero} stroke={COLORS.esperado} strokeDasharray="3 3"
            label={recupero < horizon
              ? { value: `Recuperás: mes ${recupero}`, position: recupero > horizon * 0.75 ? "insideTopRight" : "top", fontSize: 12, fill: "#14151c" }
              : undefined} />}
          <Line dataKey="cobrado" name="Lo que ya cobraste" stroke={COLORS.esperado} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false}
            label={endLabel("Lo que ya cobraste", COLORS.esperado, last)} />
        </LineChart>
      </ChartBox>
      <p className="inv-chart__note">
        A {horizon} meses cobrás {fmt.money(esperado.inversor.recibido)} por {fmt.money(monto)} puestos.
        {recompra && ` El salto del último mes es la recompra de tu parte (${plan.valorFinalMeses} meses de ganancia).`}
      </p>
    </Figure>
  );
}

// Lo cobrado en los tres escenarios.
export function EscenariosChart({ view, fmt, height = 300, print = "full" }) {
  const { meses, investor, escenarios, horizon } = view;
  const data = [{ month: 0, peor: 0, cobrado: 0, mejor: 0 }, ...meses];
  const last = data.length - 1;
  const label = (id) => escenarios.find((s) => s.id === id).label;
  // En un préstamo las cuotas no dependen de la sucursal: los tres escenarios
  // dan lo mismo y se muestra una sola línea.
  const iguales = escenarios.every((s) => Math.abs(s.inversor.recibido - escenarios[1].inversor.recibido) < 1);
  const series = iguales
    ? { cobrado: "Los tres escenarios" }
    : { peor: `${label("pesimista")} (−30%)`, cobrado: label("esperado"), mejor: `${label("optimista")} (+20%)` };
  const lineas = iguales
    ? [["cobrado", COLORS.esperado, "Igual en los tres"]]
    : [["peor", COLORS.peor, "Si va peor"], ["cobrado", COLORS.esperado, "Esperado"], ["mejor", COLORS.mejor, "Si va mejor"]];
  return (
    <Figure
      title="Lo que cobrás según cómo le vaya a la sucursal"
      subtitle={iguales
        ? "Cobrás lo mismo aunque la sucursal tenga 30% menos clientes o 20% más: tus cuotas no dependen de cómo le vaya."
        : "«Si va peor» es con 30% menos clientes de lo esperado; «si va mejor», con 20% más."}
      table={
        <table className="inv-table">
          <thead><tr><th>Escenario</th><th>Cobrás en total</th><th>Múltiplo</th><th>Recuperás</th><th>Rinde por año (TIR)</th></tr></thead>
          <tbody>
            {escenarios.map((s) => (
              <tr key={s.id} className={s.id === "esperado" ? "is-current" : undefined}>
                <td>{s.label}</td>
                <td>{fmt.money(s.inversor.recibido)}</td>
                <td>{s.inversor.multiplo === null ? "—" : `${s.inversor.multiplo.toLocaleString("es-AR", { maximumFractionDigits: 2 })}x`}</td>
                <td>{recuperoText(s.inversor.payback, horizon)}</td>
                <td>{s.inversor.tirAnual === null ? "—" : `${Math.round(s.inversor.tirAnual * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {lineas.length > 1 && (
        <ul className="inv-legend">
          {lineas.map(([key, color]) => (
            <li key={key}><span className="inv-legend__line" style={{ background: color }} />{series[key]}</li>
          ))}
        </ul>
      )}
      <ChartBox height={height} print={print}>
        <LineChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={{ stroke: COLORS.axis }} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={80} tickFormatter={fmt.short} />
          <Tooltip content={<ChartTooltip fmt={fmt.money} labelFmt={monthTick} series={series} />} />
          <ReferenceLine y={investor.deal.monto} stroke={COLORS.referencia} strokeDasharray="5 4"
            label={{ value: "Lo que pusiste", position: "insideTopLeft", fontSize: 12, fill: "#14151c" }} />
          {lineas.map(([key, color, texto]) => (
            <Line key={key} dataKey={key} name={series[key]} stroke={color} strokeWidth={key === "cobrado" ? 2.5 : 2} dot={false} isAnimationActive={false}
              label={endLabel(texto, color, last)} />
          ))}
        </LineChart>
      </ChartBox>
    </Figure>
  );
}

// Lo que cobra el inversor cada mes en el escenario esperado.
export function CobrosMensualesChart({ view, fmt, height = 240, print = "full" }) {
  const { meses, horizon, paraBandidos } = view;
  const saldo = paraBandidos.saldoAlFinal;
  return (
    <Figure
      title="Lo que cobrás cada mes"
      subtitle={saldo > 0
        ? `En el escenario esperado. En el mes ${horizon}, al terminar el plazo, se te devuelve el saldo del préstamo (${fmt.money(saldo)}).`
        : "En el escenario esperado. Los primeros meses son más bajos porque la sucursal está arrancando."}
      table={
        <table className="inv-table">
          <thead><tr><th>Mes</th><th>Cobrás</th></tr></thead>
          <tbody>{sampleMonths(meses).map((m) => <tr key={m.month}><td>{m.month}</td><td>{fmt.money(m.cobro)}</td></tr>)}</tbody>
        </table>
      }
    >
      <ChartBox height={height} print={print}>
        <BarChart data={meses} margin={{ top: 12, right: 16, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={{ stroke: COLORS.axis }} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={80} tickFormatter={fmt.short} />
          <Tooltip cursor={{ fill: "rgba(177,47,209,0.08)" }} content={<ChartTooltip fmt={fmt.money} labelFmt={monthTick} series={{ cobro: "Cobrás" }} />} />
          <Bar dataKey="cobro" name="Cobrás" fill={COLORS.esperado} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartBox>
    </Figure>
  );
}

// Cómo se llena la sucursal: servicios por mes contra el punto de equilibrio.
export function ServiciosChart({ view, fmt, height = 260, print = "full" }) {
  const { mesesSucursal: meses, sucursal } = view;
  const data = meses.slice(0, Math.min(24, meses.length)).map((m) => ({ month: m.month, servicios: Math.round(m.servicios) }));
  return (
    <Figure
      title="Servicios por mes en la sucursal nueva"
      subtitle="Arranca de a poco y se llena en los primeros meses. Arriba de la línea punteada, la sucursal gana plata."
      table={
        <table className="inv-table">
          <thead><tr><th>Mes</th><th>Servicios</th><th>Ingresos</th><th>Ganancia</th></tr></thead>
          <tbody>{meses.slice(0, 12).map((m) => <tr key={m.month}><td>{m.month}</td><td>{Math.round(m.servicios)}</td><td>{fmt.money(m.ingresos)}</td><td>{fmt.money(m.ganancia)}</td></tr>)}</tbody>
        </table>
      }
    >
      <ChartBox height={height} print={print}>
        <BarChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={{ stroke: COLORS.axis }} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={48} />
          <Tooltip cursor={{ fill: "rgba(177,47,209,0.08)" }} content={<ChartTooltip fmt={(v) => `${v} servicios`} labelFmt={monthTick} series={{ servicios: "Servicios" }} />} />
          <Bar dataKey="servicios" fill={COLORS.esperado} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {sucursal.equilibrio && (
            <ReferenceLine y={sucursal.equilibrio} stroke="#14151c" strokeDasharray="5 4"
              label={{ value: `Equilibrio: ${sucursal.equilibrio}`, position: "insideTopLeft", fontSize: 12, fill: "#14151c" }} />
          )}
        </BarChart>
      </ChartBox>
    </Figure>
  );
}

const FONDO_LABELS = {
  ...Object.fromEntries(INVERSION_PARTES.map((p) => [p.id, p.label])),
  inversion: "Local y equipamiento",
  capitalArranque: "Capital para los primeros meses",
};

// En qué se usa la plata.
export function UsoFondosChart({ view, fmt, print = "full" }) {
  const data = view.sucursal.usoFondos
    .map((f) => ({ ...f, label: FONDO_LABELS[f.id] || f.id }))
    .sort((a, b) => b.monto - a.monto);
  const total = data.reduce((t, f) => t + f.monto, 0);
  if (!data.length) return null;
  return (
    <Figure
      title="En qué se usa la plata"
      subtitle={`Total: ${fmt.money(total)}. El capital para los primeros meses cubre lo que la sucursal pierde mientras arranca.`}
      table={
        <table className="inv-table">
          <thead><tr><th>Destino</th><th>Monto</th><th>Parte</th></tr></thead>
          <tbody>{data.map((f) => <tr key={f.id}><td>{f.label}</td><td>{fmt.money(f.monto)}</td><td>{Math.round((f.monto / total) * 100)}%</td></tr>)}</tbody>
        </table>
      }
    >
      <ChartBox height={Math.max(120, data.length * 44 + 20)} print={print}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 8 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ ...tick, fill: "#14151c" }} tickLine={false} axisLine={false} width={180} />
          <Tooltip cursor={{ fill: "rgba(177,47,209,0.08)" }} content={<ChartTooltip fmt={fmt.money} series={{ monto: "Monto" }} />} />
          <Bar dataKey="monto" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((f) => <Cell key={f.id} fill={f.id === "capitalArranque" ? COLORS.referencia : COLORS.esperado} />)}
            <LabelList dataKey="monto" position="right" formatter={fmt.short} fontSize={12} fill="#14151c" />
          </Bar>
        </BarChart>
      </ChartBox>
    </Figure>
  );
}

// Comparación entre inversores: lo que le queda a Bandidos con cada propuesta.
export function ComparacionChart({ rows, fmt, horizon, print = "full" }) {
  const data = rows.map((r) => ({ id: r.id, label: r.nombre, queda: r.queda }));
  if (data.length < 2) return null;
  return (
    <Figure
      title={`Lo que le queda a Bandidos en ${horizon} meses con cada propuesta`}
      subtitle="Ganancia de la sucursal después de pagarle al inversor y descontando la plata propia que pone Bandidos. Escenario esperado."
    >
      <ChartBox height={Math.max(120, data.length * 44 + 20)} print={print}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 8 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ ...tick, fill: "#14151c" }} tickLine={false} axisLine={false} width={160} />
          <Tooltip cursor={{ fill: "rgba(177,47,209,0.08)" }} content={<ChartTooltip fmt={fmt.money} series={{ queda: "Le queda a Bandidos" }} />} />
          <ReferenceLine x={0} stroke={COLORS.axis} />
          <Bar dataKey="queda" fill={COLORS.esperado} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="queda" position="right" formatter={fmt.short} fontSize={12} fill="#14151c" />
          </Bar>
        </BarChart>
      </ChartBox>
    </Figure>
  );
}
