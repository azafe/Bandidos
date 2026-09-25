// src/pages/pets/PetDetailPage.jsx
// Ficha de mascota: perfil, KPIs, próximo turno e historial de servicios.
// Las estadísticas vienen del backend (misma consulta que la lista) y el
// historial de GET /v2/pets/:id/turnos.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import PhotoUpload from "../../components/ui/PhotoUpload";
import { todayISO } from "../../utils/dates";
import PetForm from "./components/PetForm";
import ServiceDetail from "./components/ServiceDetail";
import { Icon, Pill, PetAvatar, StatusPill, Toast } from "./components/PetBits";
import { usePetActions } from "./components/usePetActions";
import {
  completionRatio,
  daysBetween,
  displayName,
  displayText,
  formatDate,
  formatDaysAgo,
  formatDuration,
  formatMoney,
  formatShortDate,
  formatTime,
  getPetStats,
  isIncomplete,
  isLoyalClient,
  missingFields,
  petColor,
  petSummaryLine,
  PETS_LIST_SEARCH_KEY,
  weekdayName,
  whatsappUrl,
} from "../../utils/pets";
import "../../styles/pets.css";

const HISTORY_PAGE = 10;
const HISTORY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "finished", label: "Finalizados" },
  { value: "cancelled", label: "Cancelados" },
];

function asList(data) {
  return Array.isArray(data) ? data : data?.items || [];
}

function dateKey(value) {
  return String(value || "").split("T")[0];
}

function listBackPath(state) {
  if (state?.from) return state.from;
  try {
    const saved = window.sessionStorage.getItem(PETS_LIST_SEARCH_KEY);
    return saved ? `/pets?${saved}` : "/pets";
  } catch {
    return "/pets";
  }
}

function joinParts(parts) {
  return parts.filter(Boolean).join(" · ");
}

