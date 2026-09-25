// src/pages/pets/PetsPage.jsx
// Lista de mascotas: búsqueda, activas/archivadas, orden, fichas incompletas,
// grilla de tarjetas, vista rápida y formulario único de alta/edición.
// Los filtros viven en la URL, así "← Mascotas" desde la ficha vuelve igual.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import PetForm from "./components/PetForm";
import PetQuickView from "./components/PetQuickView";
import { Icon, Pill, PetAvatar, Toast } from "./components/PetBits";
import { usePetActions } from "./components/usePetActions";
import {
  displayName,
  displayText,
  formatShortDate,
  getPetStats,
  isIncomplete,
  matchesPetSearch,
  petAgeLabel,
  petColor,
  PETS_LIST_SEARCH_KEY,
  sizeLabel,
} from "../../utils/pets";
import "../../styles/pets.css";

const PAGE_SIZE = 24;
const ALL_PETS = { archived: "all" };

const SORTS = [
  { value: "fieles", label: "Más fieles" },
  { value: "recientes", label: "Más recientes" },
  { value: "az", label: "A–Z" },
];

function byCreatedDesc(a, b) {
  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

const SORTERS = {
  fieles: (a, b) => getPetStats(b).servicios - getPetStats(a).servicios || byCreatedDesc(a, b),
  recientes: byCreatedDesc,
  az: (a, b) => displayName(a.name).localeCompare(displayName(b.name), "es", { sensitivity: "base" }),
};

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  return [...pages]
    .sort((a, b) => a - b)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
}

