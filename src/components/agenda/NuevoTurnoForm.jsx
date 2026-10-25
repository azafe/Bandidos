import { useEffect, useRef, useState } from "react";
import TramosCompactFields from "../traslados/TramosCompactFields";
import TrasladoFields from "./TrasladoFields";
import "../../styles/nuevo-turno.css";

const durations = { 15: "15 min", 30: "30 min", 45: "45 min", 60: "1 h", 90: "1 h 30", 120: "2 h", 150: "2 h 30" };
const dateLabel = (value) => value?.split("-").reverse().join("/") || "Sin fecha";

export default function NuevoTurnoForm({ form, onPatch, pets, petsLoading, petsError, onRetryPets, onPetSelect, isNewPet, onNewPet, fieldErrors, error, onValidate, onSave, onCancel, saving, tramos, onTramosChange, duration, timeHandlers, endTime, serviceTypes, paymentMethods }) {
  const [step, setStep] = useState(0);
  const [transferStarted, setTransferStarted] = useState(false);
  const [openPets, setOpenPets] = useState(false);
  const [activePet, setActivePet] = useState(0);
  const [otherDuration, setOtherDuration] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [returnFocus] = useState(() => document.activeElement);
  const root = useRef(null);
  const search = form.pet_id ? "" : form.pet_name.toLocaleLowerCase("es");
  const matches = pets.filter((p) => `${p.name} ${p.owner_name || ""}`.toLocaleLowerCase("es").includes(search)).slice(0, 10);
  const selected = pets.find((p) => String(p.id) === String(form.pet_id));
  const moreDuration = otherDuration || duration.mode === "custom" || ![30, 60, 90].includes(Number(form.duration));

  useEffect(() => {
    root.current?.querySelector(".nuevo-turno-scroll")?.scrollTo({ top: 0 });
    root.current?.querySelector(`#nuevo-step-${step}-title`)?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    const modal = root.current?.closest(".modal-card");
    function trap(event) {
      if (event.key !== "Tab") return;
      const controls = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter((e) => e.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement?.tabIndex === -1)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    modal?.addEventListener("keydown", trap);
    return () => { modal?.removeEventListener("keydown", trap); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); };
  }, [returnFocus]);

  function pickPet(id) { onPetSelect(id); setOpenPets(false); }
  function submit(event) {
    event.preventDefault();
    if (saving) return;
    if (!onValidate()) {
      setStep(0);
      if (Number(form.deposit_amount) < 0) setExtrasOpen(true);
      return;
    }
    if (step === 0 && form.traslado) { setTransferStarted(true); setStep(1); return; }
    if (!event.currentTarget.reportValidity()) return;
    onSave();
  }
  function petKey(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setOpenPets(true);
      setActivePet((i) => openPets ? Math.max(0, Math.min(matches.length - 1, i + (event.key === "ArrowDown" ? 1 : -1))) : 0);
    } else if (event.key === "Enter" && openPets && matches[activePet]) {
      event.preventDefault(); pickPet(matches[activePet].id);
    } else if (event.key === "Escape" && openPets) { event.stopPropagation(); setOpenPets(false); }
  }
  const fieldError = (name) => fieldErrors[name] && <small id={`nuevo-error-${name}`} className="nuevo-turno-field-error">{fieldErrors[name]}</small>;
  return <form ref={root} className="nuevo-turno-form" onSubmit={submit} noValidate aria-label="Nuevo turno">
    <fieldset className="nuevo-turno-fields" disabled={saving}>
      <legend className="nuevo-turno-sr-only">Crear turno</legend>
      <div className="nuevo-turno-progress" aria-label="Progreso del nuevo turno"><ol><li aria-current={step === 0 ? "step" : undefined}><span>{step === 1 ? "✓" : "1"}</span>Turno</li>{form.traslado && <><li className="nuevo-turno-progress__line" aria-hidden="true" /><li aria-current={step === 1 ? "step" : undefined}><span>2</span>Traslado</li></>}</ol><span>Paso {step + 1} de {form.traslado ? 2 : 1}</span></div>
      <div className="nuevo-turno-scroll">
        {error && <div role="alert" className="nuevo-turno-error">{error}</div>}
        <div className="nuevo-turno-step" hidden={step !== 0}><h2 id="nuevo-step-0-title" className="nuevo-turno-sr-only" tabIndex={-1}>Datos del turno</h2>
          <section className="nuevo-turno-section" aria-label="Mascota"><h3>Mascota</h3>
            {isNewPet ? <>
              <button className="nuevo-turno-link" type="button" onClick={() => onNewPet(false)}>← Buscar una mascota registrada</button>
              <div className="nuevo-turno-row"><label className="form-field"><span>Nombre de la mascota *</span><input id="agenda-pet" required value={form.pet_name} onChange={(e) => onPatch({ pet_name: e.target.value })} aria-invalid={!!fieldErrors.pet_name} aria-describedby={fieldErrors.pet_name ? "nuevo-error-pet_name" : undefined} />{fieldError("pet_name")}</label><label className="form-field"><span>Nombre del dueño *</span><input id="agenda-owner" required value={form.owner_name} onChange={(e) => onPatch({ owner_name: e.target.value })} aria-invalid={!!fieldErrors.owner_name} aria-describedby={fieldErrors.owner_name ? "nuevo-error-owner_name" : undefined} />{fieldError("owner_name")}</label></div>
              <div className="nuevo-turno-row"><label className="form-field"><span>Raza (opcional)</span><input value={form.breed} onChange={(e) => onPatch({ breed: e.target.value })} /></label><label className="form-field"><span>Celular (opcional)</span><input type="tel" value={form.owner_phone || ""} onChange={(e) => onPatch({ owner_phone: e.target.value })} /></label></div>
            </> : <>
              <div className={`nuevo-turno-pet${selected ? " nuevo-turno-pet--selected" : ""}`}>
                <span className="nuevo-turno-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
                <div><label htmlFor="agenda-pet" className="nuevo-turno-sr-only">Buscar mascota</label><input id="agenda-pet" role="combobox" aria-autocomplete="list" aria-expanded={openPets} aria-controls="nuevo-pet-results" aria-activedescendant={openPets && matches[activePet] ? `nuevo-pet-${matches[activePet].id}` : undefined} autoComplete="off" value={form.pet_name} placeholder="Buscá por mascota o dueño…" required aria-invalid={!!fieldErrors.pet_name} aria-describedby={fieldErrors.pet_name ? "nuevo-error-pet_name" : undefined} onFocus={() => { setOpenPets(true); setActivePet(0); }} onBlur={() => setOpenPets(false)} onKeyDown={petKey} onChange={(e) => { onPatch({ pet_id: "", pet_name: e.target.value, breed: "", owner_name: "" }); setOpenPets(true); setActivePet(0); }} />{selected && <span>{[selected.owner_name, selected.breed].filter(Boolean).join(" · ")}</span>}</div>
                {openPets && <ul id="nuevo-pet-results" className="nuevo-turno-pet-results" role="listbox" aria-label="Mascotas encontradas">{matches.map((pet, i) => <li key={pet.id} id={`nuevo-pet-${pet.id}`} role="option" aria-selected={i === activePet} onMouseDown={(e) => e.preventDefault()} onClick={() => pickPet(pet.id)}><strong>{pet.name}</strong><span>{[pet.owner_name, pet.breed].filter(Boolean).join(" · ")}</span></li>)}{!matches.length && <li role="presentation">{petsLoading ? "Buscando mascotas…" : "Sin resultados. Podés registrar una mascota abajo."}</li>}</ul>}
              </div>
              {fieldError("pet_name")}
              {petsError && <p className="nuevo-turno-error" role="alert">No se pudieron cargar las mascotas. <button className="nuevo-turno-link" type="button" onClick={onRetryPets}>Reintentar</button></p>}
              <button className="nuevo-turno-link" type="button" onClick={() => { setOpenPets(false); onNewPet(true); }}>+ Registrar una mascota</button>
            </>}
          </section>
          <section className="nuevo-turno-section" aria-label="Fecha y duración"><h3>Cuándo</h3>
            <div className="nuevo-turno-row"><label className="form-field"><span>Fecha</span><div className="date-field__control"><input className="date-field__display" value={dateLabel(form.date)} readOnly tabIndex={-1} aria-hidden="true" /><input className="date-field__native" id="agenda-date" type="date" required value={form.date} onChange={(e) => onPatch({ date: e.target.value })} aria-invalid={!!fieldErrors.date} aria-describedby={fieldErrors.date ? "nuevo-error-date" : undefined} /></div>{fieldError("date")}</label><label className="form-field"><span>Hora</span><input id="agenda-time" type="text" inputMode="numeric" placeholder="HH:MM" required value={form.time} onChange={timeHandlers.onChange} onBlur={timeHandlers.onBlur} aria-invalid={!!fieldErrors.time} aria-describedby={fieldErrors.time ? "nuevo-error-time" : undefined} />{fieldError("time")}</label></div>
            <div className="nuevo-turno-field"><label className="nuevo-turno-label" id="nuevo-duration-label">Duración</label><div id="agenda-duration" tabIndex={-1} className="nuevo-turno-segmentos" role="group" aria-labelledby="nuevo-duration-label">{[30,60,90].map((v) => <button key={v} type="button" aria-pressed={duration.mode === "preset" && Number(form.duration) === v} onClick={() => { setOtherDuration(false); duration.onPreset(v); }}>{durations[v]}</button>)}<button type="button" aria-pressed={moreDuration} onClick={() => setOtherDuration(!moreDuration)}>Otra</button></div>
              {moreDuration && <div className="nuevo-turno-otra"><label className="form-field"><span>Otra duración</span><select aria-label="Otra duración" value={duration.mode === "custom" ? "other" : form.duration} onChange={duration.onSelect}>{Object.entries(durations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="other">Personalizada…</option></select></label>{duration.mode === "custom" && <label className="form-field"><span>Duración personalizada (HH:MM)</span><input id="agenda-duration-custom" inputMode="numeric" placeholder="Ej. 3:00" value={duration.customValue} onChange={duration.onCustomChange} onBlur={duration.onCustomBlur} aria-invalid={!!fieldErrors.duration} /><small className="nuevo-turno-helper">Mayor a 1 hora, en intervalos de 15 minutos.</small></label>}</div>}
              {fieldError("duration")}{endTime && <p className="nuevo-turno-helper">Finaliza a las {endTime}</p>}
            </div>
          </section>
          <div className="nuevo-turno-transfer"><label className="nuevo-turno-check nuevo-turno-check--main"><input type="checkbox" checked={form.traslado} onChange={(e) => onPatch({ traslado: e.target.checked })} /><span>Agregar traslado</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 10 2-5h10l2 5M4 10h16v8H4zM7 18v2m10-2v2M7 14h1m8 0h1" /></svg></label><p className="nuevo-turno-helper">Búsqueda, entrega o ida y vuelta.</p></div>
          {form.traslado && <p className="nuevo-turno-info">En el siguiente paso completás el traslado.</p>}
          <details className="nuevo-turno-disclosure nuevo-turno-extras" open={extrasOpen} onToggle={(e) => setExtrasOpen(e.currentTarget.open)}><summary><span><strong>Servicio, seña y notas</strong><small>Opcional · podés completarlos después</small></span><span className="nuevo-turno-chevron" aria-hidden="true">⌄</span></summary><div className="nuevo-turno-disclosure__body">
            <label className="form-field"><span>Servicio</span><select aria-label="Servicio" value={form.service_type_id} onChange={(e) => { const st = serviceTypes.find((s) => String(s.id) === e.target.value); onPatch({ service_type_id: e.target.value, base_price: st?.default_price ?? "", final_price: st?.default_price ? String(st.default_price) : "" }); }}><option value="">Sin especificar</option>{serviceTypes.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
            <label className="form-field"><span>Seña / anticipo ($)</span><input id="agenda-deposit" type="number" min="0" step="0.01" inputMode="decimal" value={form.deposit_amount} onChange={(e) => onPatch({ deposit_amount: e.target.value })} aria-invalid={!!fieldErrors.deposit_amount} />{fieldError("deposit_amount")}</label>
            {Number(form.deposit_amount) > 0 && <label className="form-field"><span>Medio de pago de la seña</span><select aria-label="Medio de pago de la seña" value={form.deposit_payment_method_id || ""} onChange={(e) => onPatch({ deposit_payment_method_id: e.target.value })}><option value="">Sin especificar</option>{paymentMethods.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label>}
            <label className="form-field"><span>Notas del turno</span><textarea rows={2} value={form.notes} onChange={(e) => onPatch({ notes: e.target.value })} /></label>
          </div></details>
        </div>
        {transferStarted && <fieldset className="nuevo-turno-step nuevo-turno-step-transfer" hidden={step !== 1} disabled={step !== 1 || saving}><legend className="nuevo-turno-sr-only">Paso de traslado</legend><h2 id="nuevo-step-1-title" className="nuevo-turno-sr-only" tabIndex={-1}>Datos del traslado</h2><div className="nuevo-turno-summary"><span aria-hidden="true">✓</span><strong>{form.pet_name}</strong><span>· {dateLabel(form.date).slice(0, 5)}, {form.time}</span></div><TramosCompactFields value={tramos} onChange={onTramosChange} fecha={form.date} disabled={saving} /><TrasladoFields id="nuevo-traslado" value={form} onChange={onPatch} /></fieldset>}
      </div>
      <div className="nuevo-turno-footer">{step === 0 ? <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button> : <button type="button" className="btn-secondary" onClick={() => setStep(0)}>← Volver</button>}<button className="btn-primary" type="submit">{saving ? "Guardando…" : step === 0 && form.traslado ? "Continuar →" : "Guardar turno"}</button></div>
    </fieldset>
  </form>;
}