export default function PetDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const backPath = listBackPath(location.state);

  const [pet, setPet] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [lookups, setLookups] = useState({ employees: new Map(), payments: new Map(), types: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [toast, setToast] = useState("");
  const clearToast = useCallback(() => setToast(""), []);
  const photoPickerRef = useRef(null);

  const loadPet = useCallback(async () => {
    const [petData, turnosData] = await Promise.all([
      apiRequest(`/v2/pets/${id}`),
      apiRequest(`/v2/pets/${id}/turnos`),
    ]);
    setPet(petData);
    setTurnos(asList(turnosData));
  }, [id]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [, employees, payments, types] = await Promise.all([
        loadPet(),
        apiRequest("/v2/employees").catch(() => []),
        apiRequest("/v2/payment-methods").catch(() => []),
        apiRequest("/v2/service-types").catch(() => []),
      ]);
      const toMap = (rows) => new Map(asList(rows).map((r) => [String(r.id), r]));
      setLookups({ employees: toMap(employees), payments: toMap(payments), types: toMap(types) });
    } catch (err) {
      setError(err.status === 404 ? "No encontramos esta mascota." : err.message || "No se pudo cargar la ficha.");
    } finally {
      setLoading(false);
    }
  }, [loadPet]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useMemo(
    () => ({
      groomer: (t) => t.groomer?.name || lookups.employees.get(String(t.groomer_id))?.name || "",
      payment: (t) => t.payment_method?.name || lookups.payments.get(String(t.payment_method_id))?.name || "",
      serviceType: (t) => t.service_type?.name || lookups.types.get(String(t.service_type_id))?.name || "",
    }),
    [lookups]
  );

  const actions = usePetActions({
    notify: setToast,
    onChanged: async (changed, action) => {
      if (action === "deleted") {
        navigate(backPath, { replace: true });
        return;
      }
      setPet((prev) => (prev ? { ...prev, ...changed } : prev));
    },
  });

  if (loading && !pet) {
    return (
      <div className="page-content pv-page">
        <div className="pv-profile pv-card--skeleton" aria-busy="true">
          <div className="pv-skel pv-skel--row" />
          <div className="pv-skel pv-skel--line" />
          <div className="pv-skel pv-skel--block" />
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="page-content pv-page">
        <Link to={backPath} className="pv-back">
          <Icon name="back" size={16} /> Mascotas
        </Link>
        <div className="pv-state pv-state--error" role="alert">
          <strong>{error || "No se pudo cargar la ficha."}</strong>
          <div className="pv-state__actions">
            <button type="button" className="pv-btn pv-btn--ghost" onClick={load}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const name = displayName(pet.name);
  const stats = getPetStats(pet);
  const color = petColor(pet.name);
  const archived = Boolean(pet.archived_at);
  const waUrl = whatsappUrl(pet.owner_phone);
  const missing = missingFields(pet);
  const incomplete = isIncomplete(pet);

  const lastVisitTurno = turnos.find((t) => t.status === "finished" && dateKey(t.date) === stats.ultimaVisita);
  const nextTurno = stats.proximoTurno
    ? [...turnos]
        .filter((t) => t.status === "reserved" && dateKey(t.date) === stats.proximoTurno)
        .sort((a, b) => String(a.time).localeCompare(String(b.time)))[0]
    : null;

  const filteredHistory =
    historyFilter === "all" ? turnos : turnos.filter((t) => t.status === historyFilter);
  const visibleHistory = historyExpanded ? filteredHistory : filteredHistory.slice(0, HISTORY_PAGE);
  const hiddenCount = filteredHistory.length - visibleHistory.length;

  const contactLine = [
    pet.owner_name && { label: "Dueño", value: displayName(pet.owner_name) },
    pet.owner_phone && { label: "Cel.", value: pet.owner_phone },
    pet.address && { label: "Dir.", value: displayText(pet.address) },
  ].filter(Boolean);

  const servicesNote = joinParts([
    stats.reservados > 0 && `+${stats.reservados} ${stats.reservados === 1 ? "reservado" : "reservados"}`,
    stats.cancelados > 0 && `${stats.cancelados} ${stats.cancelados === 1 ? "cancelado" : "cancelados"}`,
  ]);
  const lastVisitNote = joinParts([
    lastVisitTurno && resolve.serviceType(lastVisitTurno),
    stats.ultimaVisita && formatDaysAgo(stats.ultimaVisita),
    stats.frecuenciaDias && `viene cada ~${stats.frecuenciaDias} días`,
  ]);

  function schedule() {
    navigate(`/agenda?nuevoTurno=1&petId=${encodeURIComponent(pet.id)}`);
  }

  function handlePhotoUploaded(updated) {
    setPet((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  async function handleSaved(saved, { keepOpen } = {}) {
    if (saved) setPet((prev) => (prev ? { ...prev, ...saved } : prev));
    if (keepOpen) return;
    setFormOpen(false);
    setToast("Cambios guardados");
    try {
      await loadPet();
    } catch {
      /* los datos editados ya están en pantalla */
    }
  }

  const menu = (
    <MoreMenu
      archived={archived}
      isAdmin={isAdmin}
      onChangePhoto={() => photoPickerRef.current?.open()}
      onArchiveToggle={() => (archived ? actions.restore(pet) : actions.archive(pet))}
      onDelete={() => actions.requestDelete(pet)}
    />
  );

  const actionButtons = (
    <>
      {waUrl ? (
        <a className="pv-btn pv-btn--wa" href={waUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" /> WhatsApp
        </a>
      ) : (
        <span className="pv-btn pv-btn--wa is-disabled" aria-disabled="true" title="Sin celular cargado">
          <Icon name="whatsapp" /> WhatsApp
        </span>
      )}
      <button type="button" className="pv-btn pv-btn--ghost" onClick={() => setFormOpen(true)}>
        <Icon name="edit" /> Editar
      </button>
      <button
        type="button"
        className="pv-btn pv-btn--brand"
        onClick={schedule}
        disabled={archived}
        title={archived ? "Restaurala para agendarle un turno" : undefined}
      >
        <Icon name="calendar" /> Agendar turno
      </button>
    </>
  );

  return (
    <div className="page-content pv-page pv-detail">
      {/* Mobile: barra superior */}
      <div className="pv-topbar">
        <Link to={backPath} className="pv-icon-btn" aria-label="Volver a Mascotas">
          <Icon name="back" />
        </Link>
        <span className="pv-topbar__title">Ficha</span>
        {menu}
      </div>

      {/* Desktop: breadcrumb */}
      <nav className="pv-breadcrumb" aria-label="Ruta">
        <Link to={backPath} className="pv-back">
          <Icon name="back" size={16} /> Mascotas
        </Link>
        <span aria-hidden="true">/</span>
        <span className="pv-breadcrumb__current">{name}</span>
      </nav>

      {archived && (
        <div className="pv-archived-bar" role="status">
          <p>
            <strong>ARCHIVADA</strong> · No aparece en listas ni búsquedas, pero conserva su ficha y su historial.
          </p>
          <button type="button" className="pv-btn pv-btn--light" onClick={() => actions.restore(pet)}>
            Restaurar
          </button>
        </div>
      )}

      {/* Perfil */}
      <section className="pv-profile" style={{ "--pet-color": color }}>
        <div className="pv-profile__main">
          <div className="pv-profile__photo">
            <PhotoUpload
              photoUrl={pet.photo_url}
              uploadPath={`/v2/pets/${pet.id}/photo`}
              onUploaded={handlePhotoUploaded}
              size={96}
              className="pv-photo-overlay"
              triggerClassName="pv-camera-btn"
              triggerContent={<Icon name="camera" size={16} />}
              label="Cambiar foto"
              pickerRef={photoPickerRef}
              fallback={<PetAvatar pet={pet} size={96} />}
            />
          </div>
          <div className="pv-profile__info">
            <div className="pv-profile__name-row">
              <h1 className="pv-profile__name">{name}</h1>
              {isLoyalClient(pet) && (
                <Pill tone="brand">Cliente fiel · {stats.servicios} visitas</Pill>
              )}
            </div>
            <p className="pv-muted">{petSummaryLine(pet)}</p>
            {contactLine.length > 0 && (
              <p className="pv-profile__contact">
                {contactLine.map((part) => (
                  <span key={part.label}>
                    <span className="pv-muted">{part.label}</span> {part.value}
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="pv-profile__actions">
            {actionButtons}
            <span className="pv-profile__menu">{menu}</span>
          </div>
        </div>

        {(pet.behavior || pet.notes) && (
          <div className="pv-profile__notes">
            {pet.behavior && (
              <div className="pv-callout pv-callout--warn">
                <span className="pv-callout__label">
                  <Icon name="alert" size={14} /> Comportamiento · antes de atender
                </span>
                <p>{displayText(pet.behavior)}</p>
              </div>
            )}
            {pet.notes && (
              <div className="pv-callout">
                <span className="pv-callout__label">Observaciones</span>
                <p>{displayText(pet.notes)}</p>
              </div>
            )}
          </div>
        )}

        {incomplete && (
          <div className="pv-incomplete">
            <div>
              <strong>Completá la ficha de {name}</strong>
              <p className="pv-muted">Faltan: {missing.map((f) => f.label).join(", ")}.</p>
              <div
                className="pv-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(completionRatio(pet) * 100)}
                aria-label="Ficha completa"
              >
                <span style={{ width: `${Math.round(completionRatio(pet) * 100)}%` }} />
              </div>
            </div>
            <button type="button" className="pv-link pv-link--btn" onClick={() => setFormOpen(true)}>
              Completar ahora →
            </button>
          </div>
        )}
      </section>

      {/* Mobile: acciones debajo del perfil */}
      <div className="pv-mobile-actions">{actionButtons}</div>

      {/* KPIs */}
      <section className="pv-kpis" aria-label="Resumen">
        <div className="pv-kpi">
          <span>Ingresos acumulados</span>
          <strong className="pv-kpi__brand">{formatMoney(stats.ingresos)}</strong>
          <small>Solo servicios finalizados</small>
        </div>
        <div className="pv-kpi">
          <span>Servicios realizados</span>
          <strong>{stats.servicios}</strong>
          {servicesNote && <small>{servicesNote}</small>}
        </div>
        <div className="pv-kpi pv-kpi--desktop">
          <span>Promedio por servicio</span>
          <strong>{stats.servicios > 0 ? formatMoney(stats.promedio) : "Sin servicios"}</strong>
        </div>
        <div className="pv-kpi">
          <span>Última visita</span>
          <strong>{stats.ultimaVisita ? formatDate(stats.ultimaVisita) : "Sin visitas"}</strong>
          {lastVisitNote && <small>{lastVisitNote}</small>}
        </div>
        <div className="pv-kpi pv-kpi--mobile pv-kpi--info">
          <span>Próximo</span>
          <strong>{stats.proximoTurno ? formatShortDate(stats.proximoTurno) : "Sin turno"}</strong>
          {nextTurno && <small>{joinParts([formatTime(nextTurno.time), resolve.serviceType(nextTurno)])}</small>}
        </div>
      </section>

      {/* Próximo turno */}
      {nextTurno && <NextTurno turno={nextTurno} resolve={resolve} onOpen={() => setSelectedTurno(nextTurno)} />}

      {/* Historial */}
      <section className="pv-history">
        <div className="pv-history__head">
          <div>
            <h2 className="pv-section-title">Historial de servicios</h2>
            <p className="pv-muted">Del más reciente al más antiguo.</p>
          </div>
          {turnos.length > 0 && (
            <div className="pv-segmented pv-segmented--small" role="tablist" aria-label="Filtrar historial">
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={historyFilter === f.value}
                  className={`pv-segmented__item${historyFilter === f.value ? " is-active" : ""}`}
                  onClick={() => {
                    setHistoryFilter(f.value);
                    setHistoryExpanded(false);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {turnos.length === 0 ? (
          <div className="pv-state pv-state--inline">
            <strong>No hay servicios registrados para esta mascota.</strong>
            {!archived && (
              <div className="pv-state__actions">
                <button type="button" className="pv-btn pv-btn--brand" onClick={schedule}>
                  Agendar turno
                </button>
              </div>
            )}
          </div>
        ) : filteredHistory.length === 0 ? (
          <p className="pv-muted pv-history__empty">
            No hay servicios {historyFilter === "cancelled" ? "cancelados" : "finalizados"}.
          </p>
        ) : (
          <>
            <table className="pv-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Servicio</th>
                  <th scope="col">Groomer</th>
                  <th scope="col">Pago</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className="pv-num">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((t) => {
                  const groomer = resolve.groomer(t);
                  const payment = resolve.payment(t);
                  return (
                    <tr
                      key={t.id}
                      className={t.status === "cancelled" ? "is-cancelled" : ""}
                      onClick={() => setSelectedTurno(t)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTurno(t);
                        }
                      }}
                    >
                      <td>{formatDate(t.date)}</td>
                      <td className="pv-strong">{resolve.serviceType(t) || "Servicio"}</td>
                      <td>{groomer && <Pill tone="groomer">{groomer}</Pill>}</td>
                      <td>{payment && <Pill tone="pay">{payment}</Pill>}</td>
                      <td>
                        <StatusPill status={t.status} />
                      </td>
                      <td className="pv-num pv-price">{formatMoney(t.price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="pv-history-list">
              {visibleHistory.map((t) => (
                <li key={t.id} className={t.status === "cancelled" ? "is-cancelled" : ""}>
                  <button type="button" onClick={() => setSelectedTurno(t)}>
                    <span className="pv-history-list__main">
                      <strong>{resolve.serviceType(t) || "Servicio"}</strong>
                      <span className="pv-muted">{joinParts([formatDate(t.date), resolve.groomer(t)])}</span>
                    </span>
                    <span className="pv-history-list__side">
                      <strong className="pv-price">{formatMoney(t.price)}</strong>
                      <StatusPill status={t.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {hiddenCount > 0 && (
              <button type="button" className="pv-btn pv-btn--ghost pv-history__more" onClick={() => setHistoryExpanded(true)}>
                Ver {hiddenCount} más
              </button>
            )}
            <p className="pv-hint pv-history__foot">
              Los cancelados se muestran pero no suman en ingresos ni promedio.
            </p>
          </>
        )}
      </section>

      {selectedTurno && (
        <ServiceDetail turno={selectedTurno} pet={pet} resolve={resolve} onClose={() => setSelectedTurno(null)} />
      )}

      <PetForm open={formOpen} pet={pet} onClose={() => setFormOpen(false)} onSaved={handleSaved} />

      {actions.dialogs}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

// Menú ···: se monta dos veces (barra mobile y perfil desktop), así que cada
// instancia lleva su propio estado.
function MoreMenu({ archived, isAdmin, onChangePhoto, onArchiveToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="pv-menu" ref={ref}>
      <button
        type="button"
        className="pv-icon-btn pv-icon-btn--bordered"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más acciones"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div className="pv-menu__list" role="menu">
          <button type="button" role="menuitem" onClick={() => run(onChangePhoto)}>
            Cambiar foto
          </button>
          <button type="button" role="menuitem" onClick={() => run(onArchiveToggle)}>
            {archived ? "Restaurar mascota" : "Archivar mascota"}
          </button>
          {isAdmin && (
            <>
              <hr />
              <button type="button" role="menuitem" className="is-danger" onClick={() => run(onDelete)}>
                Eliminar definitivamente…
                <small>Solo administradores</small>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NextTurno({ turno, resolve, onOpen }) {
  const date = dateKey(turno.date);
  const [, month, day] = date.split("-");
  const price = Number(turno.price) || 0;
  const deposit = Number(turno.deposit_amount) || 0;
  const balance = Math.max(0, price - deposit);
  const groomer = resolve.groomer(turno);
  const inDays = daysBetween(todayISO(), date);

  return (
    <button type="button" className="pv-next" onClick={onOpen}>
      <span className="pv-next__date" aria-hidden="true">
        <small>{weekdayName(date).slice(0, 3)}</small>
        <strong>{Number(day)}</strong>
        <small>/{month}</small>
      </span>
      <span className="pv-next__body">
        <span className="pv-eyebrow">
          Próximo turno{inDays === 0 ? " · hoy" : inDays === 1 ? " · mañana" : ""}
        </span>
        <strong>{joinParts([resolve.serviceType(turno) || "Servicio", formatTime(turno.time), formatDuration(turno.duration)])}</strong>
        <span className="pv-next__meta">
          {groomer && <Pill tone="groomer">{groomer}</Pill>}
          {deposit > 0 && <span className="pv-muted">Seña {formatMoney(deposit)}</span>}
          {price > 0 && (
            <span className={balance > 0 ? "pv-warn-text" : "pv-ok-text"}>
              {balance > 0 ? `Saldo ${formatMoney(balance)}` : "Saldado"}
            </span>
          )}
        </span>
      </span>
      <StatusPill status="reserved" />
    </button>
  );
}
