// Vista rápida de una mascota (solo lectura). Panel lateral en desktop,
// bottom sheet en mobile.
import { useState } from "react";
import { Link } from "react-router-dom";
import Sheet from "./Sheet";
import { Icon, PetAvatar } from "./PetBits";
import {
  birthdayLabel,
  displayName,
  displayText,
  formatShortDate,
  getPetStats,
  petSummaryLine,
  whatsappUrl,
} from "../../../utils/pets";

export default function PetQuickView({ pet, onClose, onEdit, onArchive, onRestore, onSchedule, fichaState }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  if (!pet) return null;
  const stats = getPetStats(pet);
  const waUrl = whatsappUrl(pet.owner_phone);
  const archived = Boolean(pet.archived_at);

  const rows = [
    { label: "Dueño", value: displayName(pet.owner_name) },
    { label: "Celular", value: pet.owner_phone },
    { label: "Dirección", value: displayText(pet.address) },
    { label: "Cumpleaños", value: birthdayLabel(pet.birth_date) },
  ].filter((r) => r.value);

  const footer = (
    <>
      <button
        type="button"
        className="pv-btn pv-btn--text"
        onClick={() => (archived ? onRestore(pet) : onArchive(pet))}
      >
        {archived ? "Restaurar" : "Archivar"}
      </button>
      <span className="pv-spacer" />
      <button type="button" className="pv-btn pv-btn--ghost" onClick={() => onEdit(pet)}>
        Editar
      </button>
      <Link to={`/pets/${pet.id}`} state={fichaState} className="pv-btn pv-btn--dark" onClick={onClose}>
        Ver ficha completa →
      </Link>
    </>
  );

  return (
    <>
      <Sheet open onClose={onClose} title={displayName(pet.name)} hideTitle variant="drawer" width={440} footer={footer}>
        <div className="pv-quick">
          <div className="pv-quick__head">
            <PetAvatar pet={pet} size={64} onClick={pet.photo_url ? () => setPhotoOpen(true) : undefined} />
            <div className="pv-quick__id">
              <h3 className="pv-quick__name">{displayName(pet.name)}</h3>
              <p className="pv-muted">{petSummaryLine(pet)}</p>
              {archived && <span className="pv-pill pv-pill--dark">Archivada</span>}
            </div>
          </div>

          <div className="pv-quick__actions">
            {waUrl ? (
              <a className="pv-btn pv-btn--wa" href={waUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" /> WhatsApp
              </a>
            ) : (
              <span className="pv-btn pv-btn--wa is-disabled" aria-disabled="true" title="Sin celular cargado">
                <Icon name="whatsapp" /> WhatsApp
              </span>
            )}
            <button
              type="button"
              className="pv-btn pv-btn--brand"
              onClick={() => onSchedule(pet)}
              disabled={archived}
              title={archived ? "Restaurala para agendarle un turno" : undefined}
            >
              <Icon name="calendar" /> Agendar turno
            </button>
          </div>

          {pet.behavior && (
            <div className="pv-callout pv-callout--warn">
              <span className="pv-callout__label">Comportamiento</span>
              <p>{displayText(pet.behavior)}</p>
            </div>
          )}

          {rows.length > 0 && (
            <dl className="pv-rows">
              {rows.map((row) => (
                <div key={row.label} className="pv-rows__row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="pv-mini-metrics">
            <div className="pv-mini-metric">
              <span>Servicios</span>
              <strong>{stats.servicios}</strong>
            </div>
            <div className="pv-mini-metric">
              <span>Última visita</span>
              <strong>{stats.ultimaVisita ? formatShortDate(stats.ultimaVisita) : "Sin visitas"}</strong>
            </div>
            <div className="pv-mini-metric pv-mini-metric--info">
              <span>Próximo</span>
              <strong>{stats.proximoTurno ? formatShortDate(stats.proximoTurno) : "Sin turno"}</strong>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet open={photoOpen} onClose={() => setPhotoOpen(false)} title={`Foto de ${displayName(pet.name)}`} width={640}>
        {pet.photo_url && <img src={pet.photo_url} alt="" className="pv-photo-full" />}
      </Sheet>
    </>
  );
}