export default function PetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const view = searchParams.get("vista") === "archivadas" ? "archived" : "active";
  const sort = SORTS.some((s) => s.value === searchParams.get("orden")) ? searchParams.get("orden") : "fieles";
  const onlyIncomplete = searchParams.get("incompletas") === "1";
  const requestedPage = Math.max(1, Number(searchParams.get("pagina")) || 1);

  const { items: pets, loading, error, refresh } = useApiResource("/v2/pets", ALL_PETS);
  const [selectedId, setSelectedId] = useState(null);
  const [formState, setFormState] = useState({ open: false, pet: null, initialName: "" });
  const [toast, setToast] = useState("");
  const searchRef = useRef(null);
  const clearToast = useCallback(() => setToast(""), []);

  const updateParams = useCallback(
    (changes, { resetPage = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "" || value === false) next.delete(key);
            else next.set(key, String(value));
          });
          if (resetPage) next.delete("pagina");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Guardamos los filtros para que la ficha pueda volver a esta misma vista.
  const listSearch = searchParams.toString();
  useEffect(() => {
    try {
      window.sessionStorage.setItem(PETS_LIST_SEARCH_KEY, listSearch);
    } catch {
      /* sessionStorage no disponible */
    }
  }, [listSearch]);

  // Atajo "/" para ir al buscador.
  useEffect(() => {
    function onKey(event) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) return;
      if (document.querySelector(".pv-sheet-root")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activePets = useMemo(() => pets.filter((p) => !p.archived_at), [pets]);
  const archivedPets = useMemo(() => pets.filter((p) => p.archived_at), [pets]);
  const inView = view === "archived" ? archivedPets : activePets;
  const searched = useMemo(() => inView.filter((p) => matchesPetSearch(p, q)), [inView, q]);
  const incompleteCount = useMemo(() => searched.filter(isIncomplete).length, [searched]);
  const results = useMemo(() => {
    const list = onlyIncomplete ? searched.filter(isIncomplete) : [...searched];
    return list.sort(SORTERS[sort]);
  }, [searched, onlyIncomplete, sort]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedPet = selectedId ? pets.find((p) => String(p.id) === String(selectedId)) || null : null;

  function goToPage(n) {
    updateParams({ pagina: n > 1 ? n : null }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCreate(initialName = "") {
    setFormState({ open: true, pet: null, initialName });
  }

  function openEdit(pet) {
    setFormState({ open: true, pet, initialName: "" });
  }

  async function handleSaved(saved, { keepOpen } = {}) {
    await refresh();
    if (keepOpen) return;
    const wasEdit = Boolean(formState.pet);
    setFormState({ open: false, pet: null, initialName: "" });
    if (!wasEdit && saved?.id) {
      setToast(`${displayName(saved.name)} quedó registrada`);
      setSelectedId(saved.id);
    } else {
      setToast("Cambios guardados");
    }
  }

  const actions = usePetActions({
    notify: setToast,
    onChanged: async (_pet, action) => {
      if (action !== "restored" || view === "archived") setSelectedId(null);
      await refresh();
    },
  });

  function schedule(pet) {
    navigate(`/agenda?nuevoTurno=1&petId=${encodeURIComponent(pet.id)}`);
  }

  const showingFrom = results.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(page * PAGE_SIZE, results.length);
  const fmt = (n) => n.toLocaleString("es-AR");

  return (
    <div className="page-content pv-page">
      <header className="pv-header">
        <div>
          <h1 className="page-title">Mascotas</h1>
          <p className="page-subtitle">
            {view === "archived"
              ? "Mascotas archivadas. Conservan su ficha y su historial."
              : "Registro de perros y datos básicos."}
          </p>
        </div>
        <button type="button" className="pv-btn pv-btn--brand pv-header__cta" onClick={() => openCreate()}>
          + Nueva mascota
        </button>
      </header>

      <div className="pv-toolbar">
        <label className="pv-search">
          <Icon name="search" />
          <span className="pv-visually-hidden">Buscar</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar por mascota, dueño o celular…"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
          />
          {!q && <kbd className="pv-kbd" aria-hidden="true">/</kbd>}
        </label>

        <div className="pv-segmented" role="tablist" aria-label="Estado">
          <button
            type="button"
            role="tab"
            aria-selected={view === "active"}
            className={`pv-segmented__item${view === "active" ? " is-active" : ""}`}
            onClick={() => updateParams({ vista: null })}
          >
            Activas <span className="pv-count">{fmt(activePets.length)}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "archived"}
            className={`pv-segmented__item${view === "archived" ? " is-active" : ""}`}
            onClick={() => updateParams({ vista: "archivadas" })}
          >
            Archivadas <span className="pv-count">{fmt(archivedPets.length)}</span>
          </button>
        </div>

        <label className="pv-select">
          <span className="pv-visually-hidden">Ordenar</span>
          <select value={sort} onChange={(e) => updateParams({ orden: e.target.value === "fieles" ? null : e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`pv-chip${onlyIncomplete ? " is-active" : ""}`}
          aria-pressed={onlyIncomplete}
          onClick={() => updateParams({ incompletas: onlyIncomplete ? null : "1" })}
        >
          Fichas incompletas <span className="pv-count">{fmt(incompleteCount)}</span>
        </button>
      </div>

      {error ? (
        <div className="pv-state pv-state--error" role="alert">
          <strong>No se pudieron cargar las mascotas.</strong>
          <p>{error}</p>
          <button type="button" className="pv-btn pv-btn--ghost" onClick={refresh}>
            Reintentar
          </button>
        </div>
      ) : loading && pets.length === 0 ? (
        <div className="pv-grid" aria-busy="true" aria-label="Cargando mascotas">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="pv-card pv-card--skeleton">
              <div className="pv-skel pv-skel--row" />
              <div className="pv-skel pv-skel--line" />
              <div className="pv-skel pv-skel--line pv-skel--short" />
              <div className="pv-skel pv-skel--block" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          hasAny={inView.length > 0}
          view={view}
          q={q}
          onlyIncomplete={onlyIncomplete}
          onCreate={openCreate}
          onSearchArchived={() => updateParams({ vista: "archivadas" })}
          onClearIncomplete={() => updateParams({ incompletas: null })}
        />
      ) : (
        <>
          <p className="pv-results">
            {fmt(results.length)} {results.length === 1 ? "mascota" : "mascotas"} · mostrando {fmt(showingFrom)}–
            {fmt(showingTo)}
          </p>
          <div className="pv-grid">
            {pageItems.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onOpen={() => setSelectedId(pet.id)}
                fichaState={{ from: `/pets${listSearch ? `?${listSearch}` : ""}` }}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="pv-pagination" aria-label="Páginas">
              <button type="button" className="pv-page-btn" onClick={() => goToPage(page - 1)} disabled={page === 1}>
                ← Anterior
              </button>
              <div className="pv-pagination__pages">
                {pageNumbers(page, totalPages).map((n, i) =>
                  n === "…" ? (
                    <span key={`e-${i}`} className="pv-pagination__ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`pv-page-btn pv-page-btn--num${page === n ? " is-active" : ""}`}
                      aria-current={page === n ? "page" : undefined}
                      onClick={() => goToPage(n)}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                className="pv-page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}

      {selectedPet && (
        <PetQuickView
          pet={selectedPet}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
          onArchive={actions.archive}
          onRestore={actions.restore}
          onSchedule={schedule}
          fichaState={{ from: `/pets${listSearch ? `?${listSearch}` : ""}` }}
        />
      )}

      <PetForm
        open={formState.open}
        pet={formState.pet}
        initialName={formState.initialName}
        onClose={() => setFormState({ open: false, pet: null, initialName: "" })}
        onSaved={handleSaved}
      />

      {actions.dialogs}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

function PetCard({ pet, onOpen, fichaState }) {
  const stats = getPetStats(pet);
  const color = petColor(pet.name);
  const breedLine = [displayName(pet.breed), sizeLabel(pet.size)].filter(Boolean).join(" · ");
  const age = petAgeLabel(pet);
  const incomplete = isIncomplete(pet);

  return (
    <article
      className="pv-card"
      style={{ "--pet-color": color }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      aria-label={`${displayName(pet.name)}: vista rápida`}
    >
      <div className="pv-card__top">
        <PetAvatar pet={pet} size={44} />
        <div className="pv-card__id">
          <h3 className="pv-card__name">{displayName(pet.name)}</h3>
          {breedLine && <p className="pv-card__breed">{breedLine}</p>}
        </div>
        <div className="pv-card__count" title="Servicios finalizados">
          <strong>{stats.servicios}</strong>
          <span>servicios</span>
        </div>
      </div>

      {(pet.owner_name || pet.owner_phone) && (
        <div className="pv-card__owner">
          {pet.owner_name && <span className="pv-ellipsis">{displayName(pet.owner_name)}</span>}
          {pet.owner_phone && <span className="pv-muted">{pet.owner_phone}</span>}
        </div>
      )}

      {pet.behavior && (
        <div className="pv-card__behavior">
          <p>{displayText(pet.behavior)}</p>
        </div>
      )}

      <div className="pv-card__pills">
        <Pill tone={pet.neutered ? "ok" : "muted"}>{pet.neutered ? "Castrado" : "Sin castrar"}</Pill>
        {age && <Pill>{age}</Pill>}
        {stats.proximoTurno && <Pill tone="info">Próximo {formatShortDate(stats.proximoTurno)}</Pill>}
        {incomplete && <Pill tone="dashed">Incompleta</Pill>}
      </div>

      <div className="pv-card__foot">
        <span className="pv-muted">
          {stats.ultimaVisita ? `Última visita ${formatShortDate(stats.ultimaVisita)}` : "Sin visitas"}
        </span>
        <Link
          to={`/pets/${pet.id}`}
          state={fichaState}
          className="pv-link"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          Ver ficha →
        </Link>
      </div>
    </article>
  );
}

function EmptyState({ hasAny, view, q, onlyIncomplete, onCreate, onSearchArchived, onClearIncomplete }) {
  if (q) {
    return (
      <div className="pv-state">
        <strong>No encontramos «{q}»</strong>
        <p>
          {view === "archived"
            ? "Tampoco está entre las archivadas."
            : "Revisá cómo está escrito o buscá entre las archivadas."}
        </p>
        <div className="pv-state__actions">
          {view === "active" && (
            <button type="button" className="pv-btn pv-btn--ghost" onClick={onSearchArchived}>
              Buscar en archivadas
            </button>
          )}
          <button type="button" className="pv-btn pv-btn--brand" onClick={() => onCreate(q)}>
            Crear «{q}»
          </button>
        </div>
      </div>
    );
  }
  if (onlyIncomplete && hasAny) {
    return (
      <div className="pv-state">
        <strong>No hay fichas incompletas</strong>
        <p>Todas tienen cargado el tamaño y la edad.</p>
        <div className="pv-state__actions">
          <button type="button" className="pv-btn pv-btn--ghost" onClick={onClearIncomplete}>
            Ver todas
          </button>
        </div>
      </div>
    );
  }
  if (view === "archived") {
    return (
      <div className="pv-state">
        <strong>No hay mascotas archivadas</strong>
        <p>Cuando archives una, va a aparecer acá con su ficha y su historial.</p>
      </div>
    );
  }
  return (
    <div className="pv-state">
      <strong>Todavía no hay mascotas</strong>
      <p>Registrá la primera o se van a ir creando solas cuando agendes turnos.</p>
      <div className="pv-state__actions">
        <button type="button" className="pv-btn pv-btn--brand" onClick={() => onCreate()}>
          + Nueva mascota
        </button>
      </div>
    </div>
  );
}
