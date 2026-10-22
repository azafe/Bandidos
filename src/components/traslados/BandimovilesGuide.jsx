import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import { NUEVO_TRASLADO } from "../../lib/bandimovilesInicio";

function PrepararMovil({ onNext, onBusy }) {
  const { items, loading, error, refresh, createItem } = useApiResource("/v2/vehiculos");
  const [nombre, setNombre] = useState("");
  const [patente, setPatente] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const activos = items.filter((v) => v.activo);
  async function save(event) {
    event.preventDefault();
    setSaving(true); onBusy(true); setSaveError("");
    try {
      await createItem({ nombre: nombre.trim(), patente: patente.trim(), activo: true });
      onNext();
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); onBusy(false); }
  }
  const form = <form onSubmit={save}>
    <fieldset disabled={saving || loading || !!error}>
      <div className="bandi-guide__fields">
        <label className="form-field"><span>Nombre del móvil</span><input required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Móvil 1" /></label>
        <label className="form-field"><span>Patente</span><input required maxLength={20} value={patente} onChange={(e) => setPatente(e.target.value)} placeholder="Ej. AB 123 CD" /></label>
      </div>
      <button className="btn-primary" type="submit" disabled={!nombre.trim() || !patente.trim()}>{saving ? "Guardando…" : "Guardar móvil y continuar"}</button>
    </fieldset>
  </form>;
  return <>
    <p>Registrá el vehículo que hace las búsquedas y entregas. Solo necesitás un nombre y la patente.</p>
    {loading && <p role="status">Buscando tus móviles…</p>}
    {error && <p role="alert">{error} <button type="button" className="btn-secondary" onClick={refresh}>Reintentar</button></p>}
    {saveError && <p role="alert" className="traslados-error">{saveError}</p>}
    {!loading && !error && (activos.length ? <>
      <p className="bandi-guide__ready">Ya tenés {activos.map((v) => v.nombre).join(", ")}.</p>
      <button className="btn-primary" type="button" disabled={saving} onClick={onNext}>Usar mis móviles y continuar</button>
      <details><summary>Agregar otro móvil</summary>{form}</details>
    </> : form)}
  </>;
}

function PrepararChofer({ onNext, onBusy }) {
  const { items, loading, error, refresh, createItem, updateItem } = useApiResource("/v2/employees");
  const [modo, setModo] = useState("equipo");
  const [selected, setSelected] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const activos = items.filter((e) => e.status === "active");
  const choferes = activos.filter((e) => e.is_driver);
  const otros = activos.filter((e) => !e.is_driver);
  const nuevo = modo === "nuevo" || !otros.length;
  async function save(event) {
    event.preventDefault();
    setSaving(true); onBusy(true); setSaveError("");
    try {
      if (nuevo) await createItem({ name: nombre.trim(), role: "Chofer", status: "active", is_driver: true });
      else await updateItem(selected, { is_driver: true });
      onNext();
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); onBusy(false); }
  }
  const form = <form onSubmit={save}>
    <fieldset disabled={saving || loading || !!error}>
      {otros.length > 0 && <label className="form-field"><span>¿Quién va a manejar?</span><select value={modo} onChange={(e) => setModo(e.target.value)}><option value="equipo">Alguien de mi equipo</option><option value="nuevo">Una persona nueva</option></select></label>}
      {nuevo ? <label className="form-field"><span>Nombre del chofer</span><input required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez" /></label>
        : <label className="form-field"><span>Integrante del equipo</span><select required value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Elegí una persona</option>{otros.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}
      <p className="bandi-caption">{nuevo ? "Se agrega a tu equipo como chofer." : "Se habilita como chofer y conserva su rol actual."} El acceso para que use la app se puede dar después, desde Usuarios.</p>
      <button className="btn-primary" type="submit" disabled={nuevo ? !nombre.trim() : !selected}>{saving ? "Guardando…" : "Guardar chofer y continuar"}</button>
    </fieldset>
  </form>;
  return <>
    <p>Elegí quién maneja. Puede ser alguien de tu equipo o una persona nueva.</p>
    {loading && <p role="status">Buscando tus choferes…</p>}
    {error && <p role="alert">{error} <button type="button" className="btn-secondary" onClick={refresh}>Reintentar</button></p>}
    {saveError && <p role="alert" className="traslados-error">{saveError}</p>}
    {!loading && !error && (choferes.length ? <>
      <p className="bandi-guide__ready">Ya tenés {choferes.map((e) => e.name).join(", ")}.</p>
      <button className="btn-primary" type="button" disabled={saving} onClick={onNext}>Usar mis choferes y continuar</button>
      <details><summary>Agregar otro chofer</summary>{form}</details>
    </> : form)}
  </>;
}

