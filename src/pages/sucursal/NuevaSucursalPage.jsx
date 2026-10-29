// src/pages/sucursal/NuevaSucursalPage.jsx
// Cálculo para abrir otra sucursal: diagnóstico del local actual con sus
// números reales (promedio de los últimos 3 meses cerrados) y simulador de la
// sucursal nueva. Las cuentas están en lib/sucursal.js.
// La capacidad del local sale de la agenda (quién trabajó y cuántos turnos
// hace en sus días más cargados) y la ganancia se muestra con los gastos fijos
// de hoy, que pueden ser distintos a los del período.
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { fetchDashboardData } from "../../lib/dashboardApi";
import { apiRequest } from "../../services/apiClient";
import { buildDashboardMetrics } from "../../lib/dashboardMetrics";
import {
  branchCapacity,
  DEFAULT_TURNOS,
  defaultBranchInputs,
  diagnoseLocal,
  FIJOS_PARTES,
  groomerLoad,
  HORIZON_MONTHS,
  INVERSION_PARTES,
  parseNumberInput,
  partsFromTotal,
  resolveBranchInputs,
  simulateScenarios,
  sumParts,
  supplyExpenses,
} from "../../lib/sucursal";
import { addDaysISO, addMonthsISO, monthBoundsISO, todayISO } from "../../utils/dates";
import "../../styles/sucursal.css";

// v2: los peluqueros y turnos del local salen de la agenda; lo guardado antes
// era el 6 fijo y taparía el dato real.
const STORAGE_KEY = "bandidos:sucursal:simulador:v2";
const MONTHS_BACK = 3;
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;
const moneyShort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-AR")} mil`;
  return money(n);
};
const oneDecimal = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
const monthsText = (n) => `${n} ${n === 1 ? "mes" : "meses"}`;

function lastClosedMonths() {
  const firstOfThisMonth = monthBoundsISO(todayISO()).first;
  const from = addMonthsISO(firstOfThisMonth, -MONTHS_BACK);
  const to = addDaysISO(firstOfThisMonth, -1);
  const prevFrom = addMonthsISO(from, -MONTHS_BACK);
  const prevTo = addDaysISO(from, -1);
  const { first, last } = monthBoundsISO(todayISO());
  return {
    current: { from, to },
    previous: { from: prevFrom, to: prevTo },
    today: { from: first, to: last, period: first.slice(0, 7) },
  };
}

function rangeLabel({ from, to }) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const start = `${MONTH_NAMES[fm - 1]}${fy !== ty ? ` ${fy}` : ""}`;
  return `${start} a ${MONTH_NAMES[tm - 1]} ${ty}`;
}

function isGroomer(employee) {
  const active = employee.status === "active" || employee.status === "Activo" || employee.status === undefined;
  return active && /groom|peluq|estilis/i.test(String(employee.role || ""));
}

const inRange = (date, { from, to }) => Boolean(date) && date.slice(0, 10) >= from && date.slice(0, 10) <= to;

// Promedios mensuales del local a partir de las mismas métricas del Inicio.
function summarizeLocal(range, data) {
  const { kpis, series } = buildDashboardMetrics({ range, current: data, categories: data.categories });
  const monthsWithData = new Set(series.byDay.filter((d) => d.income > 0).map((d) => d.date.slice(0, 7))).size;
  const months = Math.max(1, monthsWithData);
  const workedDays = series.byDay.filter((d) => d.servicesIncome > 0).length;
  const turnos = data.services
    .filter((s) => s.status === "finished" && inRange(s.date, range))
    .map((s) => ({
      date: s.date.slice(0, 10),
      groomerId: s.groomer_id ?? s.groomerId ?? null,
      secondGroomerId: s.second_groomer_id ?? s.secondGroomerId ?? null,
    }));
  const load = groomerLoad(turnos, data.employees.filter(isGroomer), { diasAbiertos: workedDays });
  const insumos = supplyExpenses(data.dailyExpenses.filter((e) => inRange(e.date, range)), data.categories);
  return {
    months: monthsWithData,
    ingresosMes: kpis.income / months,
    gananciaMes: kpis.profit / months,
    margen: kpis.margin,
    serviciosMes: kpis.servicesCount / months,
    ticket: kpis.avgTicket,
    comision: kpis.servicesIncome > 0 ? kpis.groomerCommissions / kpis.servicesIncome : 0.4,
    gastosDiariosMes: kpis.dailyExpenseTotal / months,
    insumosMes: insumos.total / months,
    insumosCategorias: insumos.categorias,
    fijosMes: kpis.fixedMonthlyRunRate,
    fijosPeriodoMes: kpis.fixedExpenseTotal / months,
    diasMes: workedDays / months,
    load,
    groomers: load.peluqueros || data.employees.filter(isGroomer).length,
    turnosPorGroomer: load.turnosTope || DEFAULT_TURNOS,
  };
}

