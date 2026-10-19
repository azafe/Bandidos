import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { asignarGastoTraslado, confirmarGastosTraslados, getTrasladosResultados, guardarCostoTraslado, repartirTraslado, saveCategoriasTraslados, getTrasladoConfig, revisarCondicionesTraslado } from "../../services/trasladosApi";
import { MOTIVOS_RESULTADO } from "../../lib/trasladosResultados";
import { monthBoundsISO, todayISO } from "../../utils/dates";
import SimuladorMovil from "../../components/traslados/SimuladorMovil";
import ResultadosPanel from "../../components/traslados/resultados/ResultadosPanel";
import ResultadosPendientes from "../../components/traslados/resultados/ResultadosPendientes";
import { monto as fmt, numero as num } from "../../components/traslados/resultados/formato";
import "../../styles/traslados.css";
import "../../styles/traslados-resultados.css";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const FULL_DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const vehicleName = (vehicles, id) => vehicles.find((v) => v.id === id)?.nombre || "Sin distribuir";

function VehicleSelect({ vehicles, value, onChange, label = "Móvil", disabled = false }) {
  return <label className="form-field">{label}<select value={value || ""} onChange={onChange} disabled={disabled}><option value="">Sin distribuir</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.activo === false ? " (inactivo)" : ""}</option>)}</select></label>;
}

function Categorias({ categories, selected, mutate, busy }) {
  const [ids, setIds] = useState(selected);
  const [search, setSearch] = useState("");
  const visible = categories.filter((c) => c.name.toLocaleLowerCase("es-AR").includes(search.trim().toLocaleLowerCase("es-AR")));
  return <form onSubmit={(e) => { e.preventDefault(); mutate(() => saveCategoriasTraslados(ids), "Categorías guardadas. Volvé a revisar los gastos del mes."); }}>
    <fieldset disabled={busy} className="traslados-tramo">
      <legend>Categorías de gastos del vehículo</legend>
      <p>Seleccioná los gastos de vehículos. Los pagos a choferes se calculan aparte.</p>
      <label className="form-field">Buscar categoría<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej.: nafta, seguro, traslados…" /></label>
      <span className="resultados-caption">{ids.length} seleccionadas · La selección se aplica a todos los meses.</span>
      {categories.length ? <div className="resultados-categorias">{visible.map((c) => <label className="traslados-check" key={c.id}><input type="checkbox" checked={ids.includes(c.id)} onChange={(e) => setIds((old) => e.target.checked ? [...old, c.id] : old.filter((id) => id !== c.id))} />{c.name}</label>)}{!visible.length && <p>No hay categorías con ese nombre.</p>}</div> : <p>No hay categorías. Podés crearlas en <Link to="/catalog/expense-categories">Categorías de gastos</Link>.</p>}
      <button type="submit" className="btn-secondary">Guardar categorías</button>
      <details className="resultados-ayuda"><summary>Cómo se toman estos gastos</summary><p>Se leen los gastos diarios y los cargos fijos de cada mes. No se copian ni se vuelven a sumar en Caja.</p></details>
    </fieldset>
  </form>;
}

function Reparto({ operation, vehicles, mutate, busy }) {
  const [values, setValues] = useState(Object.fromEntries(operation.vehiculos.map((id) => [id, operation.reparto.find((r) => r.vehiculo_id === id)?.porcentaje ?? ""])));
  const total = Object.values(values).reduce((sum, v) => sum + Number(v || 0), 0);
  return <form className="traslados-tramo" onSubmit={(e) => {
    e.preventDefault();
    mutate(() => repartirTraslado(operation.id, { revision: operation.revision, items: Object.entries(values).filter(([, v]) => Number(v) > 0).map(([vehiculo_id, v]) => ({ vehiculo_id, porcentaje: Number(v) })) }), "Reparto guardado.");
  }}>
    <strong>{operation.mascota || "Traslado"} · {fmt(operation.precio)}</strong>
    <p>{operation.sin_distribuir ? "Importe sin distribuir." : "Reparto económico del viaje completo."} Indicá porcentajes que sumen 100%. No modifica la ruta ni duplica el cobro.</p>
    <fieldset disabled={busy}><div className="form-grid">
      {operation.vehiculos.map((id) => <label className="form-field" key={id}>{vehicleName(vehicles, id)} (%)<input type="number" min="0" max="100" step="0.01" value={values[id]} onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))} /></label>)}
    </div>
      {!operation.vehiculos.length && <p>Primero asigná el móvil en el turno de Agenda.</p>}
      <p>Total: {num(total)}%</p>
      <button className="btn-secondary" disabled={!operation.vehiculos.length || Math.abs(total - 100) > 0.0001}>Guardar reparto</button>
      {operation.reparto.length > 0 && <button type="button" className="btn-secondary" onClick={() => mutate(() => repartirTraslado(operation.id, { revision: operation.revision, items: [] }), "Reparto manual quitado.")}>Quitar reparto manual</button>}
    </fieldset>
  </form>;
}

