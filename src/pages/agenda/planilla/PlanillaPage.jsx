import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAgendaDay } from "../../../hooks/useAgendaDay";
import { useApiResource } from "../../../hooks/useApiResource";
import { getAgendaDayNote, saveAgendaDayNote } from "../../../services/agendaApi";
import { copyToClipboard } from "../../../services/bookingApi";
import { todayISO } from "../../../utils/dates";
import {
  armarRenglones, buscarBandidos, coloresPeluqueras, distanciaDias, fechaCorta, fechaLarga, fondoRenglon,
  formatoPlata, libresAgrupados, listaPeluqueras, lugaresDelDia, moverLugar, HORAS_15, montoDe, peluquerasDeTurno, rangoHorario, sumarDias, textoLibres,
} from "../../../lib/planilla";
import usePlanillaLocal from "./usePlanillaLocal";
import TurnoModal from "./TurnoModal";
import CierreModal from "./CierreModal";
import PeluqueraModal from "./PeluqueraModal";
import CierreDia from "./CierreDia";
import EquipoModal from "./EquipoModal";
import QuienModal from "./QuienModal";
import { resumenCierre } from "../../../lib/cierreDia";
import "../../../styles/planilla.css";

const ESTADO_TAG = { cancelled: "Canceló", no_show: "No vino" };
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

