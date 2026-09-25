// Formulario único de alta y edición de mascotas.
// Lo usan "+ Nueva mascota", "Crear «texto»", "Editar" (vista rápida y ficha)
// y "Completar ahora". En desktop es un modal de 760 px; en mobile, pantalla
// completa.
import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import { PetAvatar } from "./PetBits";
import PhotoUpload from "../../../components/ui/PhotoUpload";
import { apiRequest } from "../../../services/apiClient";
import { showApiError } from "../../../utils/errorDialog";
import { todayISO } from "../../../utils/dates";
import { PET_SIZES, sizeLabel } from "../../../utils/pets";

const EMPTY = {
  name: "",
  owner_name: "",
  owner_phone: "",
  breed: "",
  size: "",
  neutered: false,
  birth_date: "",
  age: "",
  behavior: "",
  address: "",
  notes: "",
};

function toForm(pet, initialName) {
  if (!pet) return { ...EMPTY, name: initialName || "" };
  const form = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) {
    if (key === "neutered") form.neutered = Boolean(pet.neutered);
    else if (key === "birth_date") form.birth_date = pet.birth_date ? String(pet.birth_date).split("T")[0] : "";
    else form[key] = pet[key] ?? "";
  }
  return form;
}

function toPayload(form) {
  const text = (v) => {
    const t = String(v ?? "").trim();
    return t ? t : null;
  };
  return {
    name: form.name.trim(),
    owner_name: form.owner_name.trim(),
    owner_phone: text(form.owner_phone),
    breed: text(form.breed),
    size: text(form.size),
    neutered: Boolean(form.neutered),
    birth_date: form.birth_date || null,
    age: text(form.age),
    behavior: text(form.behavior),
    address: text(form.address),
    notes: text(form.notes),
  };
}

