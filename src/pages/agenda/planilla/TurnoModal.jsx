import { useMemo, useState } from "react";
import Panel, { Opciones } from "./Panel";
import { apiRequest } from "../../../services/apiClient";
import { createAgendaTurno, updateAgendaTurno } from "../../../services/agendaApi";
import { getTrasladoPayload, newTramos, solicitudPayload } from "../../../lib/traslados";
import { formatoPlata, hora, montoDe } from "../../../lib/planilla";
import { normalizarId } from "../../../lib/cierreDia";

const MONTOS_TRASLADO = [5000, 8000, 10000, 15000];

// Agendar un turno (o editarlo): bandido, hora, servicio, traslado y seña.
// «servicios» es el catálogo completo (para nombre, precio y duración); «opciones», los que se ofrecen.
export default function TurnoModal({ fecha, time, mascota, nuevoNombre, turno, conTraslado, servicios, opciones = servicios, medios, onClose, onSaved }) {
  const precioDe = (id) => montoDe(servicios.find((s) => String(s.id) === String(id))?.default_price) || 0;
  const editando = !!turno;
  const esNuevo = !editando && !mascota;
  const [f, setF] = useState(() => ({
    nombre: turno?.pet_name || mascota?.name || nuevoNombre || "",
    raza: turno?.breed || mascota?.breed || "",
    dueno: turno?.owner_name || mascota?.owner_name || "",
    celular: "",
    hora: hora(turno?.time || time || "09:00"),
    servicio: turno?.service_type_id ? String(turno.service_type_id) : "",
    tras: turno ? (turno.traslado ? "si" : "no") : conTraslado ? "si" : "no",
    direccion: turno?.traslado_direccion || mascota?.address || "",
    trasMonto: turno?.traslado_amount ? String(Math.round(Number(turno.traslado_amount))) : "",
    trasSinCargo: !!turno?.traslado_bonificado,
    sena: Number(turno?.deposit_amount) > 0 ? "si" : "no",
    senaMonto: Number(turno?.deposit_amount) > 0 ? String(Math.round(Number(turno.deposit_amount))) : "",
    senaMedio: turno?.deposit_payment_method_id ? String(turno.deposit_payment_method_id) : "",
    notas: turno?.notes || "",
    precio: montoDe(turno?.price) > 0 ? String(montoDe(turno.price)) : turno?.service_type_id ? String(precioDe(turno.service_type_id) || "") : "",
    precioTocado: montoDe(turno?.price) > 0,
  }));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (patch) => { setF((prev) => ({ ...prev, ...patch })); setError(""); };
  const aviso = mascota?.behavior || "";
  const opcionesServicio = useMemo(() => {
    const lista = [...opciones];
    const actual = turno?.service_type_id && servicios.find((s) => String(s.id) === String(turno.service_type_id));
    if (actual && !lista.some((s) => String(s.id) === String(actual.id))) lista.push(actual);
    return lista.map((s) => ({ value: String(s.id), label: s.name }));
  }, [opciones, servicios, turno]);
  const elegirServicio = (v) => set({ servicio: v, ...(f.precioTocado ? {} : { precio: String(precioDe(v) || "") }) });
  const opcionesMedio = useMemo(() => medios.map((m) => ({ value: String(m.id), label: m.name })), [medios]);

  async function guardar(e) {
    e.preventDefault();
    const faltan = [];
    if (!f.nombre.trim()) faltan.push("el nombre");
    if (esNuevo && !f.dueno.trim()) faltan.push("el dueño");
    if (!/^\d{2}:\d{2}$/.test(f.hora)) faltan.push("la hora (HH:MM)");
    if (!f.servicio) faltan.push("el servicio");
    if (f.tras === "si" && !f.direccion.trim()) faltan.push("la dirección del traslado");
    if (f.tras === "si" && !f.trasSinCargo && !(montoDe(f.trasMonto) > 0)) faltan.push("el precio del traslado (o Sin cargo)");
    if (f.sena === "si" && !(montoDe(f.senaMonto) > 0)) faltan.push("el monto de la seña");
    if (f.sena === "si" && !f.senaMedio) faltan.push("el medio de la seña");
    if (f.sena === "si" && montoDe(f.senaMonto) > 0 && !(montoDe(f.precio) > 0)) faltan.push("el precio del servicio (tiene seña)");
    if (faltan.length) { setError(`Falta ${faltan.join(", ")}.`); return; }
    if (f.sena === "si" && montoDe(f.precio) < montoDe(f.senaMonto)) { setError(`El precio (${formatoPlata(f.precio)}) no puede ser menor que la seña (${formatoPlata(f.senaMonto)}).`); return; }

    const servicio = servicios.find((s) => String(s.id) === f.servicio);
    const trasForm = {
      traslado: f.tras === "si",
      traslado_direccion: f.direccion,
      traslado_amount: f.trasSinCargo ? 0 : montoDe(f.trasMonto),
      traslado_bonificado: f.tras === "si" ? f.trasSinCargo : false,
    };
    const traslado = getTrasladoPayload(trasForm, editando ? turno : null);
    if (trasForm.traslado && !(editando && turno.traslado)) {
      const tramos = newTramos().map((t) => ({ ...t, direccion: f.direccion.trim() }));
      traslado.traslado_solicitud = solicitudPayload(trasForm, tramos, fecha);
    }
    const base = {
      date: fecha,
      time: f.hora,
      service_type_id: normalizarId(f.servicio),
      deposit_amount: f.sena === "si" ? montoDe(f.senaMonto) : 0,
      deposit_payment_method_id: f.sena === "si" ? normalizarId(f.senaMedio) : undefined,
      notes: f.notas.trim(),
      // Como la agenda clásica: el precio del servicio viaja siempre que haya uno.
      price: montoDe(f.precio) > 0 ? montoDe(f.precio) : undefined,
      ...traslado,
    };

    setGuardando(true);
    try {
      if (editando) {
        await updateAgendaTurno(turno.id, base);
      } else if (esNuevo) {
        await apiRequest("/v2/agenda/with-new-pet", {
          method: "POST",
          body: {
            ...base,
            duration: Number(servicio?.duration_minutes) || 60,
            pet_name: f.nombre.trim(),
            pet_breed: f.raza.trim() || null,
            owner_name: f.dueno.trim(),
            owner_phone: f.celular.trim() || null,
            status: "reserved",
          },
        });
      } else {
        await createAgendaTurno({
          ...base,
          duration: Number(servicio?.duration_minutes) || 60,
          pet_id: mascota.id,
          pet_name: mascota.name,
          breed: mascota.breed || "",
          owner_name: mascota.owner_name || "",
          status: "reserved",
        });
      }
      onSaved(`${editando ? "Turno actualizado" : "Agendado"}: ${f.nombre.trim()}${f.dueno ? ` (${f.dueno.trim()})` : ""} a las ${f.hora}.`, esNuevo);
    } catch (err) {
      setError(err?.message || "No se pudo guardar el turno. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const titulo = esNuevo ? "Bandido nuevo" : <>{f.nombre} <span>({f.dueno || "sin dueño"})</span></>;
  const subtitulo = esNuevo ? "Completá los datos una sola vez: la próxima aparece en la lista." : [f.raza, mascota?.owner_phone].filter(Boolean).join(" · ");

  return (
    <Panel titulo={titulo} subtitulo={subtitulo} onClose={onClose} id="pl-turno">
      <form onSubmit={guardar} noValidate style={{ display: "grid", gap: 16 }}>
        {aviso && <p className="pl-tag note" style={{ margin: 0 }}>⚠ {aviso}</p>}
        {esNuevo && (
          <div className="pl-group"><span className="pl-label">Bandido</span>
            <div className="pl-grid">
              <label>Nombre<input value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} autoComplete="off" /></label>
              <label>Raza<input value={f.raza} onChange={(e) => set({ raza: e.target.value })} placeholder="caniche, mestizo…" autoComplete="off" data-autofocus /></label>
              <label>Dueño<input value={f.dueno} onChange={(e) => set({ dueno: e.target.value })} autoComplete="off" /></label>
              <label>Celular<input value={f.celular} onChange={(e) => set({ celular: e.target.value })} inputMode="tel" placeholder="opcional" autoComplete="off" /></label>
            </div>
          </div>
        )}
        <div className="pl-grid">
          <label>Hora<input type="time" step="300" value={f.hora} onChange={(e) => set({ hora: e.target.value.slice(0, 5) })} /></label>
        </div>
        <div className="pl-group"><span className="pl-label">1 · Servicio</span>
          {opcionesServicio.length ? <Opciones opciones={opcionesServicio} valor={f.servicio} onChange={elegirServicio} etiqueta="Servicio" />
            : <p className="pl-help">No hay servicios cargados. Cargalos en Catálogo › Tipos de servicio.</p>}
        </div>
        <div className="pl-grid">
          <label>Precio del servicio<input value={f.precio ? formatoPlata(f.precio) : ""} onChange={(e) => set({ precio: String(montoDe(e.target.value) || ""), precioTocado: true })} inputMode="numeric" placeholder="$ (opcional)" autoComplete="off" /></label>
        </div>
        <div className="pl-group"><span className="pl-label">2 · ¿Va con traslado?</span>
          <Opciones opciones={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]} valor={f.tras} onChange={(v) => set({ tras: v })} etiqueta="Traslado" />
          {editando && turno.traslado && f.tras === "si" && <p className="pl-help">Chofer, móvil y tramos se editan en Bandimóviles.</p>}
          {f.tras === "si" && (
            <div className="pl-grid">
              <label className="wide">Dirección<input value={f.direccion} onChange={(e) => set({ direccion: e.target.value })} placeholder="Calle, número, depto" autoComplete="off" /></label>
              <label>Precio del traslado<input value={f.trasSinCargo ? "Sin cargo" : f.trasMonto ? formatoPlata(f.trasMonto) : ""} disabled={f.trasSinCargo} onChange={(e) => set({ trasMonto: String(montoDe(e.target.value) || "") })} inputMode="numeric" placeholder="$" autoComplete="off" /></label>
              <div className="pl-opts">
                {MONTOS_TRASLADO.map((m) => <button key={m} type="button" className="pl-opt small" aria-pressed={!f.trasSinCargo && montoDe(f.trasMonto) === m} onClick={() => set({ trasMonto: String(m), trasSinCargo: false })}>{formatoPlata(m)}</button>)}
                <button type="button" className="pl-opt small" aria-pressed={f.trasSinCargo} onClick={() => set({ trasSinCargo: !f.trasSinCargo })}>Sin cargo</button>
              </div>
            </div>
          )}
        </div>
        <div className="pl-group"><span className="pl-label">3 · ¿Dejó seña?</span>
          <Opciones opciones={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]} valor={f.sena} onChange={(v) => set({ sena: v })} etiqueta="Seña" />
          {f.sena === "si" && (
            <div className="pl-grid">
              <label>Monto de la seña<input value={f.senaMonto ? formatoPlata(f.senaMonto) : ""} onChange={(e) => set({ senaMonto: String(montoDe(e.target.value) || "") })} inputMode="numeric" placeholder="$" autoComplete="off" /></label>
              <div className="pl-field">Medio<Opciones opciones={opcionesMedio} valor={f.senaMedio} onChange={(v) => set({ senaMedio: v })} etiqueta="Medio de la seña" className="small" /></div>
            </div>
          )}
        </div>
        <div className="pl-grid"><label className="wide">Nota (opcional)<input value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="a tijera, usar bozal, de dos…" autoComplete="off" /></label></div>
        <p className="pl-error" role="alert">{error}</p>
        <div className="pl-actions">
          <button type="button" className="pl-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="pl-btn big" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : `Guardar turno de las ${f.hora}`}</button>
        </div>
      </form>
    </Panel>
  );
}