function RenglonLibre({ time, mascotas, textoInicial = "", enfocar = false, onElegir, onNuevo }) {
  const [texto, setTexto] = useState(textoInicial || "");
  const [abierto, setAbierto] = useState(enfocar);
  const [activo, setActivo] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (enfocar) { ref.current?.focus(); ref.current?.scrollIntoView({ block: "center" }); } }, [enfocar]);
  const resultados = useMemo(() => buscarBandidos(mascotas, texto), [mascotas, texto]);
  const opciones = texto.trim() ? [...resultados.map((m) => ({ m })), { nuevo: texto.trim() }] : [];
  const elegir = (o) => { setAbierto(false); setTexto(""); if (o.m) onElegir(o.m, time); else onNuevo(o.nuevo, time); };
  const id = useId();
  return (
    <div className="pl-entry">
      <input
        ref={ref}
        value={texto}
        placeholder="libre · escribí el nombre del bandido"
        aria-label={`Agendar a las ${time}`}
        role="combobox"
        aria-expanded={abierto && opciones.length > 0}
        aria-controls={id}
        autoComplete="off"
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (!opciones.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(opciones.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(0, a - 1)); }
          if (e.key === "Enter") { e.preventDefault(); elegir(opciones[activo]); }
          if (e.key === "Escape") setAbierto(false);
        }}
      />
      {abierto && opciones.length > 0 && (
        <ul className="pl-suggest" role="listbox" id={id}>
          {opciones.map((o, i) => (
            <li key={o.m ? o.m.id : "nuevo"} role="option" aria-selected={i === activo} className={i === activo ? "is-active" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(o)}>
              {o.m ? <><strong>{o.m.name}</strong> ({o.m.owner_name || "sin dueño"})<small>{[o.m.breed, o.m.behavior && `⚠ ${o.m.behavior}`].filter(Boolean).join(" · ")}</small></>
                : <><strong>+ {o.nuevo}</strong> es un bandido nuevo<small>Cargá raza y dueño una sola vez</small></>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PlanillaPage() {
  const [params, setParams] = useSearchParams();
  const hoy = todayISO();
  const fecha = esFecha(params.get("date")) ? params.get("date") : hoy;
  const irA = useCallback((iso) => {
    setParams((prev) => { const p = new URLSearchParams(prev); p.set("date", iso); p.delete("turno"); return p; }, { replace: true });
  }, [setParams]);

  const { items, loading, error, refetch } = useAgendaDay(fecha);
  const { items: servicios } = useApiResource("/v2/service-types");
  const { items: medios } = useApiResource("/v2/payment-methods");
  const { items: empleados } = useApiResource("/v2/employees");
  const { items: mascotas, refresh: refrescarMascotas } = useApiResource("/v2/pets");
  const [local, updateLocal] = usePlanillaLocal();

  const peluqueras = useMemo(() => listaPeluqueras(empleados, local.peluqueras ?? null), [empleados, local.peluqueras]);
  const colores = useMemo(() => coloresPeluqueras(peluqueras, local.colors), [peluqueras, local.colors]);
  const serviciosActivos = useMemo(() => servicios.filter((s) => s.status !== "inactive" && s.active !== false && !s.archived_at), [servicios]);
  const mediosActivos = useMemo(() => medios.filter((m) => m.status !== "inactive" && m.active !== false && m.is_active !== false), [medios]);
  const mascotaPorId = useMemo(() => new Map(mascotas.map((m) => [String(m.id), m])), [mascotas]);

  const dia = useMemo(() => local.days[fecha] || {}, [local.days, fecha]);
  const presentes = Object.fromEntries(peluqueras.map((p) => [String(p.id), dia.present?.[p.id] !== false]));
  const horarioDe = (id) => dia.hours?.[id] || local.defaultHours?.[id] || null;
  const turnos = useMemo(() => items.map((t) => ({ ...t, pet: mascotaPorId.get(String(t.pet_id)) })), [items, mascotaPorId]);
  const lugares = useMemo(() => lugaresDelDia(dia), [dia]);
  const renglones = useMemo(() => armarRenglones(turnos, { molde: lugares }), [turnos, lugares]);

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const toastTimer = useRef(null);
  const avisar = useCallback((msg, accion) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, accion });
    toastTimer.current = setTimeout(() => setToast(null), accion ? 12000 : 3500);
  }, []);

  // Enlaces de otras pantallas: ?turno=ID abre el turno; ?nuevoTurno=1 agenda (con ?petId y ?traslado=1).
  const clave = params.toString();
  const [linkUsado, setLinkUsado] = useState("");
  const modalLink = useMemo(() => {
    if (linkUsado === clave || loading) return null;
    const turnoId = params.get("turno");
    if (turnoId) {
      const t = turnos.find((x) => String(x.id) === turnoId);
      return t ? { tipo: "cierre", turno: t } : null;
    }
    if (params.get("nuevoTurno") === "1" && params.get("petId")) {
      const mascota = mascotaPorId.get(String(params.get("petId")));
      const libre = renglones.find((r) => r.tipo === "libre");
      return mascota ? { tipo: "nuevo", time: libre?.time || "09:00", mascota, conTraslado: params.get("traslado") === "1" } : null;
    }
    return null;
  }, [linkUsado, clave, loading, params, turnos, mascotaPorId, renglones]);
  const enfocarPrimerLibre = linkUsado !== clave && params.get("nuevoTurno") === "1" && !params.get("petId");
  const modalActual = modal || modalLink;
  const abrir = useCallback((m) => { setLinkUsado(clave); setModal(m); }, [clave]);

  // Nota del día (se guarda en la base al salir del cuadro).
  const [notaData, setNotaData] = useState({ fecha: null, texto: "", estado: "" });
  useEffect(() => {
    let vivo = true;
    getAgendaDayNote(fecha)
      .then((n) => { if (vivo) setNotaData({ fecha, texto: n.note || "", estado: "" }); })
      .catch(() => { if (vivo) setNotaData({ fecha, texto: "", estado: "No se pudo cargar la nota." }); });
    return () => { vivo = false; };
  }, [fecha]);
  const nota = notaData.fecha === fecha ? notaData.texto : "";
  const notaEstado = notaData.fecha === fecha ? notaData.estado : "";
  const setNotaEstado = (estado) => setNotaData((prev) => ({ ...prev, estado }));

  async function guardarNota() {
    try { await saveAgendaDayNote(fecha, nota); setNotaEstado("Nota guardada."); } catch { setNotaEstado("No se pudo guardar la nota. Probá de nuevo."); }
  }

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (modalActual || ["input", "textarea", "select"].includes(tag)) return;
      if (e.key === "ArrowLeft") irA(sumarDias(fecha, -1));
      if (e.key === "ArrowRight") irA(sumarDias(fecha, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fecha, irA, modalActual]);

  const primerLibre = renglones.find((r) => r.tipo === "libre");
  const activos = turnos.filter((t) => t.status !== "cancelled" && t.status !== "no_show");
  const libres = renglones.filter((r) => r.tipo === "libre");
  const totalTraslados = activos.reduce((a, t) => a + (t.traslado ? montoDe(t.traslado_amount) : 0), 0);
  const totalTerminados = resumenCierre(turnos, servicios, medios).finishedIncome;
  const cerrar = useCallback(() => { setLinkUsado(clave); setModal(null); }, [clave]);

  async function alGuardar(msg, liberado) {
    cerrar();
    await refetch();
    if (liberado) {
      const espera = local.wait[0];
      const texto = `Se liberó ${liberado.time?.slice(0, 5)} (${liberado.pet_name || "turno"}).`;
      if (espera) avisar(`${texto} En espera: ${espera.text}.`, { label: `Agendar a ${espera.text.split(" ")[0]}`, run: () => usarEspera(espera) });
      else avisar(texto);
    } else if (msg) avisar(msg);
  }

  function usarEspera(espera) {
    const libre = renglones.find((r) => r.tipo === "libre");
    if (!libre) { avisar("No hay lugares libres. Agregá un renglón."); return; }
    updateLocal((d) => { d.wait = d.wait.filter((w) => w.id !== espera.id); return d; });
    setPrefill({ key: libre.key, text: espera.text.split(" ")[0] });
  }

  function agregarRenglon(tarde) {
    const delBloque = renglones.filter((r) => (tarde ? r.time >= "13:00" : r.time < "13:00"));
    const ultima = delBloque.length ? delBloque[delBloque.length - 1].time : tarde ? "15:00" : "09:00";
    updateLocal((d) => { const dd = (d.days[fecha] = d.days[fecha] || {}); dd.slots = [...lugaresDelDia(dd), ultima].sort(); delete dd.extras; return d; });
  }

  // Tocar la hora de un renglón libre: cambiarla o quitar el renglón (solo ese día).
  function cambiarHoraLibre(desde, hasta) {
    updateLocal((d) => { const dd = (d.days[fecha] = d.days[fecha] || {}); dd.slots = moverLugar(lugaresDelDia(dd), desde, hasta || null); delete dd.extras; return d; });
    avisar(hasta ? `Renglón de las ${desde} pasó a las ${hasta}.` : `Se quitó un renglón de las ${desde}.`);
  }

  function guardarPeluquera(p, { viene, horario, habitual, color }) {
    updateLocal((d) => {
      const dd = (d.days[fecha] = d.days[fecha] || {});
      dd.present = { ...(dd.present || {}), [p.id]: viene };
      if (viene) {
        dd.hours = { ...(dd.hours || {}), [p.id]: horario };
        if (habitual) d.defaultHours = { ...(d.defaultHours || {}), [p.id]: horario };
      }
      d.colors = { ...(d.colors || {}), [p.id]: color };
      return d;
    });
    cerrar();
    avisar(`${p.name} ${viene ? `viene de ${rangoHorario(horario)}${habitual ? " (también los próximos días)" : ""}` : "no viene"}.`);
  }

  async function copiarLibres() {
    const ok = await copyToClipboard(textoLibres(fecha, renglones));
    avisar(ok ? "Horarios libres copiados. Pegalos en WhatsApp." : "No se pudo copiar. Probá de nuevo.");
  }

  function filaTurno(r) {
    const t = r.turno;
    const ids = peluquerasDeTurno(t);
    const cs = ids.map((id) => colores[id]).filter(Boolean);
    const fondo = fondoRenglon(cs);
    const apagado = t.status === "cancelled" || t.status === "no_show";
    const servicio = servicios.find((s) => String(s.id) === String(t.service_type_id))?.name || t.service_type?.name;
    const nombres = ids.map((id) => peluqueras.find((p) => String(p.id) === id)?.name || empleados.find((e) => String(e.id) === id)?.name).filter(Boolean);
    const pagos = (t.payments || []).map((p) => medios.find((m) => String(m.id) === String(p.payment_method_id))?.name).filter(Boolean);
    return (
      <li key={r.key} className={`pl-row${fondo ? " has-hl" : ""}${apagado ? " is-off" : ""}${t.status === "finished" ? " is-done" : ""}`} style={fondo ? { "--hl": cs[0], "--bg-row": fondo } : undefined}>
        <button type="button" className="pl-time pl-time-btn" aria-label={`Cambiar la hora de ${t.pet_name} (${r.time})`} onClick={() => abrir({ tipo: "editar", turno: t })}>{r.time}</button>
        <div className="pl-cell">
        <button type="button" className="pl-line" onClick={() => abrir({ tipo: "cierre", turno: t })}>
          <span className="pl-main"><b>{t.pet_name}</b>{t.breed ? ` · ${t.breed}` : ""} <span className="pl-owner">({t.owner_name || "sin dueño"})</span></span>
          <span className="pl-sub">
            {servicio && <span className="pl-tag svc">{servicio}</span>}
            {montoDe(t.deposit_amount) > 0 && <span className="pl-tag ok">Seña {formatoPlata(t.deposit_amount)}</span>}
            {t.traslado && t.traslado_direccion && <span className="pl-tag">Traslado: {t.traslado_direccion}</span>}
            {t.status === "finished" && pagos.length > 0 && <span className="pl-tag ok">Cobrado · {pagos.join(" + ")}</span>}
            {t.notes && <span className="pl-tag note">{t.notes}</span>}
            {t.pet?.behavior && <span className="pl-tag note">⚠ {t.pet.behavior}</span>}
            {ESTADO_TAG[t.status] && <span className="pl-tag state">{ESTADO_TAG[t.status]}</span>}
            {t.source === "online" || t.origin === "online" ? <span className="pl-tag">Reserva online</span> : null}
          </span>
        </button>
        {!apagado && (
          <div className="pl-quien">
            {ids.map((id, i) => <span key={id} className="pl-quien-name"><span className="pl-dot" style={{ background: colores[id] || "#ccc" }} />{nombres[i] || "Peluquera"}</span>)}
            {t.status !== "finished" && (
              <button type="button" className={`pl-quien-btn${ids.length ? "" : " is-empty"}`} onClick={() => abrir({ tipo: "quien", turno: t })}>
                {ids.length ? "Cambiar" : "✂ ¿Quién lo agarra?"}
              </button>
            )}
          </div>
        )}
        </div>
        <span className="pl-money">
          {montoDe(t.price) > 0 && <span>{formatoPlata(t.price)}</span>}
          {t.traslado && <span className="pl-tras">traslado {t.traslado_bonificado ? "sin cargo" : montoDe(t.traslado_amount) ? formatoPlata(t.traslado_amount) : ""}</span>}
        </span>
      </li>
    );
  }

  function bloque(nombre, tarde) {
    const lista = renglones.filter((r) => (tarde ? r.time >= "13:00" : r.time < "13:00"));
    const nLibres = lista.filter((r) => r.tipo === "libre").length;
    const nPerros = lista.filter((r) => r.tipo === "turno" && r.turno.status !== "cancelled" && r.turno.status !== "no_show").length;
    return (
      <>
        <div className="pl-block-head"><h2>{nombre}</h2><span>{nPerros} {nPerros === 1 ? "perro" : "perros"} · {nLibres} {nLibres === 1 ? "libre" : "libres"}</span></div>
        <ol className="pl-rows">
          {lista.map((r) => (r.tipo === "turno" ? filaTurno(r) : (
            <li key={r.key} className="pl-row">
              <label className="pl-time pl-time-edit">
                <span className="sr-only">Hora del renglón libre</span>
                <select value={r.time} onChange={(e) => cambiarHoraLibre(r.time, e.target.value)}>
                  {!HORAS_15.includes(r.time) && <option value={r.time}>{r.time}</option>}
                  {HORAS_15.map((h) => <option key={h} value={h}>{h}</option>)}
                  <option value="">Quitar renglón</option>
                </select>
              </label>
              <RenglonLibre
                key={prefill?.key === r.key ? `${r.key}-${prefill.text}` : r.key}
                time={r.time}
                mascotas={mascotas}
                textoInicial={prefill?.key === r.key ? prefill.text : ""}
                enfocar={prefill?.key === r.key || (enfocarPrimerLibre && r.key === primerLibre?.key)}
                onElegir={(m, time) => abrir({ tipo: "nuevo", time, mascota: m })}
                onNuevo={(nombre, time) => abrir({ tipo: "nuevo", time, nuevoNombre: nombre })}
              />
              <span />
            </li>
          )))}
        </ol>
        <button type="button" className="pl-add-row" onClick={() => agregarRenglon(tarde)}>+ Agregar renglón a la {nombre.toLowerCase()}</button>
      </>
    );
  }

  return (
    <div className="planilla page-content">
      <header className="pl-card pl-head">
        <div className="pl-head-top">
          <nav className="pl-nav" aria-label="Cambiar de día">
            <button type="button" className="pl-navbtn pl-prev" aria-label="Día anterior" onClick={() => irA(sumarDias(fecha, -1))}>‹</button>
            <div className="pl-nav-title"><h1>{fechaLarga(fecha)}</h1><span>{distanciaDias(fecha, hoy)}</span></div>
            <button type="button" className="pl-navbtn pl-next" aria-label="Día siguiente" onClick={() => irA(sumarDias(fecha, 1))}>›</button>
            <button type="button" className="pl-today" aria-current={fecha === hoy ? "date" : undefined} onClick={() => irA(hoy)}>Hoy</button>
            <label className="pl-cal">
              <span className="sr-only">Elegir día en el calendario</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span className="pl-cal-text">Calendario</span>
              <input type="date" value={fecha} onChange={(e) => esFecha(e.target.value) && irA(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* el navegador abre su calendario */ } }} />
            </label>
          </nav>
          <div className="pl-stats">
            <div><strong>{activos.length}</strong><span>perros</span></div>
            <div className="is-free"><strong>{libres.length}</strong><span>lugares libres</span></div>
            <div><strong>{formatoPlata(totalTraslados)}</strong><span>traslados</span></div>
            <div><strong>{formatoPlata(totalTerminados)}</strong><span>terminados</span></div>
          </div>
        </div>
        <div className="pl-staff" aria-label="Quién trabaja este día">
          {peluqueras.map((p) => {
            const id = String(p.id);
            const viene = presentes[id];
            const h = horarioDe(id);
            const cuenta = activos.filter((t) => peluquerasDeTurno(t).includes(id)).length;
            return (
              <button key={id} type="button" className={`pl-chip${viene ? "" : " is-off"}`} title="Tocá para cambiar si viene, su horario o su color" onClick={() => abrir({ tipo: "peluquera", peluquera: p })}>
                <span className="pl-dot" style={{ background: colores[id] }}>{String(p.name || "?").charAt(0)}</span>
                <span className="pl-name">{p.name}</span>
                <em>{viene ? (h ? rangoHorario(h) : "cargar horario") : "no viene"}</em>
                <b>{cuenta}</b><span className="pl-edit" aria-hidden="true">✎</span>
              </button>
            );
          })}
          {!peluqueras.length && empleados.length > 0 && <span className="pl-help">No hay peluqueras con rol Groomer en Equipo.</span>}
          <button type="button" className="pl-link" onClick={() => abrir({ tipo: "equipo" })}>Elegir peluqueras</button>
          <Link className="pl-link" to="/agenda/clasica" title="La agenda anterior, con semana, mes, bloqueos y cierre del día">Agenda clásica →</Link>
        </div>
      </header>

      <div className="pl-layout">
        <main className="pl-card pl-sheet" aria-label="Turnos del día" aria-busy={loading}>
          {error ? <div className="pl-state-msg" role="alert">{error} <button type="button" className="pl-btn ghost" onClick={refetch}>Reintentar</button></div>
            : loading && !items.length ? <p className="pl-state-msg" role="status">Cargando la planilla…</p>
              : <>{bloque("Mañana", false)}{bloque("Tarde", true)}</>}
        </main>
        <aside className="pl-aside">
          <section className="pl-card pl-side" aria-labelledby="pl-h-libres">
            <h2 id="pl-h-libres">Lugares libres <span>{libres.length}</span></h2>
            <p className="pl-help">{libres.length ? libresAgrupados(renglones) : "No queda lugar este día."}</p>
            <button type="button" className="pl-btn ghost" onClick={copiarLibres}>Copiar libres para WhatsApp</button>
          </section>
          <section className="pl-card pl-side" aria-labelledby="pl-h-espera">
            <h2 id="pl-h-espera">En espera <span>{local.wait.length || ""}</span></h2>
            <ul className="pl-wait">
              {local.wait.length ? local.wait.map((w) => (
                <li key={w.id}>
                  <div><strong>{w.text}</strong><small>{w.note}</small></div>
                  <span><button type="button" onClick={() => usarEspera(w)}>Agendar</button> <button type="button" aria-label={`Sacar a ${w.text} de la espera`} onClick={() => updateLocal((d) => { d.wait = d.wait.filter((x) => x.id !== w.id); return d; })}>✕</button></span>
                </li>
              )) : <li className="pl-help">Nadie esperando.</li>}
            </ul>
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = e.currentTarget.elements.espera.value.trim();
              if (!v) return;
              const m = v.match(/^(.*?)(\s+(vive|cualquier|si se|\d{1,2}\s?hs).*)?$/i);
              updateLocal((d) => { d.wait = [...d.wait, { id: `${Date.now()}`, text: (m?.[1] || v).trim(), note: m?.[2]?.trim() || "" }]; return d; });
              e.currentTarget.reset();
            }}>
              <label className="pl-help" htmlFor="pl-espera">Anotar a alguien que espera un lugar</label>
              <input id="pl-espera" name="espera" placeholder="Ej: Panda shitzu 19hs vive al lado" autoComplete="off" />
            </form>
          </section>
          <section className="pl-card pl-side" aria-labelledby="pl-h-notas">
            <h2 id="pl-h-notas">Notas del día <span>{fechaCorta(fecha)}</span></h2>
            <textarea id="pl-notas" aria-labelledby="pl-h-notas" value={nota} onChange={(e) => { const texto = e.target.value; setNotaData({ fecha, texto, estado: "" }); }} onBlur={guardarNota} placeholder="Como el margen de la hoja: lo que quieras." />
            {notaEstado && <p className="pl-help" role="status">{notaEstado}</p>}
          </section>
        </aside>
      </div>

      <CierreDia fecha={fecha} turnos={turnos} servicios={servicios} medios={medios} empleados={empleados}
        onCopiar={async (texto) => avisar((await copyToClipboard(texto)) ? "Cierre copiado. Pegalo en el grupo." : "No se pudo copiar. Probá de nuevo.")} />

      {modalActual?.tipo === "nuevo" && (
        <TurnoModal fecha={fecha} time={modalActual.time} mascota={modalActual.mascota} nuevoNombre={modalActual.nuevoNombre} conTraslado={modalActual.conTraslado}
          servicios={serviciosActivos} medios={mediosActivos} onClose={cerrar}
          onSaved={(msg, mascotaNueva) => { if (mascotaNueva) refrescarMascotas?.(); alGuardar(msg); }} />
      )}
      {modalActual?.tipo === "editar" && (
        <TurnoModal fecha={fecha} turno={modalActual.turno} mascota={modalActual.turno.pet} servicios={serviciosActivos} medios={mediosActivos} onClose={cerrar} onSaved={(msg) => alGuardar(msg)} />
      )}
      {modalActual?.tipo === "cierre" && (
        <CierreModal turno={modalActual.turno} peluqueras={peluqueras} empleados={empleados} colores={colores} presentes={presentes} servicios={serviciosActivos} medios={mediosActivos}
          onClose={cerrar} onSaved={alGuardar} onEditar={() => abrir({ tipo: "editar", turno: modalActual.turno })} />
      )}
      {modalActual?.tipo === "quien" && (
        <QuienModal turno={modalActual.turno} peluqueras={peluqueras} colores={colores} presentes={presentes} onClose={cerrar} onChange={refetch} />
      )}
      {modalActual?.tipo === "equipo" && (
        <EquipoModal empleados={empleados} elegidas={local.peluqueras ?? null} onClose={cerrar}
          onSave={(ids) => { updateLocal((d) => { if (ids) d.peluqueras = ids; else delete d.peluqueras; return d; }); cerrar(); avisar(ids ? "Lista de peluqueras guardada." : "Se usan las del rol Groomer."); }} />
      )}
      {modalActual?.tipo === "peluquera" && (
        <PeluqueraModal peluquera={modalActual.peluquera} fecha={fecha} viene={presentes[String(modalActual.peluquera.id)]} horario={horarioDe(String(modalActual.peluquera.id))}
          color={colores[String(modalActual.peluquera.id)]} onClose={cerrar} onSave={(v) => guardarPeluquera(modalActual.peluquera, v)} />
      )}
      {toast && (
        <div className="pl-toast" role="status">
          <span>{toast.msg}</span>
          {toast.accion && <button type="button" onClick={() => { setToast(null); toast.accion.run(); }}>{toast.accion.label}</button>}
          <button type="button" className="x" aria-label="Cerrar aviso" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
