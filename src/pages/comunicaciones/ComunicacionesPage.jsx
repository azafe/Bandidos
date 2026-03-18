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
  const [enviados, setEnviados] = useState({});
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

  function switchTab(tab) {
    setActiveTab(tab);
    localStorage.setItem(TAB_KEY, tab);
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

  const pendientes = recordatorios.filter((r) => !enviados[r.pet_id ?? r.pet?.id]);
  const enviadosHoy = Object.keys(enviados).length;
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

  function marcarEnviado(petId) {
    setEnviados((prev) => ({ ...prev, [petId]: true }));
  }

  function abrirWhatsApp(phone, mensaje, petId) {
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
    if (petId) marcarEnviado(petId);
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
                  onClick={() => setDiasMin(d)}
                >
                  {d} días
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={365}
                value={diasMin}
                onChange={(e) => setDiasMin(Number(e.target.value) || 1)}
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
                recordatorios.map((turno) => {
                  const { petId, petName, ownerName, ownerPhone } = getPetInfo(turno);
                  const yaEnviado = Boolean(enviados[petId]);
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
          </div>
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
                      enviado={Boolean(enviados[pet.id])}
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
                      enviado={Boolean(enviados[pet.id])}
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
                  <BirthdayCard key={pet.id} pet={pet} enviado={Boolean(enviados[pet.id])} highlight onOpenModal={abrirModalCumple} />
                ))}
                {weekBirthdays.map((pet) => (
                  <BirthdayCard key={pet.id} pet={pet} enviado={Boolean(enviados[pet.id])} onOpenModal={abrirModalCumple} />
                ))}
                {monthBirthdays.map((pet) => (
                  <BirthdayCard key={pet.id} pet={pet} enviado={Boolean(enviados[pet.id])} onOpenModal={abrirModalCumple} />
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
              todosItems.map((item) => {
                if (item.type === "cumple-hoy" || item.type === "cumple-semana") {
                  const pet = item.pet;
                  const edad = calcularEdad(pet.birth_date);
                  const yaEnviado = Boolean(enviados[pet.id]);
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
                const yaEnviado = Boolean(enviados[petId]);
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
                  abrirWhatsApp(selected.ownerPhone, mensajeEdit, petId);
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
