import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { asignarGastoTraslado, confirmarGastosTraslados, getTrasladosResultados, guardarCostoTraslado, repartirTraslado, saveCategoriasTraslados, getTrasladoConfig, revisarCondicionesTraslado } from "../../services/trasladosApi";
import { MOTIVOS_RESULTADO } from "../../lib/trasladosResultados";
import { monthBoundsISO, todayISO } from "../../utils/dates";
import SimuladorMovil from "../../components/traslados/SimuladorMovil";
import "../../styles/traslados.css";

const fmt = (n) => n === null || n === undefined ? "Pendiente" : Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const num = (n) => n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const vehicleName = (vehicles, id) => vehicles.find((v) => v.id === id)?.nombre || "Sin distribuir";

function VehicleSelect({ vehicles, value, onChange, label = "Móvil", disabled = false }) {
  return <label className="form-field">{label}<select value={value || ""} onChange={onChange} disabled={disabled}><option value="">Sin distribuir</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.activo === false ? " (inactivo)" : ""}</option>)}</select></label>;
}

function Categorias({ categories, selected, mutate, busy }) {
  const [ids, setIds] = useState(selected);
  return <form onSubmit={(e) => { e.preventDefault(); mutate(() => saveCategoriasTraslados(ids), "Categorías guardadas. Volvé a revisar los gastos del mes."); }}>
    <fieldset disabled={busy} className="traslados-tramo">
      <legend>Categorías de gastos del vehículo</legend>
      <p>Elegí las categorías que usás para nafta, mantenimiento, seguro y patente. Se leen los gastos diarios y los cargos fijos de cada mes; no se copian ni se vuelven a sumar en Caja.</p>
      <p>Dejá afuera los pagos a choferes: se calculan por separado según las condiciones pactadas.</p>
      {categories.length ? categories.map((c) => <label className="traslados-check" key={c.id}><input type="checkbox" checked={ids.includes(c.id)} onChange={(e) => setIds((old) => e.target.checked ? [...old, c.id] : old.filter((id) => id !== c.id))} />{c.name}</label>) : <p>No hay categorías. Podés crearlas en <Link to="/catalog/expense-categories">Categorías de gastos</Link>.</p>}
      <button type="submit" className="btn-secondary">Guardar categorías</button>
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
  if (!operations.length) return null;
  return <section className="card traslados-resultados-seccion"><h2>Viajes sin condiciones económicas</h2>
    <p>Guardar una configuración nueva no cambia viajes anteriores. Si verificaste que a uno de estos viajes le correspondían las condiciones vigentes, podés asignárselas individualmente. Queda registrada la revisión.</p>
    {config?.modelo_pago ? <p>Condiciones a asignar · versión {config.version}: {config.modelo_pago === "ninguno" ? "sin pago al chofer" : config.modelo_pago === "porcentaje" ? `${config.valor_pago}% para choferes` : `${fmt(config.valor_pago)} por jornal`}. Referencia: {config.costo_referencia === null ? "pendiente" : `${fmt(config.costo_referencia)} por ${config.unidad_referencia === "dia" ? "día" : "traslado"}`}.</p> : <p>Primero definí el pago al chofer en <Link to="/traslados/configuracion">Configuración</Link>.</p>}
    {operations.map((o) => <div key={o.id} className="traslados-tramo"><strong>{o.mascota} · {fmt(o.precio)}</strong><label className="traslados-check"><input type="checkbox" disabled={busy || !config?.modelo_pago} checked={!!confirmed[o.id]} onChange={(e) => setConfirmed((v) => ({ ...v, [o.id]: e.target.checked }))} />Verifiqué que estas condiciones corresponden a este viaje</label><button type="button" className="btn-secondary" disabled={busy || !confirmed[o.id] || !config?.modelo_pago} onClick={() => mutate(() => revisarCondicionesTraslado(o.id, { configuracion_id: config.id, confirmar: true }), "Condiciones revisadas para ese viaje.")}>Asignar condiciones a este viaje</button></div>)}
  </section>;
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
  return <section className="card traslados-resultados-seccion">
    <h2>{jornada ? "Jornales de choferes" : "Gastos pagados fuera del local"}</h2>
    <p>{jornada ? "Registrá una jornada por chofer y fecha, con el importe pactado. No se multiplica por la cantidad de perros ni de tramos. Es un costo de la unidad; registrarlo no genera un pago en Caja." : "Cargá los gastos del vehículo que pagó un socio o chofer y que no están en Gastos del local. No repitas aquí un gasto ya registrado. Estos importes no generan movimientos en Caja."}</p>
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
  </section>;
}