// Si los gastos fijos de hoy difieren de los del período, la ganancia se
// recalcula con los de hoy: es la que el local va a tener mientras arranca la
// sucursal nueva.
function withTodayFixed(summary, fijosHoy) {
  const hoy = Number(fijosHoy);
  if (!Number.isFinite(hoy) || hoy <= 0) return { ...summary, fijosHoy: null };
  const gananciaPeriodoMes = summary.gananciaMes;
  const gananciaMes = gananciaPeriodoMes + summary.fijosPeriodoMes - hoy;
  const cambio = Math.abs(hoy - summary.fijosPeriodoMes) >= 0.01 * Math.max(1, summary.ingresosMes);
  return {
    ...summary,
    fijosMes: hoy,
    fijosHoy: cambio ? hoy : null,
    gananciaPeriodoMes,
    gananciaMes: cambio ? gananciaMes : gananciaPeriodoMes,
    margen: cambio && summary.ingresosMes > 0 ? gananciaMes / summary.ingresosMes : summary.margen,
  };
}

function readSaved() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSaved(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Sin almacenamiento el simulador funciona igual, solo no recuerda.
  }
}

const STATUS = {
  ok: { label: "Bien", icon: "✓" },
  warn: { label: "Atención", icon: "!" },
  bad: { label: "Todavía no", icon: "✕" },
  unknown: { label: "Sin datos", icon: "?" },
};

const VERDICT = {
  ok: { title: "Está listo para crecer", text: "El local gana plata, tiene la agenda llena y puede juntar lo que pide la sucursal nueva." },
  warn: { title: "Se puede, con cuidado", text: "Hay puntos a mirar. Revisalos antes de comprometerte con un alquiler." },
  bad: { title: "Todavía no conviene", text: "Hay al menos un punto en rojo. Ordenarlo primero baja mucho el riesgo." },
  unknown: { title: "Faltan datos", text: "Registrá turnos y gastos para que el diagnóstico tenga con qué calcular." },
};