const pasos = ["Agregá tu móvil", "Elegí el chofer", "Agendá un traslado", "Seguí el recorrido y el cobro"];

export default function BandimovilesGuide({ guia, onChange, admin }) {
  const [busy, setBusy] = useState(false);
  const title = useRef(null);
  const previous = useRef(guia.paso);
  useEffect(() => {
    if (previous.current !== guia.paso) title.current?.focus();
    previous.current = guia.paso;
  }, [guia.paso]);
  const next = () => onChange({ paso: Math.min(guia.paso + 1, 3), estado: "activa" });
  const finish = () => onChange({ paso: 3, estado: "terminada" });
  return <section className="bandi-guide" aria-label="Guía de primeros pasos">
    <div className="bandi-guide__top"><span className="bandi-eyebrow">Tu primer Bandimóvil</span><button type="button" className="bandi-text-button" disabled={busy} onClick={() => onChange({ ...guia, estado: "pausada" })}>Seguir después</button></div>
    <p className="bandi-caption">Paso {guia.paso + 1} de 4 · Avanzá a tu ritmo. Podés salir y retomar desde acá.</p>
    <ol className="bandi-guide__progress" aria-label="Pasos de la guía">{pasos.map((label, i) => <li key={label} aria-current={i === guia.paso ? "step" : undefined}><span>{i + 1}</span><span>{label}</span></li>)}</ol>
    <div className="bandi-guide__body" key={guia.paso}>
      <h2 ref={title} tabIndex={-1}>{pasos[guia.paso]}</h2>
      {guia.paso < 2 && !admin ? <>
        <p>El administrador carga los móviles y habilita a los choferes. Si ya están cargados, podés empezar desde Agenda y elegirlos en el traslado.</p>
        <button className="btn-primary" type="button" onClick={next}>Continuar</button>
      </> : guia.paso === 0 ? <PrepararMovil onNext={next} onBusy={setBusy} />
        : guia.paso === 1 ? <PrepararChofer onNext={next} onBusy={setBusy} />
        : guia.paso === 2 ? <>
          <p>El traslado se guarda junto al turno de la mascota en Agenda.</p>
          <ol className="bandi-guide__instructions"><li>Elegí la mascota, el día y el servicio.</li><li>En Traslado, completá la dirección y elegí búsqueda, entrega o ambas. Asigná el chofer y el móvil.</li><li>Cargá un único precio para el viaje y guardá el turno. Si todavía no lo sabés, podés completarlo al finalizar.</li></ol>
          <p className="bandi-caption">El botón abre un turno con Traslado activado. Se guarda cuando confirmás el formulario.</p>
          <Link className="btn-primary" to={NUEVO_TRASLADO} onClick={next}>Crear turno con traslado</Link>
          <button className="bandi-text-button" type="button" onClick={next}>Ya tengo un turno, continuar</button>
        </> : <>
          <p>Con el turno guardado, estas son las dos acciones del día:</p>
          <ol className="bandi-guide__instructions"><li><strong>Seguir el viaje.</strong> En Recorrido del día, abrí Maps, avisá por WhatsApp y marcá cada búsqueda o entrega.</li><li><strong>Registrar el pago.</strong> Abrí el turno en Agenda y, en Traslado, tocá Registrar cobro. Elegí quién recibió el dinero y el medio de pago.</li></ol>
          <p className="bandi-guide__note">Finalizar la peluquería no registra el cobro del traslado. Ese pago se confirma por separado.</p>
          <p className="bandi-caption">Después podés revisar las cuentas con choferes y socios en Rendiciones, y la ganancia del mes en Resultados. Las zonas y condiciones de pago están en Configuración.</p>
          <div className="bandi-actions"><Link className="btn-primary" to="/traslados/dia" onClick={finish}>Ver recorrido del día</Link><button className="btn-secondary" type="button" onClick={finish}>Terminar guía</button></div>
        </>}
    </div>
    {guia.paso > 0 && <button className="bandi-text-button" type="button" disabled={busy} onClick={() => onChange({ paso: guia.paso - 1, estado: "activa" })}>← Paso anterior</button>}
  </section>;
}