function CondicionesPendientes({ operations, config, busy, mutate }) {
  const [confirmed, setConfirmed] = useState({});
  if (!operations.length) return <p>No hay viajes disponibles para asignar condiciones desde este resumen. Revisá los recorridos en la <Link to="/traslados/dia">Hoja de ruta</Link>.</p>;
  return <div>
    <p>Guardar una configuración nueva no cambia viajes anteriores. Si verificaste que a uno de estos viajes le correspondían las condiciones vigentes, podés asignárselas individualmente. Queda registrada la revisión.</p>
    {config?.modelo_pago ? <p>Condiciones a asignar · versión {config.version}: {config.modelo_pago === "ninguno" ? "sin pago al chofer" : config.modelo_pago === "porcentaje" ? `${config.valor_pago}% para choferes` : `${fmt(config.valor_pago)} por jornal`}. Referencia: {config.costo_referencia === null ? "pendiente" : `${fmt(config.costo_referencia)} por ${config.unidad_referencia === "dia" ? "día" : "traslado"}`}.</p> : <p>Primero definí el pago al chofer en <Link to="/traslados/configuracion">Configuración</Link>.</p>}
    {operations.map((o) => <div key={o.id} className="traslados-tramo"><strong>{o.mascota} · {fmt(o.precio)}</strong><label className="traslados-check"><input type="checkbox" disabled={busy || !config?.modelo_pago} checked={!!confirmed[o.id]} onChange={(e) => setConfirmed((v) => ({ ...v, [o.id]: e.target.checked }))} />Verifiqué que estas condiciones corresponden a este viaje</label><button type="button" className="btn-secondary" disabled={busy || !confirmed[o.id] || !config?.modelo_pago} onClick={() => mutate(() => revisarCondicionesTraslado(o.id, { configuracion_id: config.id, confirmar: true }), "Condiciones revisadas para ese viaje.")}>Asignar condiciones a este viaje</button></div>)}
  </div>;
}