export default function NuevaSucursalPage() {
  const ranges = useMemo(() => lastClosedMonths(), []);
  const [local, setLocal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  // null = usar lo que dice la agenda; un número = lo cambió la persona.
  const [localTurnos, setLocalTurnos] = useState(() => readSaved()?.localTurnos ?? null);
  const [localGroomers, setLocalGroomers] = useState(() => readSaved()?.localGroomers ?? null);
  const [inputs, setInputs] = useState(() => readSaved()?.inputs ?? null);
  // Lista de gastos fijos del mes en curso, para mostrar qué incluye el total.
  const [fijosHoyItems, setFijosHoyItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchDashboardData(ranges.current),
      fetchDashboardData(ranges.previous).catch(() => null),
      apiRequest("/v2/fixed-expenses/accrual", { params: { from: ranges.today.from, to: ranges.today.to } }).catch(() => null),
      apiRequest(`/v2/fixed-expenses/months/${ranges.today.period}`).catch(() => null),
    ])
      .then(([currentData, previousData, todayAccrual, todayMonth]) => {
        if (cancelled) return;
        setFijosHoyItems(Array.isArray(todayMonth?.items) ? todayMonth.items : []);
        const summary = withTodayFixed(summarizeLocal(ranges.current, currentData), todayAccrual?.monthly_total);
        const previous = previousData ? summarizeLocal(ranges.previous, previousData) : null;
        summary.ingresosMesAnterior = previous && previous.months > 0 ? previous.ingresosMes : null;
        setLocal(summary);
        setInputs((prev) => prev ?? defaultBranchInputs(summary));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "No se pudieron cargar los números del local.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ranges, reloadKey]);

  useEffect(() => {
    if (inputs) writeSaved({ inputs, localTurnos, localGroomers });
  }, [inputs, localTurnos, localGroomers]);

  const groomersLocal = localGroomers ?? Math.max(1, local?.groomers || 0);
  const turnosLocal = localTurnos ?? local?.turnosPorGroomer ?? DEFAULT_TURNOS;
  const branchInputs = useMemo(
    () => (inputs ? { ...resolveBranchInputs(inputs), capacidadMes: branchCapacity(inputs) } : null),
    [inputs]
  );
  const scenarios = useMemo(() => (branchInputs ? simulateScenarios(branchInputs) : null), [branchInputs]);
  const expected = scenarios?.find((s) => s.id === "esperado");
  const diagnosis = useMemo(
    () =>
      local
        ? diagnoseLocal(
            { ...local, groomers: groomersLocal, turnosPorGroomer: turnosLocal },
            { capitalNecesario: branchInputs?.inversion > 0 ? expected?.capitalNecesario : 0 }
          )
        : null,
    [local, groomersLocal, turnosLocal, branchInputs?.inversion, expected?.capitalNecesario]
  );

  function retry() {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }

  function setInput(field, value) {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  function resetInputs() {
    // La inversión no sale del local: se conserva.
    if (local) {
      setInputs({
        ...defaultBranchInputs(local),
        inversion: inputs?.inversion ?? 0,
        inversionPartes: inputs?.inversionPartes ?? null,
      });
    }
  }

  return (
    <div className="page-content sucursal">
      <header className="page-header">
        <div>
          <h1 className="page-title">Nueva sucursal</h1>
          <p className="page-subtitle">
            ¿Conviene abrir otra? Primero mirá cómo está este local, después probá los números de la nueva.
          </p>
        </div>
      </header>

      {loading && <div className="card sucursal__state">Cargando los números del local…</div>}
      {!loading && error && (
        <div className="card sucursal__state sucursal__state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={retry}>Reintentar</button>
        </div>
      )}

      {!loading && !error && local && diagnosis && inputs && expected && (
        <>
          <section className="card sucursal__section" aria-labelledby="suc-diag-title">
            <div className="sucursal__section-head">
              <div>
                <span className="sucursal__step">Paso 1</span>
                <h2 id="suc-diag-title" className="card-title">¿Este local está listo?</h2>
                <p className="card-subtitle">
                  Promedio por mes de {rangeLabel(ranges.current)}
                  {local.months > 0 && local.months < MONTHS_BACK && ` (solo ${monthsText(local.months)} con movimientos)`}.
                </p>
              </div>
            </div>

            <div className={`sucursal__verdict sucursal__verdict--${diagnosis.verdict}`}>
              <span className="sucursal__verdict-icon" aria-hidden="true">{STATUS[diagnosis.verdict].icon}</span>
              <div>
                <strong>{VERDICT[diagnosis.verdict].title}</strong>
                <p>{VERDICT[diagnosis.verdict].text}</p>
                {diagnosis.motivos.length > 0 && (
                  <p className="sucursal__verdict-why">
                    {diagnosis.verdict === "bad" ? "Lo que frena: " : "Para mirar: "}
                    {diagnosis.motivos.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && (i === diagnosis.motivos.length - 1 ? " y " : ", ")}
                        <a href={`#suc-check-${c.id}`}>{c.title.toLowerCase()}</a>
                      </span>
                    ))}
                    .
                  </p>
                )}
              </div>
            </div>

            <dl className="sucursal__stats">
              <Stat label="Ingresos por mes" value={money(local.ingresosMes)} />
              <Stat
                label={local.fijosHoy ? "Ganancia por mes con los fijos de hoy" : "Ganancia por mes"}
                value={money(local.gananciaMes)}
                tone={local.gananciaMes < 0 ? "bad" : undefined}
              />
              <Stat label="Servicios por mes" value={oneDecimal(local.serviciosMes)} />
              <Stat label="Ticket promedio" value={money(local.ticket)} />
            </dl>
            {local.fijosHoy && (
              <p className="sucursal__note">
                Los gastos fijos de hoy son {money(local.fijosHoy)} por mes; en {rangeLabel(ranges.current)} fueron{" "}
                {money(local.fijosPeriodoMes)} y la ganancia de esos meses, {money(local.gananciaPeriodoMes)}.
                Se usa la de hoy porque es la que va a tener el local mientras arranca la nueva.
              </p>
            )}

            <ul className="sucursal__checks">
              {diagnosis.checks.map((c) => (
                <li key={c.id} id={`suc-check-${c.id}`} className={`sucursal__check sucursal__check--${c.status}`}>
                  <span className="sucursal__check-badge">
                    <span aria-hidden="true">{STATUS[c.status].icon}</span> {STATUS[c.status].label}
                  </span>
                  <div className="sucursal__check-body">
                    <strong>{c.title}</strong>
                    <p>{c.detail}</p>
                    {c.id === "agenda" && (
                      <AgendaCapacity
                        load={local.load}
                        groomers={groomersLocal}
                        turnos={turnosLocal}
                        edited={localGroomers !== null || localTurnos !== null}
                        onGroomers={setLocalGroomers}
                        onTurnos={setLocalTurnos}
                        onReset={() => {
                          setLocalGroomers(null);
                          setLocalTurnos(null);
                        }}
                      />
                    )}
                    {c.id === "ahorro" && c.status === "unknown" && (
                      <a className="sucursal__check-link" href="#suc-inversion">Cargar la inversión</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card sucursal__section" aria-labelledby="suc-sim-title">
            <div className="sucursal__section-head">
              <div>
                <span className="sucursal__step">Paso 2</span>
                <h2 id="suc-sim-title" className="card-title">La sucursal nueva</h2>
                <p className="card-subtitle">
                  Arranca con los números de este local. Cambialos por lo que esperás de la nueva.
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={resetInputs}>
                Volver a los números del local
              </button>
            </div>

            <div className="sucursal__form">
              <fieldset>
                <legend>Lo que hay que poner</legend>
                <PartsField
                  id="suc-inversion"
                  label="Inversión inicial"
                  hint="Todo lo que hay que poner antes de abrir: obra, mesas, secadores, bañera, depósito del alquiler, habilitación."
                  parts={INVERSION_PARTES}
                  total={inputs.inversion}
                  values={inputs.inversionPartes ?? null}
                  onTotal={(v) => setInput("inversion", v)}
                  onParts={(v) => setInput("inversionPartes", v)}
                />
                <PartsField
                  label="Gastos fijos por mes"
                  hint="Lo que se paga todos los meses aunque no haya turnos. La comisión y los insumos van aparte. Arranca con los de hoy de este local."
                  parts={FIJOS_PARTES}
                  total={inputs.fijosMes}
                  values={inputs.fijosPartes ?? null}
                  onTotal={(v) => setInput("fijosMes", v)}
                  onParts={(v) => setInput("fijosPartes", v)}
                  reference={fijosHoyItems.length > 0 && (
                    <details className="sucursal__details">
                      <summary>Qué incluyen hoy los fijos de este local</summary>
                      <ul className="sucursal__ref-list">
                        {fijosHoyItems.map((item) => (
                          <li key={item.id ?? item.name}>
                            <span>{item.name}</span>
                            <span>{money(item.amount)}</span>
                          </li>
                        ))}
                        <li className="sucursal__ref-total">
                          <span>Total</span>
                          <span>{money(fijosHoyItems.reduce((t, item) => t + (Number(item.amount) || 0), 0))}</span>
                        </li>
                      </ul>
                      <p className="sucursal__note">
                        Sacá lo que la sucursal nueva no va a tener (préstamos, contador o sistema compartidos) y sumá lo que sí.
                      </p>
                    </details>
                  )}
                />
              </fieldset>
              <fieldset>
                <legend>Lo que deja cada servicio</legend>
                <NumberField label="Ticket promedio" money value={inputs.ticket} onChange={(v) => setInput("ticket", v)} />
                <NumberField label="Comisión del peluquero" suffix="%" value={Math.round(inputs.comision * 100)} max={100}
                  onChange={(v) => setInput("comision", v / 100)} />
                <NumberField label="Insumos y gastos por servicio" money value={inputs.variablePorServicio}
                  onChange={(v) => setInput("variablePorServicio", v)}
                  hint={local.insumosCategorias.length > 0
                    ? `Sale de los gastos de ${local.insumosCategorias.join(", ")} de este local divididos por sus servicios.`
                    : "Sale de todos los gastos diarios de este local divididos por sus servicios. Revisalo si incluye compras del PetShop."} />
              </fieldset>
              <fieldset>
                <legend>Cuánto trabajo esperás</legend>
                <NumberField label="Servicios por mes cuando ya arrancó" value={inputs.serviciosMes} onChange={(v) => setInput("serviciosMes", v)} />
                <NumberField label="El primer mes arranca al" suffix="%" value={Math.round(inputs.arranquePct * 100)} max={100}
                  onChange={(v) => setInput("arranquePct", v / 100)} hint="De los servicios esperados." />
                <NumberField label="Meses hasta llegar al 100%" value={inputs.mesesRampa} max={36} onChange={(v) => setInput("mesesRampa", v)} />
              </fieldset>
              <fieldset>
                <legend>Capacidad</legend>
                <NumberField label="Peluqueros" min={1} value={inputs.groomers} onChange={(v) => setInput("groomers", v)} />
                <NumberField label="Turnos por peluquero por día" min={1} decimal value={inputs.turnosPorGroomer} onChange={(v) => setInput("turnosPorGroomer", v)} />
                <NumberField label="Días que abre por mes" min={1} max={31} value={inputs.diasMes} onChange={(v) => setInput("diasMes", v)} />
              </fieldset>
            </div>
          </section>

          <BranchResults inputs={branchInputs} expected={expected} scenarios={scenarios} local={local} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`sucursal__stat${tone ? ` sucursal__stat--${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Capacidad del local: los campos que mueven el punto «Agenda llena», con el
// detalle de cada peluquero para que se entienda de dónde salen.
function AgendaCapacity({ load, groomers, turnos, edited, onGroomers, onTurnos, onReset }) {
  const fueraDeCuenta = load.detalle.filter((p) => !p.cuenta);
  return (
    <div className="sucursal__capacity">
      <div className="sucursal__inline-fields">
        <NumberField
          label="Peluqueros en este local"
          value={groomers}
          min={1}
          onChange={onGroomers}
          hint={load.peluqueros > 0 ? `Según la agenda: los que trabajaron al menos ${load.minDias} días en el período.` : undefined}
        />
        <NumberField
          label="Turnos por peluquero por día"
          value={turnos}
          min={1}
          decimal
          onChange={onTurnos}
          hint={load.turnosTope
            ? `Lo que hacen en sus días más cargados según la agenda (${load.turnosTope}). Cambialo si pueden hacer más.`
            : "Lo máximo que puede atender en un día normal."}
        />
      </div>
      {edited && (
        <button type="button" className="btn-secondary sucursal__reset" onClick={onReset}>
          Volver a lo que dice la agenda
        </button>
      )}
      {load.detalle.length > 0 && (
        <details className="sucursal__details">
          <summary>Cómo trabajó cada peluquero</summary>
          <div className="sucursal__table-wrap">
            <table className="sucursal__table">
              <thead>
                <tr><th>Peluquero</th><th>Días</th><th>Turnos/día</th><th>Máximo</th></tr>
              </thead>
              <tbody>
                {load.detalle.map((p) => (
                  <tr key={p.id} className={p.cuenta ? undefined : "is-muted"}>
                    <td>{p.name}</td>
                    <td>{p.dias}</td>
                    <td>{oneDecimal(p.promedio)}</td>
                    <td>{p.maximo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {fueraDeCuenta.length > 0 && (
            <p className="sucursal__note">
              {fueraDeCuenta.map((p) => p.name).join(", ")} {fueraDeCuenta.length === 1 ? "trabajó" : "trabajaron"} menos
              de {load.minDias} días y no se {fueraDeCuenta.length === 1 ? "cuenta" : "cuentan"} como peluquero del local.
            </p>
          )}
          <p className="sucursal__note">Un turno compartido cuenta para los dos peluqueros.</p>
        </details>
      )}
    </div>
  );
}

// Total o partes: con «Armar por partes» se cargan los ítems y el total es la
// suma; con «Poner solo el total» se vuelve a un número.
function PartsField({ id, label, hint, parts, total, values, onTotal, onParts, reference }) {
  const byParts = values !== null;
  return (
    <div id={id} className="sucursal__parts">
      {byParts ? (
        <>
          <div className="sucursal__parts-head">
            <span>{label}</span>
            <strong>{money(sumParts(values))}</strong>
          </div>
          {hint && <small className="form-hint">{hint}</small>}
          <div className="sucursal__parts-list">
            {parts.map((part) => (
              <NumberField
                key={part.id}
                label={part.label}
                hint={part.hint}
                money
                value={values[part.id] ?? 0}
                onChange={(v) => onParts({ ...values, [part.id]: v })}
              />
            ))}
          </div>
          <button
            type="button"
            className="sucursal__link-button"
            onClick={() => {
              onTotal(sumParts(values));
              onParts(null);
            }}
          >
            Poner solo el total
          </button>
        </>
      ) : (
        <>
          <NumberField label={label} hint={hint} money value={total} onChange={onTotal} />
          <button type="button" className="sucursal__link-button" onClick={() => onParts(partsFromTotal(parts, total))}>
            Armar por partes
          </button>
        </>
      )}
      {reference}
    </div>
  );
}

const formatNumber = (value, money) =>
  money
    ? Math.round(Number(value) || 0).toLocaleString("es-AR")
    : Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Campo de texto para números: mientras se escribe se respeta lo tipeado
// (se puede borrar todo, no queda un 0 adelante); fuera del foco se muestra
// con separador de miles. `money` ignora puntos y comas; `decimal` acepta
// «4,5».
function NumberField({ id, label, value, onChange, hint, prefix, suffix, min = 0, max, money = false, decimal = false }) {
  const [draft, setDraft] = useState(null);
  const clamp = (n) => Math.max(min, max === undefined ? n : Math.min(max, n));
  const shown = draft ?? (Number.isFinite(value) ? formatNumber(value, money) : "");
  return (
    <label id={id} className="form-field sucursal__field">
      <span>{label}</span>
      <span className="sucursal__input">
        {(prefix || money) && <span className="sucursal__affix">{prefix || "$"}</span>}
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          value={shown}
          onFocus={() => setDraft(value ? formatNumber(value, money) : "")}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            const n = parseNumberInput(text, { money });
            onChange(clamp(n === null ? 0 : decimal ? n : Math.round(n)));
          }}
        />
        {suffix && <span className="sucursal__affix">{suffix}</span>}
      </span>
      {hint && <small className="form-hint">{hint}</small>}
    </label>
  );
}

function BranchResults({ inputs, expected, scenarios, local }) {
  const r = expected;
  let hero;
  if (r.margen <= 0) {
    hero = { tone: "bad", title: "Cada servicio pierde plata", text: "Con este ticket, la comisión y los insumos se llevan todo. Subí el precio o bajá costos." };
  } else if (r.recupero) {
    hero = {
      tone: r.recupero <= 18 ? "ok" : "warn",
      title: inputs.inversion > 0 ? `Recuperás la inversión en ${monthsText(r.recupero)}` : `Empieza a dar ganancia en el mes ${r.recupero}`,
      text: inputs.inversion > 0 ? "Contando las pérdidas de los primeros meses, hasta que la caja vuelve a cero." : "Cargá la inversión inicial para ver cuándo la recuperás.",
    };
  } else {
    hero = { tone: "bad", title: `No se recupera en ${HORIZON_MONTHS / 12} años`, text: "Con estos números la sucursal no llega a devolver lo invertido. Probá más servicios, otro alquiler o otro precio." };
  }

  const chartData = r.months.map((m) => ({ ...m, label: `Mes ${m.month}` }));

  return (
    <section className="card sucursal__section" aria-labelledby="suc-res-title">
      <div className="sucursal__section-head">
        <div>
          <span className="sucursal__step">Resultado</span>
          <h2 id="suc-res-title" className="card-title">¿Cuándo empieza a convenir?</h2>
        </div>
      </div>

      <div className={`sucursal__hero sucursal__hero--${hero.tone}`}>
        <strong>{hero.title}</strong>
        <p>{hero.text}</p>
      </div>

      {r.excedeCapacidad && (
        <p className="sucursal__warning" role="note">
          <strong>Ojo:</strong> esperás {Math.round(r.serviciosRegimen)} servicios por mes, pero con {inputs.groomers}{" "}
          {inputs.groomers === 1 ? "peluquero" : "peluqueros"} entran hasta {Math.round(r.capacidad)}. Sumá gente o bajá la expectativa.
        </p>
      )}

      <dl className="sucursal__stats">
        <Stat
          label="Punto de equilibrio"
          value={r.equilibrio === null ? "No hay" : `${r.equilibrio} servicios/mes`}
          tone={r.equilibrio === null ? "bad" : undefined}
        />
        <Stat label="Por día" value={r.equilibrioDiario === null ? "—" : `${oneDecimal(r.equilibrioDiario)} servicios`} />
        <Stat label="Ganancia por mes ya arrancada" value={money(r.gananciaRegimen)} tone={r.gananciaRegimen < 0 ? "bad" : undefined} />
        <Stat label="Plata que necesitás tener" value={money(r.capitalNecesario)} />
      </dl>
      <p className="sucursal__note">
        Cada servicio deja {money(r.margen)} después de comisión e insumos.
        {r.primerMesPositivo
          ? ` Desde el mes ${r.primerMesPositivo} deja de perder plata.`
          : ` En ${HORIZON_MONTHS} meses nunca deja de perder plata.`}
        {r.gananciaRegimen > 0 && local.gananciaMes > 0 &&
          ` Con las dos andando, la ganancia total pasaría de ${money(local.gananciaMes)} a ${money(local.gananciaMes + r.gananciaRegimen)} por mes.`}
      </p>

      <figure className="sucursal__chart">
        <figcaption>
          <strong>Caja acumulada de la sucursal nueva</strong>
          <span>Arranca en menos la inversión. Cuando cruza la línea de cero, recuperaste lo puesto.</span>
        </figcaption>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#f1f2f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7180" }} tickLine={false} axisLine={{ stroke: "#ececf3" }}
              interval="preserveStartEnd" minTickGap={28} tickFormatter={(m) => `Mes ${m}`} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7180" }} tickLine={false} axisLine={false} width={72} tickFormatter={moneyShort} />
            <Tooltip
              formatter={(value) => [money(value), "Caja acumulada"]}
              labelFormatter={(m) => `Mes ${m}`}
              contentStyle={{ borderRadius: 12, borderColor: "#ececf3", fontSize: 13 }}
            />
            <ReferenceLine y={0} stroke="#9aa0b4" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="acumulado" stroke="#d948ef" strokeWidth={2} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            {r.recupero && (
              <ReferenceDot x={r.recupero} y={r.months[r.recupero - 1].acumulado} r={6} fill="#d948ef" stroke="#fff" strokeWidth={2}
                label={{ value: `Recupero: mes ${r.recupero}`, position: "top", fontSize: 12, fill: "#14151c" }} />
            )}
          </LineChart>
        </ResponsiveContainer>
        <details className="sucursal__details">
          <summary>Ver mes a mes</summary>
          <div className="sucursal__table-wrap">
            <table className="sucursal__table">
              <thead>
                <tr><th>Mes</th><th>Servicios</th><th>Ganancia del mes</th><th>Caja acumulada</th></tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{Math.round(m.servicios)}</td>
                    <td className={m.ganancia < 0 ? "is-negative" : undefined}>{money(m.ganancia)}</td>
                    <td className={m.acumulado < 0 ? "is-negative" : undefined}>{money(m.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figure>

      <div className="sucursal__scenarios">
        <h3>¿Y si no sale como esperás?</h3>
        <div className="sucursal__table-wrap">
          <table className="sucursal__table">
            <thead>
              <tr><th>Escenario</th><th>Servicios/mes</th><th>Ganancia/mes</th><th>Plata necesaria</th><th>Recupero</th></tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id} className={s.id === "esperado" ? "is-current" : undefined}>
                  <td>{s.label}{s.factor !== 1 && <span className="sucursal__muted"> ({s.factor > 1 ? "+" : "−"}{Math.round(Math.abs(s.factor - 1) * 100)}%)</span>}</td>
                  <td>{Math.round(s.serviciosRegimen)}</td>
                  <td className={s.gananciaRegimen < 0 ? "is-negative" : undefined}>{money(s.gananciaRegimen)}</td>
                  <td>{money(s.capitalNecesario)}</td>
                  <td>{s.recupero ? monthsText(s.recupero) : `Más de ${HORIZON_MONTHS} meses`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sucursal__note">
          Es una cuenta para decidir: no incluye impuestos, inflación, aumentos de alquiler ni financiación.
          Solo cuenta servicios de peluquería, no ventas del PetShop.
        </p>
      </div>
    </section>
  );
}