// open: boolean · pet: mascota a editar (null = alta) · initialName: nombre
// precargado en el alta · onSaved(pet): recibe la mascota guardada.
export default function PetForm({ open, pet, initialName = "", onClose, onSaved }) {
  const isEdit = Boolean(pet?.id);
  const [form, setForm] = useState(() => toForm(pet, initialName));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [stagedPhoto, setStagedPhoto] = useState(null);
  const [photoPet, setPhotoPet] = useState(pet);
  const nameRef = useRef(null);
  const ownerRef = useRef(null);

  // Cada vez que se abre, arranca desde la mascota (o vacío).
  useEffect(() => {
    if (!open) return;
    setForm(toForm(pet, initialName));
    setErrors({});
    setStagedPhoto(null);
    setPhotoPet(pet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  // Tamaños viejos que no están en la lista ("pequeño") se muestran como una
  // opción más, seleccionada, para no perderlos.
  const sizeOptions =
    form.size && !PET_SIZES.includes(form.size) ? [...PET_SIZES, form.size] : PET_SIZES;

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Ingresá el nombre de la mascota.";
    if (!form.owner_name.trim()) nextErrors.owner_name = "Ingresá el nombre del dueño.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      (nextErrors.name ? nameRef : ownerRef).current?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      let saved;
      if (isEdit) {
        saved = await apiRequest(`/v2/pets/${pet.id}`, { method: "PUT", body: payload });
      } else {
        saved = await apiRequest("/v2/pets", { method: "POST", body: payload });
        if (stagedPhoto && saved?.id) {
          try {
            saved = await apiRequest(`/v2/pets/${saved.id}/photo`, {
              method: "POST",
              body: { image: stagedPhoto },
            });
          } catch (err) {
            // La mascota ya quedó guardada: solo avisamos lo de la foto.
            showApiError(err, "La mascota se guardó, pero no se pudo subir la foto.");
          }
        }
      }
      onSaved?.(saved);
    } catch (err) {
      showApiError(err, "No se pudo guardar la mascota.");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="pv-btn pv-btn--ghost" onClick={onClose} disabled={saving}>
        Cancelar
      </button>
      <button type="submit" form="pv-pet-form" className="pv-btn pv-btn--brand" disabled={saving}>
        {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar mascota"}
      </button>
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEdit ? "Editar mascota" : "Nueva mascota"}
      width={760}
      fullscreenOnMobile
      footer={footer}
    >
      <form id="pv-pet-form" className="pv-form" onSubmit={handleSubmit} noValidate>
        <div className="pv-form__photo">
          <PhotoUpload
            photoUrl={photoPet?.photo_url || null}
            uploadPath={isEdit ? `/v2/pets/${pet.id}/photo` : undefined}
            onUploaded={(updated) => {
              setPhotoPet((prev) => ({ ...prev, ...updated }));
              onSaved?.(updated, { keepOpen: true });
            }}
            onFileStaged={setStagedPhoto}
            size={64}
            label={photoPet?.photo_url || stagedPhoto ? "Cambiar foto" : "Subir foto"}
            className="pv-photo-upload"
            fallback={<PetAvatar pet={{ name: form.name }} size={64} />}
          />
          <p className="pv-hint">JPG, PNG o WEBP · máx. 4 MB</p>
        </div>

        <fieldset className="pv-form__section">
          <legend>Lo básico</legend>
          <div className="pv-form__grid">
            <Field label="Nombre" required error={errors.name}>
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={Boolean(errors.name)}
                autoComplete="off"
              />
            </Field>
            <Field label="Dueño" required error={errors.owner_name}>
              <input
                ref={ownerRef}
                type="text"
                value={form.owner_name}
                onChange={(e) => set("owner_name", e.target.value)}
                aria-invalid={Boolean(errors.owner_name)}
                autoComplete="off"
              />
            </Field>
            <Field label="Celular">
              <input
                type="tel"
                inputMode="tel"
                value={form.owner_phone}
                onChange={(e) => set("owner_phone", e.target.value)}
                placeholder="Ej: 381 555 1234"
              />
            </Field>
            <Field label="Raza">
              <input type="text" value={form.breed} onChange={(e) => set("breed", e.target.value)} />
            </Field>
            <div className="pv-field pv-field--full">
              <span className="pv-field__label" id="pv-size-label">Tamaño</span>
              <div className="pv-choice" role="radiogroup" aria-labelledby="pv-size-label">
                {sizeOptions.map((option) => {
                  const active = form.size === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`pv-choice__item${active ? " is-active" : ""}`}
                      onClick={() => set("size", active ? "" : option)}
                    >
                      {sizeLabel(option)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="pv-form__section">
          <legend>Salud y comportamiento</legend>
          <div className="pv-form__grid">
            <div className="pv-field">
              <span className="pv-field__label" id="pv-neutered-label">Castrado</span>
              <div className="pv-segmented" role="radiogroup" aria-labelledby="pv-neutered-label">
                {[
                  { value: false, label: "No" },
                  { value: true, label: "Sí" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={form.neutered === option.value}
                    className={`pv-segmented__item${form.neutered === option.value ? " is-active" : ""}`}
                    onClick={() => set("neutered", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pv-form__age">
              <Field label="Fecha de nacimiento">
                <input
                  type="date"
                  value={form.birth_date}
                  max={todayISO()}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
              </Field>
              <Field label="o edad aproximada">
                <input
                  type="text"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="Ej: 3 años"
                />
              </Field>
              <p className="pv-hint pv-field--full">
                Si no sabés la fecha, dejala vacía y cargá la edad. Con fecha, la edad se calcula sola.
              </p>
            </div>
            <Field label="Comportamiento" full>
              <input
                type="text"
                value={form.behavior}
                onChange={(e) => set("behavior", e.target.value)}
                placeholder="Ej: Nervioso con el secador"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="pv-form__section">
          <legend>Otros datos</legend>
          <div className="pv-form__grid">
            <Field label="Dirección" hint="para traslados" full>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Ej: Av. Mate de Luna 1234"
              />
            </Field>
            <Field label="Observaciones" full>
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}

function Field({ label, required, hint, error, full, children }) {
  return (
    <label className={`pv-field${full ? " pv-field--full" : ""}${error ? " has-error" : ""}`}>
      <span className="pv-field__label">
        {label}
        {required && <span className="pv-field__req"> *</span>}
        {hint && <span className="pv-field__hint"> · {hint}</span>}
      </span>
      {children}
      {error && <span className="pv-field__error">{error}</span>}
    </label>
  );
}