function Registros({ tipo, rows, vehicles, drivers, date, mutate, busy }) {
  const jornada = tipo === "jornadas";
  const empty = () => ({ id: crypto.randomUUID(), fecha: date, monto: "", vehiculo_id: "", concepto: "", pagado_por: "", chofer_id: "", anulado: false });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    const common = { fecha: form.fecha, monto: Number(form.monto), vehiculo_id: form.vehiculo_id || null };
    const body = { ...common, ...(jornada ? { chofer_id: form.chofer_id } : { concepto: form.concepto, pagado_por: form.pagado_por }), ...(editing ? { revision: form.revision, anulado: form.anulado } : { id: form.id }) };
    if (await mutate(() => guardarCostoTraslado(tipo, editing ? form.id : null, body), "Registro guardado.")) { setForm(empty()); setEditing(false); }
  }
  return <div>
    <p>{jornada ? "Un jornal por chofer y fecha. Registrarlo no genera un pago en Caja." : "Gastos que pagó un socio o chofer y no están en Gastos del local. Registrarlos aquí no genera movimientos en Caja."}</p>
    <div className="traslados-registros">
      {rows.map((r) => <div className="traslados-registro" key={r.id}>
        <div><strong>{jornada ? r.chofer_nombre : r.concepto}</strong><p>{r.fecha} · {fmt(r.monto)} · {vehicleName(vehicles, r.vehiculo_id)}{r.anulado ? " · Anulado" : ""}{!jornada ? ` · Pagó ${r.pagado_por}` : ""}</p></div>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setEditing(true); setForm({ ...empty(), ...r, fecha: r.fecha.slice(0, 10), monto: String(r.monto), vehiculo_id: r.vehiculo_id || "" }); }}>Editar</button>
      </div>)}
      {!rows.length && <p>No hay registros en este mes.</p>}
    </div>
    <form onSubmit={submit}><fieldset disabled={busy} className="traslados-tramo"><legend>{editing ? "Editar registro" : "Agregar registro"}</legend><div className="form-grid">
      <label className="form-field">Fecha<input required type="date" value={form.fecha} onChange={change("fecha")} /></label>
      {jornada ? <label className="form-field">Chofer<select required value={form.chofer_id} onChange={change("chofer_id")}><option value="">Elegí un chofer</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.status !== "active" ? " (inactivo)" : ""}</option>)}</select></label> : <>
        <label className="form-field">Concepto<input required maxLength="200" value={form.concepto} onChange={change("concepto")} placeholder="Ej.: nafta" /></label>
        <label className="form-field">Quién lo pagó<input required maxLength="100" value={form.pagado_por} onChange={change("pagado_por")} placeholder="Ej.: Jorge, socio" /></label>
      </>}
      <label className="form-field">Importe ($)<input required type="number" min="0.01" step="0.01" value={form.monto} onChange={change("monto")} /></label>
      <VehicleSelect vehicles={vehicles} value={form.vehiculo_id} onChange={change("vehiculo_id")} />
    </div>
      {editing && <label className="traslados-check"><input type="checkbox" checked={form.anulado} onChange={(e) => setForm((f) => ({ ...f, anulado: e.target.checked }))} />Anular este registro</label>}
      <button className="btn-primary" type="submit">{editing ? "Guardar cambios" : "Agregar registro"}</button>
      {editing && <button className="btn-secondary" type="button" onClick={() => { setForm(empty()); setEditing(false); }}>Cancelar edición</button>}
    </fieldset></form>
  </div>;
}

