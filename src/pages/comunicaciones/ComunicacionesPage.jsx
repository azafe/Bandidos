// src/pages/comunicaciones/ComunicacionesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import {
  limpiarTelefono,
  buildMensajeTurno,
  buildMensajeCumpleanos,
} from "../../utils/whatsapp";
import {
  calcularEdad,
  esCumpleanosHoy,
  esCumpleanosEstaSemana,
  esCumpleanosEsteMes,
} from "../../utils/cumpleanos";

const DAYS_RANGE = 180;
const TAB_KEY = "bandidos_comunicaciones_tab";
const PAGE_SIZE = 20;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b).reduce((acc, n, i, arr) => {
    if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
    acc.push(n);
    return acc;
  }, []);
}

function toISODateLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const formatFecha = (val) => {
  if (!val) return "-";
  const raw = String(val).split("T")[0];
  const [yyyy, mm, dd] = raw.split("-");
  return `${dd}/${mm}/${yyyy}`;
};

export default function ComunicacionesPage() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(TAB_KEY) || "turnos"
  );
  const [diasMin, setDiasMin] = useState(30);
  const [cumpleFiltro, setCumpleFiltro] = useState("semana"); // "hoy" | "semana" | "mes"
  const [pageRecordatorios, setPageRecordatorios] = useState(1);
  const [pageContactados, setPageContactados] = useState(1);
  const [pageTodos, setPageTodos] = useState(1);
  const [mensajesEnviados, setMensajesEnviados] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mensajeEdit, setMensajeEdit] = useState("");
  const [copiadoModal, setCopiadoModal] = useState(false);

  const { items: pets } = useApiResource("/v2/pets");

  // Write seen on mount so badge disappears
  useEffect(() => {
    // Badge count is updated after data loads; just record visit date for now
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchTurnos() {
      try {
        setLoading(true);
        setError(null);
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - DAYS_RANGE);
        const data = await apiRequest("/agenda", {
          params: { from: toISODateLocal(from), to: toISODateLocal(to) },
        });
        if (!active) return;
        setTurnos(Array.isArray(data) ? data : data?.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "No se pudieron cargar los turnos.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchTurnos();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchMensajesEnviados() {
      try {
        const data = await apiRequest("/v2/comunicaciones");
        if (!active) return;
        setMensajesEnviados(Array.isArray(data) ? data : []);
      } catch {
        // No bloquear si falla; simplemente no hay historial cargado
      }
    }
    fetchMensajesEnviados();
    return () => { active = false; };
  }, []);

  function switchTab(tab) {
    setActiveTab(tab);
    localStorage.setItem(TAB_KEY, tab);
    setPageTodos(1);
  }

  // ── Turnos logic ──────────────────────────────────────────────
  const getPetInfo = (turno) => {
    const petId = turno.pet_id ?? turno.pet?.id;
    const petName =
      turno.pet?.name ??
      turno.pet_name ??
      turno.dogName ??
      pets.find((p) => String(p.id) === String(petId))?.name ??
      "-";
    const ownerName =
      turno.pet?.owner_name ??
      turno.owner_name ??
      turno.ownerName ??
      turno.customer?.name ??
      pets.find((p) => String(p.id) === String(petId))?.owner_name ??
      "-";
    const ownerPhone =
      turno.pet?.owner_phone ??
      turno.owner_phone ??
      turno.phone ??
      pets.find((p) => String(p.id) === String(petId))?.owner_phone ??
      "";
    return { petId, petName, ownerName, ownerPhone };
  };

  const recordatorios = useMemo(() => {
    const finished = turnos.filter(
      (t) => t.status === "finished" || t.status === "finalizado"
    );
    const byPet = {};
    finished.forEach((t) => {
      const pid = t.pet_id ?? t.pet?.id;
      if (!pid) return;
      if (!byPet[pid] || t.date > byPet[pid].date) byPet[pid] = t;
    });
    const today = new Date();
    return Object.values(byPet)
      .map((t) => {
        const dias = Math.floor((today - new Date(t.date)) / 86400000);
        return { ...t, dias };
      })
      .filter((t) => t.dias >= diasMin)
      .sort((a, b) => b.dias - a.dias);
  }, [turnos, diasMin]);

  function estaEnviado(petId, type) {
    const registro = mensajesEnviados.find(
      (m) => String(m.petId) === String(petId) && m.type === type
    );
    if (!registro) return false;
    if (type === "turno") {
      const sentDate = String(registro.sentAt).split("T")[0];
      const tieneVisitaNueva = turnos.some(
        (t) =>
          (t.status === "finished" || t.status === "finalizado") &&
          String(t.pet_id) === String(petId) &&
          String(t.date).split("T")[0] > sentDate
      );
      if (tieneVisitaNueva) return false;
    }
    return true;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const pendientes = recordatorios.filter((r) => !estaEnviado(r.pet_id ?? r.pet?.id, "turno"));
  const enviadosHoy = mensajesEnviados.filter(
    (m) => String(m.sentAt).startsWith(todayStr)
  ).length;
  const diasPromedio = recordatorios.length
    ? Math.round(recordatorios.reduce((s, r) => s + r.dias, 0) / recordatorios.length)
    : 0;

  // ── Birthday logic ────────────────────────────────────────────
  const petsWithBirthday = useMemo(
    () => pets.filter((p) => p.birth_date),
    [pets]
  );
  const todayBirthdays = useMemo(
    () => petsWithBirthday.filter((p) => esCumpleanosHoy(p.birth_date)),
    [petsWithBirthday]
  );
  const weekBirthdays = useMemo(
    () => petsWithBirthday.filter((p) => esCumpleanosEstaSemana(p.birth_date)),
    [petsWithBirthday]
  );
  const monthBirthdays = useMemo(
    () => petsWithBirthday.filter((p) => esCumpleanosEsteMes(p.birth_date)),
    [petsWithBirthday]
  );

  // ── Paginación ─────────────────────────────────────────────────
  const recordatoriosTotalPages = Math.ceil(recordatorios.length / PAGE_SIZE);
  const recordatoriosPaginados = useMemo(
    () => recordatorios.slice((pageRecordatorios - 1) * PAGE_SIZE, pageRecordatorios * PAGE_SIZE),
    [recordatorios, pageRecordatorios]
  );

  const contactadosTurno = useMemo(
    () => mensajesEnviados
      .filter((m) => m.type === "turno")
      .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt))),
    [mensajesEnviados]
  );
  const contactadosTotalPages = Math.ceil(contactadosTurno.length / PAGE_SIZE);
  const contactadosPaginados = useMemo(
    () => contactadosTurno.slice((pageContactados - 1) * PAGE_SIZE, pageContactados * PAGE_SIZE),
    [contactadosTurno, pageContactados]
  );

  // ── Badge count update ─────────────────────────────────────────
  useEffect(() => {
    if (loading || pets.length === 0) return;
    const count =
      todayBirthdays.length +
      weekBirthdays.length +
      recordatorios.filter((r) => r.dias >= 30).length;
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("bandidos_comunicaciones_count", String(count));
    localStorage.setItem("bandidos_comunicaciones_seen", today);
  }, [loading, pets, todayBirthdays, weekBirthdays, recordatorios]);

  // ── Modal ──────────────────────────────────────────────────────
  function abrirModalTurno(turno) {
    const { petName, ownerName, ownerPhone } = getPetInfo(turno);
    setSelected({ type: "turno", turno, petName, ownerName, ownerPhone });
    setMensajeEdit(buildMensajeTurno(ownerName, petName, turno.dias));
    setCopiadoModal(false);
  }

  function abrirModalCumple(pet) {
    const edad = calcularEdad(pet.birth_date);
    setSelected({
      type: "cumple",
      petName: pet.name,
      ownerName: pet.owner_name || "-",
      ownerPhone: pet.owner_phone || "",
      petId: pet.id,
    });
    setMensajeEdit(buildMensajeCumpleanos(pet.owner_name || "-", pet.name, edad));
    setCopiadoModal(false);
  }

  function cerrarModal() {
    setSelected(null);
    setMensajeEdit("");
    setCopiadoModal(false);
  }

  async function resetearEnviado(petId, type) {
    setMensajesEnviados((prev) =>
      prev.filter((m) => !(String(m.petId) === String(petId) && m.type === type))
    );
    try {
      await apiRequest(`/v2/comunicaciones/${petId}/${type}`, { method: "DELETE" });
    } catch {
      // El estado visual ya está actualizado
    }
  }

  async function marcarEnviado(petId, type, petName, ownerName) {
    const record = { petId, type, petName, ownerName, sentAt: new Date().toISOString().split("T")[0] };
    // Actualizar estado local inmediatamente para respuesta visual instantánea
    setMensajesEnviados((prev) => {
      const filtered = prev.filter((m) => !(String(m.petId) === String(petId) && m.type === type));
      return [...filtered, record];
    });
    try {
      const saved = await apiRequest("/v2/comunicaciones", {
        method: "POST",
        body: { petId, type, petName, ownerName: ownerName ?? null },
      });
      setMensajesEnviados((prev) => {
        const filtered = prev.filter((m) => !(String(m.petId) === String(petId) && m.type === type));
        return [...filtered, saved];
      });
    } catch {
      // El estado visual ya está marcado; el registro se sincronizará en el próximo refresh
    }
  }

  function abrirWhatsApp(phone, mensaje) {
    const tel = limpiarTelefono(phone);
    if (!tel) {
      alert("Este cliente no tiene teléfono cargado.");
      return;
    }
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ── Todos tab items ────────────────────────────────────────────
  const todosItems = useMemo(() => {
    const items = [];
    todayBirthdays.forEach((p) => items.push({ key: `b-today-${p.id}`, type: "cumple-hoy", pet: p }));
    weekBirthdays.forEach((p) => items.push({ key: `b-week-${p.id}`, type: "cumple-semana", pet: p }));
    recordatorios
      .filter((r) => r.dias >= 60)
      .forEach((r) => items.push({ key: `t-60-${r.pet_id ?? r.id}`, type: "turno-60", turno: r }));
    recordatorios
      .filter((r) => r.dias >= 30 && r.dias < 60)
      .forEach((r) => items.push({ key: `t-30-${r.pet_id ?? r.id}`, type: "turno-30", turno: r }));
    return items;
  }, [todayBirthdays, weekBirthdays, recordatorios]);

  const todosTotalPages = Math.ceil(todosItems.length / PAGE_SIZE);
  const todosPaginados = useMemo(
    () => todosItems.slice((pageTodos - 1) * PAGE_SIZE, pageTodos * PAGE_SIZE),
    [todosItems, pageTodos]
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Comunicaciones</h1>
          <p className="page-subtitle">Recordatorios de turno y cumpleaños de mascotas.</p>
        </div>
      </header>

      {error && (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="agenda-mode-bar card" style={{ marginBottom: 20 }}>
        <div className="agenda-mode-switch" role="tablist" aria-label="Sección de comunicaciones">
          {[
            { id: "turnos", label: "Turnos pendientes" },
            { id: "cumpleanos", label: "Cumpleaños" },
            { id: "todos", label: "Todos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => switchTab(tab.id)}
            >
              {tab.label}
              {tab.id === "cumpleanos" && todayBirthdays.length > 0 && (
                <span style={{
                  background: "rgba(255,255,255,0.25)",
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  marginLeft: "6px",
                }}>
                  {todayBirthdays.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="agenda-mode-hint">
          {activeTab === "turnos" && "Enviá mensajes a clientes que llevan tiempo sin turno."}
          {activeTab === "cumpleanos" && "Felicitá a las mascotas y ofrecé un descuento por cumpleaños."}
          {activeTab === "todos" && "Vista unificada ordenada por prioridad."}
        </p>
      </div>

      {/* ── Tab: Turnos ── */}
      {activeTab === "turnos" && (
        <>
          <div className="card filters-card" style={{ marginBottom: 16 }}>
            <div className="filters-period-quick">
              <span>Sin turno hace más de</span>
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`filters-period-pill${diasMin === d ? " is-active" : ""}`}
                  onClick={() => { setDiasMin(d); setPageRecordatorios(1); }}
                >
                  {d} días
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={365}
                value={diasMin}
                onChange={(e) => { setDiasMin(Number(e.target.value) || 1); setPageRecordatorios(1); }}
                style={{
                  width: 60,
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-soft)",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              />
              <span>días</span>
            </div>
          </div>

          <div className="services-analytics__kpis" style={{ marginBottom: 24 }}>
            <div className="services-analytics__kpi">
              <span>Pendientes</span>
              <strong style={{ color: pendientes.length > 0 ? "#b91c1c" : undefined }}>
                {loading ? "…" : pendientes.length}
              </strong>
            </div>
            <div className="services-analytics__kpi services-analytics__kpi--income">
              <span>Enviados hoy</span>
              <strong>{enviadosHoy}</strong>
            </div>
            <div className="services-analytics__kpi">
              <span>Días promedio</span>
              <strong>{loading ? "…" : diasPromedio}</strong>
            </div>
          </div>

          <div className="card services-panel">
            <div className="services-panel__header">
              <div>
                <h2 className="card-title">Clientes sin turno reciente</h2>
                <p className="card-subtitle">
                  {loading
                    ? "Cargando turnos…"
                    : recordatorios.length === 0
                    ? `No hay mascotas con más de ${diasMin} días sin turno.`
                    : `${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""} · ${recordatorios.length} en total`}
                </p>
              </div>
            </div>
            <div className="services-list">
              {!loading && recordatorios.length > 0 && (
                <div className="recordatorio-header">
                  <div>Mascota / Dueño</div>
                  <div>Último turno</div>
                  <div>Días</div>
                  <div>Teléfono</div>
                  <div></div>
                </div>
              )}
              {loading ? (
                <div className="services-skeleton">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="service-item service-item--skeleton">
                      <div className="service-item__body">
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-line short" />
                        <div className="skeleton skeleton-pill" />
                      </div>
                      <div className="service-item__side">
                        <div className="skeleton skeleton-price" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recordatorios.length === 0 ? (
                <div className="services-empty">
                  Ningún cliente lleva más de {diasMin} días sin turno. ¡Todo al día!
                </div>
              ) : (
                recordatoriosPaginados.map((turno) => {
                  const { petId, petName, ownerName, ownerPhone } = getPetInfo(turno);
                  const yaEnviado = estaEnviado(petId, "turno");
                  const diasBadgeStyle =
                    turno.dias >= 90
                      ? { background: "#b91c1c18", color: "#b91c1c" }
                      : turno.dias >= 60
                      ? { background: "#d9770618", color: "#d97706" }
                      : { background: "var(--color-primary-light)", color: "var(--color-primary)" };
                  return (
                    <div
                      key={petId ?? turno.id}
                      className="service-item recordatorio-item"
                      style={{ opacity: yaEnviado ? 0.45 : 1, transition: "opacity 0.3s" }}
                      onClick={() => !yaEnviado && abrirModalTurno(turno)}
                    >
                      <div>
                        <div className="service-item__title">{petName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>{ownerName}</div>
                      </div>
                      <div className="recordatorio-item__date">{formatFecha(turno.date)}</div>
                      <div className="recordatorio-item__days">
                        <span className="service-badge" style={diasBadgeStyle}>{turno.dias}d</span>
                      </div>
                      <div className="recordatorio-item__phone">
                        {ownerPhone || <span style={{ color: "#b91c1c" }}>Sin tel.</span>}
                      </div>
                      <div className="recordatorio-item__action">
                        {yaEnviado ? (
                          <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{
                              background: "linear-gradient(135deg, #25D366, #128C7E)",
                              boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
                              fontSize: 13,
                              padding: "8px 18px",
                              borderRadius: 999,
                              fontWeight: 600,
                              letterSpacing: "0.02em",
                            }}
                            onClick={(e) => { e.stopPropagation(); abrirModalTurno(turno); }}
                          >
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {recordatoriosTotalPages > 1 && (
              <div className="pets-pagination">
                <button type="button" className="pets-pagination__btn" onClick={() => setPageRecordatorios((p) => Math.max(1, p - 1))} disabled={pageRecordatorios === 1}>← Anterior</button>
                <div className="pets-pagination__pages">
                  {pageNumbers(pageRecordatorios, recordatoriosTotalPages).map((n, i) =>
                    n === "…" ? <span key={`e-${i}`} className="pets-pagination__ellipsis">…</span> : (
                      <button key={n} type="button" className={`pets-pagination__btn pets-pagination__btn--page${pageRecordatorios === n ? " is-active" : ""}`} onClick={() => setPageRecordatorios(n)}>{n}</button>
                    )
                  )}
                </div>
                <button type="button" className="pets-pagination__btn" onClick={() => setPageRecordatorios((p) => Math.min(recordatoriosTotalPages, p + 1))} disabled={pageRecordatorios === recordatoriosTotalPages}>Siguiente →</button>
              </div>
            )}
          </div>

          {/* Sección: Ya contactados (turnos) */}
          {contactadosTurno.length > 0 && (
            <div className="card services-panel" style={{ marginTop: 16 }}>
              <div className="services-panel__header">
                <div>
                  <h2 className="card-title">Ya contactados</h2>
                  <p className="card-subtitle">Mascotas que recibieron un mensaje de recordatorio de turno.</p>
                </div>
              </div>
              <div className="services-list">
                <div className="recordatorio-header">
                  <div>Mascota / Dueño</div>
                  <div>Mensaje enviado</div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                {contactadosPaginados.map((m) => (
                  <div key={`${m.petId}_turno`} className="service-item recordatorio-item" style={{ opacity: 0.55 }}>
                    <div>
                      <div className="service-item__title">{m.petName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>{m.ownerName || "-"}</div>
                    </div>
                    <div className="recordatorio-item__date">{formatFecha(m.sentAt)}</div>
                    <div />
                    <div />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
                        onClick={() => resetearEnviado(m.petId, "turno")}
                      >
                        Resetear
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {contactadosTotalPages > 1 && (
                <div className="pets-pagination">
                  <button type="button" className="pets-pagination__btn" onClick={() => setPageContactados((p) => Math.max(1, p - 1))} disabled={pageContactados === 1}>← Anterior</button>
                  <div className="pets-pagination__pages">
                    {pageNumbers(pageContactados, contactadosTotalPages).map((n, i) =>
                      n === "…" ? <span key={`e-${i}`} className="pets-pagination__ellipsis">…</span> : (
                        <button key={n} type="button" className={`pets-pagination__btn pets-pagination__btn--page${pageContactados === n ? " is-active" : ""}`} onClick={() => setPageContactados(n)}>{n}</button>
                      )
                    )}
                  </div>
                  <button type="button" className="pets-pagination__btn" onClick={() => setPageContactados((p) => Math.min(contactadosTotalPages, p + 1))} disabled={pageContactados === contactadosTotalPages}>Siguiente →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Cumpleaños ── */}
      {activeTab === "cumpleanos" && (
        <>
          {/* Filtro de período */}
          <div className="card filters-card" style={{ marginBottom: 16 }}>
            <div className="filters-period-quick">
              <span>Mostrar cumpleaños</span>
              {[
                { id: "hoy", label: "Hoy", count: todayBirthdays.length },
                { id: "semana", label: "Esta semana", count: weekBirthdays.length },
                { id: "mes", label: "Este mes", count: monthBirthdays.length },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filters-period-pill${cumpleFiltro === f.id ? " is-active" : ""}`}
                  onClick={() => setCumpleFiltro(f.id)}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span style={{
                      marginLeft: 5,
                      background: cumpleFiltro === f.id ? "rgba(255,255,255,0.3)" : "rgba(217,72,239,0.15)",
                      color: cumpleFiltro === f.id ? "inherit" : "#9b1dc8",
                      fontSize: "10px", fontWeight: 700,
                      padding: "1px 5px", borderRadius: 8,
                    }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card services-panel">
            <div className="services-panel__header">
              <div>
                <h2 className="card-title">
                  {cumpleFiltro === "hoy" && "Cumpleaños de hoy"}
                  {cumpleFiltro === "semana" && "Cumpleaños esta semana"}
                  {cumpleFiltro === "mes" && "Cumpleaños este mes"}
                </h2>
                <p className="card-subtitle">
                  {petsWithBirthday.length === 0
                    ? "No hay mascotas con fecha de nacimiento cargada."
                    : cumpleFiltro === "semana"
                    ? "Escribiles para felicitarlos y ofrecé turno con descuento."
                    : `${todayBirthdays.length} hoy · ${weekBirthdays.length} esta semana · ${monthBirthdays.length} este mes`}
                </p>
              </div>
            </div>

            {/* HOY */}
            {(cumpleFiltro === "hoy" || cumpleFiltro === "semana") && (
              <div style={{ marginBottom: cumpleFiltro === "semana" && weekBirthdays.length > 0 ? 24 : 0 }}>
                {cumpleFiltro === "semana" && todayBirthdays.length > 0 && (
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                    HOY
                  </div>
                )}
                {todayBirthdays.length === 0 && cumpleFiltro === "hoy" ? (
                  <div className="services-empty">🎂 Ninguna mascota cumple años hoy</div>
                ) : (
                  todayBirthdays.map((pet) => (
                    <BirthdayCard
                      key={pet.id}
                      pet={pet}
                      enviado={estaEnviado(pet.id, "cumple")}
                      highlight
                      onOpenModal={abrirModalCumple}
                    />
                  ))
                )}
              </div>
            )}

            {/* ESTA SEMANA */}
            {(cumpleFiltro === "semana") && (
              <div style={{ marginBottom: 8 }}>
                {todayBirthdays.length > 0 && (
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                    PRÓXIMOS 7 DÍAS
                  </div>
                )}
                {weekBirthdays.length === 0 && todayBirthdays.length === 0 ? (
                  <div className="services-empty">🎂 Ninguna mascota cumple años esta semana</div>
                ) : weekBirthdays.length === 0 && todayBirthdays.length > 0 ? null : (
                  weekBirthdays.map((pet) => (
                    <BirthdayCard
                      key={pet.id}
                      pet={pet}
                      enviado={estaEnviado(pet.id, "cumple")}
                      onOpenModal={abrirModalCumple}
                    />
                  ))
                )}
              </div>
            )}

            {/* ESTE MES */}
            {cumpleFiltro === "mes" && (
              <div>
                {todayBirthdays.map((pet) => (
                  <BirthdayCard key={pet.id} pet={pet} enviado={estaEnviado(pet.id, "cumple")} highlight onOpenModal={abrirModalCumple} />
                ))}
                {weekBirthdays.map((pet) => (
                  <BirthdayCard key={pet.id} pet={pet} enviado={estaEnviado(pet.id, "cumple")} onOpenModal={abrirModalCumple} />
                ))}
                {monthBirthdays.map((pet) => (
                  <BirthdayCard key={pet.id} pet={pet} enviado={estaEnviado(pet.id, "cumple")} onOpenModal={abrirModalCumple} />
                ))}
                {todayBirthdays.length === 0 && weekBirthdays.length === 0 && monthBirthdays.length === 0 && (
                  <div className="services-empty">🎂 Ninguna mascota cumple años este mes</div>
                )}
              </div>
            )}

            {petsWithBirthday.length === 0 && (
              <div className="services-empty">
                Cargá la fecha de nacimiento de las mascotas desde la sección Mascotas para ver cumpleaños aquí.
              </div>
            )}
          </div>

          {/* Sección: Ya contactados (cumpleaños) */}
          {mensajesEnviados.filter((m) => m.type === "cumple").length > 0 && (
            <div className="card services-panel" style={{ marginTop: 16 }}>
              <div className="services-panel__header">
                <div>
                  <h2 className="card-title">Ya contactados</h2>
                  <p className="card-subtitle">Mascotas que recibieron felicitación de cumpleaños.</p>
                </div>
              </div>
              <div className="services-list">
                {mensajesEnviados
                  .filter((m) => m.type === "cumple")
                  .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))
                  .map((m) => (
                    <div key={`${m.petId}_cumple`} className="service-item recordatorio-item" style={{ opacity: 0.55 }}>
                      <div>
                        <div className="service-item__title">{m.petName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>{m.ownerName || "-"}</div>
                      </div>
                      <div className="recordatorio-item__date">{formatFecha(m.sentAt)}</div>
                      <div />
                      <div />
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
                          onClick={() => resetearEnviado(m.petId, "cumple")}
                        >
                          Resetear
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Todos ── */}
      {activeTab === "todos" && (
        <div className="card services-panel">
          <div className="services-panel__header">
            <div>
              <h2 className="card-title">Todos los avisos</h2>
              <p className="card-subtitle">{todosItems.length} items ordenados por prioridad</p>
            </div>
          </div>
          <div className="services-list">
            {loading ? (
              <div className="services-skeleton">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="service-item service-item--skeleton">
                    <div className="service-item__body">
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : todosItems.length === 0 ? (
              <div className="services-empty">No hay avisos pendientes. ¡Todo al día!</div>
            ) : (
              todosPaginados.map((item) => {
                if (item.type === "cumple-hoy" || item.type === "cumple-semana") {
                  const pet = item.pet;
                  const edad = calcularEdad(pet.birth_date);
                  const yaEnviado = estaEnviado(pet.id, "cumple");
                  return (
                    <div
                      key={item.key}
                      className="service-item recordatorio-item"
                      style={{ opacity: yaEnviado ? 0.45 : 1, transition: "opacity 0.3s", cursor: "pointer" }}
                      onClick={() => !yaEnviado && abrirModalCumple(pet)}
                    >
                      <div>
                        <div className="service-item__title">{pet.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>{pet.owner_name || "-"}</div>
                      </div>
                      <div className="recordatorio-item__date">
                        {pet.birth_date?.split("T")[0].split("-").slice(1).reverse().join("/")}
                      </div>
                      <div className="recordatorio-item__days">
                        <span className="service-badge" style={{ background: "rgba(217,72,239,0.12)", color: "#9b1dc8" }}>
                          {item.type === "cumple-hoy" ? "🎂 Hoy" : "🎂 Esta semana"}
                        </span>
                      </div>
                      <div className="recordatorio-item__phone">
                        {pet.owner_phone || <span style={{ color: "#b91c1c" }}>Sin tel.</span>}
                      </div>
                      <div className="recordatorio-item__action">
                        {yaEnviado ? (
                          <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{
                              background: "linear-gradient(135deg, #25D366, #128C7E)",
                              boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
                              fontSize: 13, padding: "8px 18px", borderRadius: 999, fontWeight: 600,
                            }}
                            onClick={(e) => { e.stopPropagation(); abrirModalCumple(pet); }}
                          >
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                // turno item
                const turno = item.turno;
                const { petId, petName, ownerName, ownerPhone } = getPetInfo(turno);
                const yaEnviado = estaEnviado(petId, "turno");
                const badgeLabel = item.type === "turno-60" ? "📅 +60d" : "📅 +30d";
                const badgeStyle = item.type === "turno-60"
                  ? { background: "#d9770618", color: "#d97706" }
                  : { background: "var(--color-primary-light)", color: "var(--color-primary)" };
                return (
                  <div
                    key={item.key}
                    className="service-item recordatorio-item"
                    style={{ opacity: yaEnviado ? 0.45 : 1, transition: "opacity 0.3s", cursor: "pointer" }}
                    onClick={() => !yaEnviado && abrirModalTurno(turno)}
                  >
                    <div>
                      <div className="service-item__title">{petName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>{ownerName}</div>
                    </div>
                    <div className="recordatorio-item__date">{formatFecha(turno.date)}</div>
                    <div className="recordatorio-item__days">
                      <span className="service-badge" style={badgeStyle}>{badgeLabel}</span>
                    </div>
                    <div className="recordatorio-item__phone">
                      {ownerPhone || <span style={{ color: "#b91c1c" }}>Sin tel.</span>}
                    </div>
                    <div className="recordatorio-item__action">
                      {yaEnviado ? (
                        <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{
                            background: "linear-gradient(135deg, #25D366, #128C7E)",
                            boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
                            fontSize: 13, padding: "8px 18px", borderRadius: 999, fontWeight: 600,
                          }}
                          onClick={(e) => { e.stopPropagation(); abrirModalTurno(turno); }}
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {todosTotalPages > 1 && (
            <div className="pets-pagination">
              <button type="button" className="pets-pagination__btn" onClick={() => setPageTodos((p) => Math.max(1, p - 1))} disabled={pageTodos === 1}>← Anterior</button>
              <div className="pets-pagination__pages">
                {pageNumbers(pageTodos, todosTotalPages).map((n, i) =>
                  n === "…" ? <span key={`e-${i}`} className="pets-pagination__ellipsis">…</span> : (
                    <button key={n} type="button" className={`pets-pagination__btn pets-pagination__btn--page${pageTodos === n ? " is-active" : ""}`} onClick={() => setPageTodos(n)}>{n}</button>
                  )
                )}
              </div>
              <button type="button" className="pets-pagination__btn" onClick={() => setPageTodos((p) => Math.min(todosTotalPages, p + 1))} disabled={pageTodos === todosTotalPages}>Siguiente →</button>
            </div>
          )}
        </div>
      )}

      {/* ── WhatsApp Modal (shared) ── */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={cerrarModal}
        title={`Mensaje para ${selected?.petName ?? ""}`}
      >
        {selected && (
          <>
            <p style={{ fontSize: 13, color: "var(--color-text-soft)", marginBottom: 12 }}>
              Para {selected.ownerName} · Tel:{" "}
              {selected.ownerPhone || <span style={{ color: "#b91c1c" }}>Sin teléfono</span>}
            </p>
            <textarea
              value={mensajeEdit}
              onChange={(e) => setMensajeEdit(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid var(--color-border-soft)",
                fontSize: 14,
                lineHeight: 1.5,
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 16,
                background: "var(--color-surface-strong)",
                color: "var(--color-text)",
              }}
            />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(mensajeEdit).catch(() => {});
                  setCopiadoModal(true);
                  setTimeout(() => setCopiadoModal(false), 2000);
                }}
              >
                {copiadoModal ? "✓ Copiado" : "Copiar mensaje"}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "#25D366", boxShadow: "0 6px 16px rgba(37,211,102,0.35)" }}
                onClick={() => {
                  const petId = selected.type === "turno"
                    ? (selected.turno.pet_id ?? selected.turno.pet?.id)
                    : selected.petId;
                  abrirWhatsApp(selected.ownerPhone, mensajeEdit);
                  marcarEnviado(petId, selected.type, selected.petName, selected.ownerName);
                  cerrarModal();
                }}
              >
                Abrir WhatsApp
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function BirthdayCard({ pet, enviado, highlight, onOpenModal }) {
  const edad = calcularEdad(pet.birth_date);
  return (
    <div
      className="service-item recordatorio-item"
      style={{
        opacity: enviado ? 0.45 : 1,
        transition: "opacity 0.3s",
        cursor: enviado ? "default" : "pointer",
        background: highlight ? "rgba(217,72,239,0.06)" : undefined,
      }}
      onClick={() => !enviado && onOpenModal(pet)}
    >
      <div>
        <div className="service-item__title">{pet.name}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--color-text-soft)", marginTop: 2 }}>
          {pet.owner_name || "-"}
          {edad !== null && ` · ${edad} años`}
        </div>
      </div>
      <div className="recordatorio-item__date">
        {pet.birth_date?.split("T")[0].split("-").slice(1).reverse().join("/")}
      </div>
      <div className="recordatorio-item__days">
        <span className="service-badge" style={{ background: "rgba(217,72,239,0.12)", color: "#9b1dc8" }}>
          🎂
        </span>
      </div>
      <div className="recordatorio-item__phone">
        {pet.owner_phone || <span style={{ color: "#b91c1c" }}>Sin tel.</span>}
      </div>
      <div className="recordatorio-item__action">
        {enviado ? (
          <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>✓ Enviado</span>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
              fontSize: 13,
              padding: "8px 18px",
              borderRadius: 999,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
            onClick={(e) => { e.stopPropagation(); onOpenModal(pet); }}
          >
            WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