export default function TrasladosResultadosPage() {
  const [mes, setMes] = useState(() => todayISO().slice(0, 7));
  const [vehicle, setVehicle] = useState("");
  const [data, setData] = useState(null);
  const [catalogs, setCatalogs] = useState({ vehicles: [], drivers: [], categories: [], config: null });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
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
    } catch (err) { if (current === generation.current) setError(`${err.message}${err.status === 409 ? " Usá Volver a cargar para revisar los datos actuales." : ""}`); return false; }
    finally { setBusy(false); }
  }
  const selected = data && (vehicle ? data.vehiculos.find((v) => (v.vehiculo_id || "sin_asignar") === vehicle) : data.total);
  const date = todayISO().startsWith(mes) ? todayISO() : `${mes}-01`;
  return <div className="page-content traslados-resultados">
    <header className="page-header"><div><h1>Bandimóviles · Resultados</h1><p>La cuenta de los traslados, con sus propios ingresos y costos.</p></div></header>
    <nav className="traslados-resultados-links"><Link to="/traslados/dia">Hoja de ruta</Link><Link to="/traslados/configuracion">Configurar pago y referencia</Link></nav>
    <div className="form-grid card traslados-resultados-filtros">
      <label className="form-field">Mes<input type="month" required value={mes} disabled={busy} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { setMes(e.target.value); setMessage(""); } }} /></label>
      <label className="form-field">Ver resultado de<select value={vehicle} onChange={(e) => setVehicle(e.target.value)} disabled={busy}><option value="">Todos los móviles</option>{catalogs.vehicles.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}<option value="sin_asignar">Sin distribuir</option></select></label>
      <button type="button" className="btn-secondary" disabled={loading || busy} onClick={load}>Volver a cargar</button>
    </div>
    {error && <p role="alert" className="traslados-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">Cargando resultados…</p> : selected && <>
      <section className="traslados-resultados-kpis" aria-label="Cuenta de resultados">
        {[["Ingresos cobrados", selected.ingresos], ["Pago a choferes calculado", selected.pago_choferes], ["Gastos registrados", selected.gastos], ["Resultado según lo pactado", selected.resultado]].map(([label, value]) => <div className="card" key={label}><span>{label}</span><strong>{fmt(value)}</strong></div>)}
      </section>
      <section className="card traslados-resultados-seccion">
        <h2>{selected.nombre}</h2>
        <p>Resultado = cobros registrados − pago a choferes según las condiciones guardadas − gastos del período. Quién cobró el traslado no determina cuánto le corresponde al chofer.</p>
        <p>Los gastos fijos se prorratean por días si consultás parte del mes desde Inicio. Los presupuestos y cobros pendientes no se suman a los ingresos.</p>
        {selected.pendientes.length > 0 && <div className="traslados-resultados-pendientes"><strong>Faltan datos para completar la cuenta</strong><ul>{selected.pendientes.map((p) => <li key={p}>{MOTIVOS_RESULTADO[p] || p}</li>)}</ul>{selected.resultado === null ? <p>Subtotal con los importes conocidos: {fmt(selected.subtotal)}. Puede cambiar al completar los datos.</p> : <p>El resultado según lo pactado está calculado. Los pendientes indicados afectan la comparación con un chofer de referencia.</p>}</div>}
        <h3>Si contratáramos un chofer de referencia</h3>
        <p>Costo de referencia: <strong>{fmt(selected.costo_referencia)}</strong> · Resultado estimado: <strong>{fmt(selected.resultado_referencia)}</strong></p>
        <p className="agenda-helper">Esta comparación reemplaza el pago pactado por el costo de referencia; no suma ambos. Usa las condiciones guardadas en cada viaje, sin aplicar la configuración actual a los anteriores.</p>
      </section>
      <section className="card traslados-resultados-seccion">
        <h2>Actividad e indicadores</h2>
        <div className="traslados-indicadores">
          <p><strong>{num(selected.realizados)}</strong> viajes completos realizados</p><p><strong>{num(selected.bonificados)}</strong> bonificados</p>
          <p><strong>{fmt(selected.ingreso_promedio_cobrado)}</strong> por viaje cobrado</p><p><strong>{fmt(selected.costo_por_traslado)}</strong> de costo por viaje realizado</p>
          <p><strong>{num(selected.traslados_por_dia_activo)}</strong> viajes por día con actividad</p><p><strong>{selected.dias_activos}</strong> días con actividad</p>
        </div>
        <p className="agenda-helper">Un viaje completo cuenta una vez cuando todos sus tramos activos están entregados, según la fecha programada del último tramo. Los repartos entre móviles cuentan como fracciones equivalentes. El ingreso promedio usa la fecha del cobro; el costo por viaje relaciona los costos del período con su actividad.</p>
        <div className="traslados-semana">{[1, 2, 3, 4, 5, 6, 0].map((i) => <div key={i}><span>{DAYS[i]}</span><strong>{num(selected.por_dia_semana[i])}</strong></div>)}</div>
      </section>
      <section className="card traslados-resultados-seccion"><h2>Comparación por móvil</h2><div className="traslados-tabla-scroll"><table><thead><tr><th>Móvil</th><th>Cobrado</th><th>Choferes</th><th>Gastos</th><th>Resultado</th></tr></thead><tbody>{data.vehiculos.map((v) => <tr key={v.vehiculo_id || "sin_asignar"}><th>{v.nombre}</th><td>{fmt(v.ingresos)}</td><td>{fmt(v.pago_choferes)}</td><td>{fmt(v.gastos)}</td><td>{fmt(v.resultado)}</td></tr>)}</tbody></table></div></section>
      {data.historicos.cantidad > 0 && <section className="card traslados-resultados-seccion"><h2>Registros del formato anterior</h2><p>{data.historicos.cantidad} traslados · {fmt(data.historicos.importe_registrado)} registrados con el criterio anterior. Se muestran aparte porque no conocemos sus costos, asignaciones o fecha real de cobro.</p></section>}
      <CondicionesPendientes operations={data.operaciones.filter((o) => o.condiciones_pendientes)} config={catalogs.config} busy={busy} mutate={mutate} />
      <section className="card traslados-resultados-seccion" aria-label="Revisión de gastos">
        <h2>Gastos del mes y revisión</h2>
        <Categorias categories={catalogs.categories} selected={data.gastos.categorias} mutate={mutate} busy={busy} />
        <div className="traslados-registros">{data.costos.filter((c) => c.tipo !== "externo").map((c) => <div className="traslados-registro" key={`${c.tipo}-${c.id}`}><div><strong>{c.concepto} · {fmt(c.monto_periodo)}</strong><p>{c.fecha} · {c.tipo === "fijo" ? "Cargo fijo del mes" : "Gasto diario"}</p></div><VehicleSelect vehicles={catalogs.vehicles} value={c.vehiculo_id} disabled={busy} onChange={(e) => mutate(() => asignarGastoTraslado(c.tipo, c.id, { vehiculo_id: e.target.value || null, revision: c.revision }), "Móvil del gasto actualizado.")} /></div>)}</div>
        {data.costos.length === 0 && <p>No hay gastos de las categorías elegidas ni costos externos cargados en este mes.</p>}
        {!data.gastos.mes_fijo_armado && <p>El mes todavía no está armado en Gastos fijos. Revisá si corresponde cargar seguro, patente u otros cargos.</p>}
        <p>Antes de confirmar, revisá que estén cargados todos los gastos del mes, incluidos los pagados fuera del local. Si un gasto cambia, la revisión queda pendiente nuevamente.</p>
        <button type="button" className="btn-primary" disabled={busy || data.gastos.confirmado || !data.gastos.configurado} onClick={() => mutate(() => confirmarGastosTraslados({ from: data.from, to: data.to, revision: data.gastos.revision, confirmar: true }), "Gastos revisados.")}>{data.gastos.confirmado ? "Gastos del mes revisados" : "Confirmar que revisé los gastos del mes"}</button>
      </section>
      <Registros tipo="costos-externos" rows={data.costos_externos} vehicles={catalogs.vehicles} drivers={catalogs.drivers} date={date} mutate={mutate} busy={busy} />
      {data.jornadas_pendientes.length > 0 && <div className="traslados-resultados-pendientes"><strong>Jornales pendientes de registrar</strong><ul>{data.jornadas_pendientes.map((j) => <li key={`${j.fecha}-${j.chofer_id}`}>{j.fecha} · {catalogs.drivers.find((d) => d.id === j.chofer_id)?.name || "Chofer"} · valor pactado de referencia: {fmt(j.monto_sugerido)}</li>)}</ul></div>}
      <Registros tipo="jornadas" rows={data.jornadas} vehicles={catalogs.vehicles} drivers={catalogs.drivers} date={date} mutate={mutate} busy={busy} />
      <section className="card traslados-resultados-seccion"><h2>Reparto de viajes entre móviles</h2><p>Cuando un solo móvil hace el viaje, recibe el 100% automáticamente. Si participaron varios, indicá el reparto que corresponda.</p>{data.operaciones.filter((o) => o.sin_distribuir || o.vehiculos.length > 1 || o.reparto.length > 0).map((o) => <Reparto key={o.id} operation={o} vehicles={catalogs.vehicles} mutate={mutate} busy={busy} />)}{data.operaciones.every((o) => !o.sin_distribuir && o.vehiculos.length <= 1 && !o.reparto.length) && <p>No hay viajes que requieran un reparto manual en este mes.</p>}</section>
      <SimuladorMovil promedio={selected.ingreso_promedio_cobrado} />
    </>}
  </div>;
}