export default function TrasladosResultadosPage() {
  const [searchParams] = useSearchParams();
  const [mes, setMes] = useState(() => {
    const requested = searchParams.get("mes");
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(requested || "") ? requested : todayISO().slice(0, 7);
  });
  const [vehicle, setVehicle] = useState("");
  const [data, setData] = useState(null);
  const [catalogs, setCatalogs] = useState({ vehicles: [], drivers: [], categories: [], config: null });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [sections, setSections] = useState({});
  function toggleSection(id, open) {
    setSections((old) => old[id] === open ? old : { ...old, [id]: open });
  }
  function openSection(id) {
    setSections((old) => ({ ...old, [id]: true, ...(id === "categorias" ? { gastos: true } : {}) }));
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      element?.querySelector("summary")?.focus({ preventScroll: true });
    });
  }
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError("");
    try {
      const { first, last } = monthBoundsISO(`${mes}-01`);
      const [report, vehicles, drivers, categories, config] = await Promise.all([getTrasladosResultados({ from: first, to: last }), apiRequest("/v2/vehiculos"), apiRequest("/v2/employees"), apiRequest("/v2/expense-categories"), getTrasladoConfig()]);
      if (current === generation.current) { setData(report); setCatalogs({ vehicles, drivers: drivers.filter((d) => d.is_driver), categories, config }); }
    } catch (err) { if (current === generation.current) { setError(err.message); setData(null); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [mes]);
  useEffect(() => { load(); return () => { generation.current += 1; }; }, [load]);
  async function mutate(action, text) {
    const current = generation.current;
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      if (current === generation.current) { setMessage(text); await load(); }
      return true;
    } catch (err) { if (current === generation.current) setError(`${err.message}${err.status === 409 ? " Usá Actualizar para revisar los datos actuales." : ""}`); return false; }
    finally { setBusy(false); }
  }
  const selected = data && (vehicle ? data.vehiculos.find((v) => (v.vehiculo_id || "sin_asignar") === vehicle) : data.total);
  const date = todayISO().startsWith(mes) ? todayISO() : `${mes}-01`;
  const financialPending = (selected?.pendientes || []).filter((p) => !p.startsWith("referencia"));
  const referencePending = (selected?.pendientes || []).filter((p) => p.startsWith("referencia"));
  const unknownConditions = data?.operaciones.filter((o) => o.condiciones_pendientes) || [];
  const distributions = data?.operaciones.filter((o) => o.sin_distribuir || o.vehiculos.length > 1 || o.reparto.length > 0) || [];
  const completed = selected?.resultado !== null && selected?.resultado !== undefined;
  const monthLabel = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const panel = (id) => ({ id, open: !!sections[id], onToggle: toggleSection });
  return <div className="page-content traslados-resultados resultados-page">
    <header className="resultados-heading">
      <div><h1>Bandimóviles</h1><p>Resultados del mes</p></div>
      <button type="button" className="resultados-refresh" disabled={loading || busy} onClick={load} aria-label="Actualizar resultados"><span aria-hidden="true">↻</span> Actualizar</button>
    </header>
    <nav className="resultados-nav" aria-label="Secciones de Bandimóviles"><Link to="/traslados/dia">Hoja de ruta</Link><Link to="/traslados/rendiciones">Rendiciones</Link><Link to="/traslados/configuracion">Configuración</Link></nav>
    <div className="resultados-filtros">
      <label className="form-field">Mes<input type="month" required value={mes} disabled={busy} onChange={(e) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) { setMes(e.target.value); setMessage(""); } }} /></label>
      <label className="form-field">Móvil<select value={vehicle} onChange={(e) => setVehicle(e.target.value)} disabled={busy}><option value="">Todos los móviles</option>{catalogs.vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}<option value="sin_asignar">Sin distribuir</option></select></label>
    </div>
    {error && <p role="alert" className="traslados-error resultados-message">{error}</p>}
    {message && <p role="status" className="resultados-message">{message}</p>}
    {loading ? <p role="status">Cargando resultados…</p> : selected ? <>
      <section className={`resultados-balance${completed && selected.resultado < 0 ? " resultados-balance--negative" : ""}`} aria-label="Resultado del período">
        <span className="resultados-eyebrow">Resultado del mes</span>
        <h2>{completed ? fmt(selected.resultado) : "Ganancia por calcular"}</h2>
        <p>{selected.nombre} · {monthLabel}</p>
        <span className={`resultados-status${completed ? " resultados-status--ready" : ""}`}>{completed ? "Resultado calculado" : financialPending.length ? `${financialPending.length} pendientes por revisar` : "Falta completar información"}</span>
        <details className="resultados-ayuda"><summary>Cómo se calcula</summary><p>Cobros registrados menos el pago pactado a choferes y los gastos del período. El dinero cobrado por un chofer no determina su remuneración. Los presupuestos y los cobros pendientes no son ingresos cobrados.</p><p>En consultas parciales desde Inicio, los gastos fijos se prorratean por días.</p></details>
      </section>
      {data.historicos.cantidad > 0 && <ResultadosPanel {...panel("historicos")} title="Registros anteriores" description={`${num(data.historicos.cantidad)} traslados · Importe registrado${vehicle ? " · Total del local" : ""}`} badge={fmt(data.historicos.importe_registrado)}>
        <p>Se conservan separados de los cobros nuevos. Falta conocer sus costos, asignaciones y fecha real de cobro para calcular su ganancia.</p>
        <p className="resultados-caption">Este importe es el total del registro anterior del local; no está distribuido entre móviles.</p>
      </ResultadosPanel>}
      {!completed && <ResultadosPendientes pendientes={financialPending} onOpen={openSection} />}
      <ResultadosPanel {...panel("cuenta")} title="Cobros y costos actuales" description="Solo registros del formato actual" badge={fmt(selected.ingresos) + " cobrados"}>
        <dl className="resultados-importes" aria-label="Cuenta de resultados">
          {[["Cobros registrados", selected.ingresos], ["Pago calculado a choferes", selected.pago_choferes], ["Gastos registrados", selected.gastos]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{fmt(value)}</dd></div>)}
        </dl>
        {!completed && <p className="resultados-caption">Subtotal conocido: {fmt(selected.subtotal)}. Puede cambiar al completar los pendientes; no es la ganancia final.</p>}
      </ResultadosPanel>
      <div className="resultados-section-label">Gestión del mes</div>
      <ResultadosPanel {...panel("gastos")} title="Gastos del mes" description="Categorías, asignaciones y revisión" badge={data.gastos.confirmado ? "Revisados" : "Por revisar"}>
        <ResultadosPanel {...panel("categorias")} title="Categorías del vehículo" description="Elegí qué gastos corresponden a los móviles" badge={data.gastos.categorias.length + " elegidas"}>
          <Categorias categories={catalogs.categories} selected={data.gastos.categorias} mutate={mutate} busy={busy} />
        </ResultadosPanel>
        <div className="traslados-registros">{data.costos.filter((c) => c.tipo !== "externo").map((c) => <div className="traslados-registro" key={`${c.tipo}-${c.id}`}><div><strong>{c.concepto} · {fmt(c.monto_periodo)}</strong><p>{c.fecha} · {c.tipo === "fijo" ? "Cargo fijo del mes" : "Gasto diario"}</p></div><VehicleSelect vehicles={catalogs.vehicles} value={c.vehiculo_id} disabled={busy} onChange={(e) => mutate(() => asignarGastoTraslado(c.tipo, c.id, { vehiculo_id: e.target.value || null, revision: c.revision }), "Móvil del gasto actualizado.")} /></div>)}</div>
        {data.costos.length === 0 && <p>No hay gastos registrados para las categorías elegidas ni costos externos en este mes.</p>}
        {!data.gastos.mes_fijo_armado && <p className="resultados-notice">El mes aún no está armado en <Link to="/expenses/fixed">Gastos fijos</Link>. Revisá si corresponde cargar seguro, patente u otros cargos.</p>}
        <p>Confirmá después de revisar todos los gastos del mes, incluidos los pagados por socios o choferes. Si un gasto cambia, la revisión vuelve a quedar pendiente.</p>
        {!data.gastos.configurado && <p className="resultados-caption">Primero guardá la selección de categorías, incluso si verificaste que no corresponde elegir ninguna.</p>}
        <button type="button" className="btn-primary" disabled={busy || data.gastos.confirmado || !data.gastos.configurado} onClick={() => mutate(() => confirmarGastosTraslados({ from: data.from, to: data.to, revision: data.gastos.revision, confirmar: true }), "Gastos revisados.")}>{data.gastos.confirmado ? "Gastos del mes revisados" : "Confirmar revisión del mes"}</button>
      </ResultadosPanel>
      <ResultadosPanel {...panel("externos")} title="Gastos de socios y choferes" description="Pagados fuera del local" badge={data.costos_externos.filter((r) => !r.anulado).length}>
        <Registros tipo="costos-externos" rows={data.costos_externos} vehicles={catalogs.vehicles} drivers={catalogs.drivers} date={date} mutate={mutate} busy={busy} />
      </ResultadosPanel>
      <ResultadosPanel {...panel("jornales")} title="Jornales de choferes" description="Un registro por persona y día" badge={data.jornadas_pendientes.length ? `${data.jornadas_pendientes.length} pendientes` : data.jornadas.filter((r) => !r.anulado).length}>
        {data.jornadas_pendientes.length > 0 && <div className="resultados-notice"><strong>Jornales por registrar</strong><ul>{data.jornadas_pendientes.map((j) => <li key={`${j.fecha}-${j.chofer_id}`}>{j.fecha} · {catalogs.drivers.find((d) => d.id === j.chofer_id)?.name || "Chofer"} · importe pactado: {fmt(j.monto_sugerido)}</li>)}</ul></div>}
        <Registros tipo="jornadas" rows={data.jornadas} vehicles={catalogs.vehicles} drivers={catalogs.drivers} date={date} mutate={mutate} busy={busy} />
      </ResultadosPanel>
      {(unknownConditions.length > 0 || financialPending.includes("pago_sin_definir")) && <ResultadosPanel {...panel("condiciones")} title="Condiciones de los viajes" description="Revisión individual del pago pactado" badge={unknownConditions.length}>
        <CondicionesPendientes operations={unknownConditions} config={catalogs.config} busy={busy} mutate={mutate} />
      </ResultadosPanel>}
      <div className="resultados-section-label">Actividad y análisis</div>
      <ResultadosPanel {...panel("actividad")} title="Actividad del mes" description="Recorridos completos del formato actual" badge={`${num(selected.realizados)} viajes`}>
        <div className="resultados-actividad">
          {[["Viajes completos", num(selected.realizados)], ["Bonificados", num(selected.bonificados)], ["Promedio cobrado", fmt(selected.ingreso_promedio_cobrado)], ["Costo por viaje", fmt(selected.costo_por_traslado)], ["Viajes por día activo", num(selected.traslados_por_dia_activo)], ["Días con actividad", num(selected.dias_activos)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        {selected.realizados === 0 && <p className="resultados-caption">No hay recorridos completos registrados en el formato actual para este período. Los registros anteriores se muestran aparte.</p>}
        <h3 className="resultados-subheading">Por día de la semana</h3>
        <div className="resultados-semana">{[1, 2, 3, 4, 5, 6, 0].map((i) => <div key={i} aria-label={`${FULL_DAYS[i]}: ${num(selected.por_dia_semana[i])} viajes`}><span>{DAYS[i]}</span><strong>{num(selected.por_dia_semana[i])}</strong></div>)}</div>
        <details className="resultados-ayuda"><summary>Cómo se cuenta la actividad</summary><p>Un viaje cuenta una vez cuando todos sus tramos activos están entregados, por la fecha programada del último tramo. Los repartos entre móviles cuentan como fracciones equivalentes. El promedio usa la fecha de cobro; el costo por viaje relaciona los costos del período con su actividad.</p></details>
      </ResultadosPanel>
      <ResultadosPanel {...panel("asignaciones")} title="Comparación y reparto por móvil" description="Resultados y distribución de los viajes" badge={distributions.length ? `${distributions.length} repartos` : null}>
        <div className="resultados-vehiculos">{data.vehiculos.map((v) => <article key={v.vehiculo_id || "sin_asignar"}><h3>{v.nombre}</h3><dl>{[["Cobrado", v.ingresos], ["Choferes", v.pago_choferes], ["Gastos", v.gastos], ["Resultado", v.resultado]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{fmt(value)}</dd></div>)}</dl></article>)}</div>
        <p>Los gastos se asignan a cada móvil desde <button className="resultados-text-button" type="button" onClick={() => openSection("gastos")}>Gastos del mes</button>.</p>
        <h3 className="resultados-subheading">Reparto de viajes</h3><p>Un único móvil recibe el 100%. Si participaron varios, indicá el reparto del viaje completo.</p>
        {distributions.map((o) => <Reparto key={o.id} operation={o} vehicles={catalogs.vehicles} mutate={mutate} busy={busy} />)}
        {!distributions.length && <p>No hay viajes que requieran un reparto manual en este mes.</p>}
      </ResultadosPanel>
      <ResultadosPanel {...panel("referencia")} title="Comparar con un chofer de referencia" description="Escenario alternativo al pago pactado" badge={referencePending.length ? `${referencePending.length} pendientes` : null}>
        <dl className="resultados-importes"><div><dt>Costo de referencia</dt><dd>{fmt(selected.costo_referencia)}</dd></div><div><dt>Resultado estimado</dt><dd>{fmt(selected.resultado_referencia)}</dd></div></dl>
        {referencePending.length > 0 && <ul>{referencePending.map((p) => <li key={p}>{MOTIVOS_RESULTADO[p] || "Revisá las condiciones de referencia."}</li>)}</ul>}
        <p className="resultados-caption">La comparación reemplaza el pago pactado por el costo de referencia; no suma ambos. Usa las condiciones guardadas en cada viaje.</p>
        <Link to="/traslados/configuracion">Revisar configuración de referencia</Link>
      </ResultadosPanel>
      <ResultadosPanel {...panel("simulador")} title="¿Conviene sumar otro móvil?" description="Simulá costos y punto de equilibrio">
        <SimuladorMovil promedio={selected.ingreso_promedio_cobrado} embedded />
      </ResultadosPanel>
    </> : !loading && !error && <p role="status" className="resultados-message">No hay información para este móvil. Elegí otro filtro.</p>}
  </div>;
}
