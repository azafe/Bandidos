// Archivar / restaurar / eliminar una mascota, con sus diálogos.
// Devuelve las acciones y el JSX de los diálogos para montar en la página.
import { useCallback, useState } from "react";
import Sheet from "./Sheet";
import { apiRequest } from "../../../services/apiClient";
import { showApiError } from "../../../utils/errorDialog";
import { displayName, getPetStats } from "../../../utils/pets";

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// onChanged(pet, action): action es "archived" | "restored" | "deleted".
// notify(message): muestra un toast.
export function usePetActions({ onChanged, notify }) {
  const [dialog, setDialog] = useState(null); // { type, pet }
  const [busy, setBusy] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const close = useCallback(() => {
    if (busy) return;
    setDialog(null);
    setConfirmName("");
  }, [busy]);

  const archive = useCallback((pet) => setDialog({ type: "archive", pet }), []);

  const requestDelete = useCallback((pet) => {
    // Con turnos no se llama al endpoint: se ofrece archivar.
    const turnos = getPetStats(pet).turnosTotal;
    setConfirmName("");
    setDialog({ type: turnos > 0 ? "blocked" : "delete", pet });
  }, []);

  const restore = useCallback(
    async (pet) => {
      try {
        const updated = await apiRequest(`/v2/pets/${pet.id}/unarchive`, { method: "POST" });
        notify?.(`${displayName(pet.name)} volvió a las activas`);
        onChanged?.({ ...pet, ...updated }, "restored");
      } catch (err) {
        showApiError(err, "No se pudo restaurar la mascota.");
      }
    },
    [notify, onChanged]
  );

  async function confirmArchive() {
    const { pet } = dialog;
    setBusy(true);
    try {
      const updated = await apiRequest(`/v2/pets/${pet.id}/archive`, { method: "POST" });
      notify?.(`${displayName(pet.name)} quedó archivada`);
      setDialog(null);
      onChanged?.({ ...pet, ...updated }, "archived");
    } catch (err) {
      showApiError(err, "No se pudo archivar la mascota.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const { pet } = dialog;
    setBusy(true);
    try {
      await apiRequest(`/v2/pets/${pet.id}`, { method: "DELETE" });
      notify?.(`${displayName(pet.name)} se eliminó`);
      setDialog(null);
      onChanged?.(pet, "deleted");
    } catch (err) {
      // El backend también protege: si tiene turnos responde 409.
      if (err?.status === 409) setDialog({ type: "blocked", pet });
      else showApiError(err, "No se pudo eliminar la mascota.");
    } finally {
      setBusy(false);
    }
  }

  let dialogs = null;
  if (dialog) {
    const { pet, type } = dialog;
    const name = displayName(pet.name);
    const turnos = getPetStats(pet).turnosTotal;

    if (type === "archive") {
      dialogs = (
        <Sheet
          open
          onClose={close}
          title={`¿Archivar a ${name}?`}
          width={460}
          footer={
            <>
              <button type="button" className="pv-btn pv-btn--ghost" onClick={close} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="pv-btn pv-btn--dark" onClick={confirmArchive} disabled={busy}>
                {busy ? "Archivando…" : "Archivar"}
              </button>
            </>
          }
        >
          <p className="pv-dialog-text">
            Deja de aparecer en listas y búsquedas. Su ficha
            {turnos > 0 ? ` y sus ${plural(turnos, "turno", "turnos")}` : ""} se conservan y podés
            restaurarla cuando quieras.
          </p>
        </Sheet>
      );
    } else if (type === "blocked") {
      dialogs = (
        <Sheet
          open
          onClose={close}
          title="No se puede eliminar"
          width={460}
          footer={
            <>
              <button type="button" className="pv-btn pv-btn--ghost" onClick={close}>
                Cerrar
              </button>
              {!pet.archived_at && (
                <button type="button" className="pv-btn pv-btn--dark" onClick={() => setDialog({ type: "archive", pet })}>
                  Archivar en su lugar
                </button>
              )}
            </>
          }
        >
          <p className="pv-dialog-text">
            {name} tiene {plural(turnos, "turno registrado", "turnos registrados")}. Si la eliminás se pierde
            su historial y la facturación de esos turnos.{" "}
            {pet.archived_at
              ? "Ya está archivada: no aparece en listas ni búsquedas."
              : "Archivala para sacarla de las listas sin perder nada."}
          </p>
        </Sheet>
      );
    } else if (type === "delete") {
      const matches = confirmName.trim().toLowerCase() === name.trim().toLowerCase();
      dialogs = (
        <Sheet
          open
          onClose={close}
          title={`¿Eliminar a ${name}?`}
          width={460}
          footer={
            <>
              <button type="button" className="pv-btn pv-btn--ghost" onClick={close} disabled={busy}>
                Cancelar
              </button>
              <button
                type="button"
                className="pv-btn pv-btn--danger"
                onClick={confirmDelete}
                disabled={!matches || busy}
              >
                {busy ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </>
          }
        >
          <p className="pv-dialog-text">
            Se borra la ficha para siempre. No tiene turnos registrados, así que no se pierde historial.
          </p>
          <label className="pv-field pv-field--full" style={{ marginTop: 14 }}>
            <span className="pv-field__label">
              Escribí <strong>{name}</strong> para confirmar
            </span>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
        </Sheet>
      );
    }
  }

  return { archive, restore, requestDelete, dialogs };
}
