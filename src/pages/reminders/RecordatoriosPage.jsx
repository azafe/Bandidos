// src/pages/reminders/RecordatoriosPage.jsx
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const DAYS_RANGE = 180;

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

const buildMensaje = (nombreDuenio, nombreMascota, dias) =>
  `Hola ${nombreDuenio.split(" ")[0]}! 🐾 Hace ${dias} días que ${nombreMascota} no visita Bandidos Peluquería. ¿Querés reservar un turno? Escribinos y coordinamos! 😊`;

const limpiarTelefono = (tel) => {
  if (!tel) return "";
  const limpio = String(tel).replace(/[\s\-\(\)\+]/g, "");
  return limpio.startsWith("549") ? limpio : `549${limpio}`;
};

export default function RecordatoriosPage() {
  const [diasMin, setDiasMin] = useState(30);
  const [enviados, setEnviados] = useState({});
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mensajeEdit, setMensajeEdit] = useState("");
  const [copiadoModal, setCopiadoModal] = useState(false);

  const { items: pets } = useApiResource("/v2/pets");

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

  const pendientes = recordatorios.filter(
    (r) => !enviados[r.pet_id ?? r.pet?.id]
  );
  const enviadosHoy = Object.keys(enviados).length;
  const diasPromedio = recordatorios.length
    ? Math.round(
        recordatorios.reduce((s, r) => s + r.dias, 0) / recordatorios.length
      )
    : 0;

  function abrirModal(turno) {
    const { petName, ownerName, ownerPhone } = getPetInfo(turno);
    setSelected({ turno, petName, ownerName, ownerPhone });
    setMensajeEdit(buildMensaje(ownerName, petName, turno.dias));
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
    marcarEnviado(petId);
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Recordatorios de Turno</h1>
          <p className="page-subtitle">
            Clientes que llevan más de{" "}
            <input
              type="number"
              min={1}
              max={365}
              value={diasMin}
              onChange={(e) => setDiasMin(Number(e.target.value) || 1)}
              style={{
                width: 52,
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontWeight: 600,
                textAlign: "center",
                display: "inline-block",
                margin: "0 4px",
              }}
            />{" "}
            días sin turno.
          </p>
        </div>
      </header>

      {error && (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-soft)", marginBottom: 4 }}>
            Pendientes
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: pendientes.length > 0 ? "#b91c1c" : undefined }}>
            {loading ? "…" : pendientes.length}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-soft)", marginBottom: 4 }}>
            Enviados hoy
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#15803d" }}>
            {enviadosHoy}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-soft)", marginBottom: 4 }}>
            Días promedio
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {loading ? "…" : diasPromedio}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card services-panel">
        <div className="services-panel__header">
          <div>
            <h2 className="card-title">Clientes sin turno reciente</h2>
            <p className="card-subtitle">
              {loading
                ? "Cargando turnos…"
                : `${recordatorios.length} mascota${recordatorios.length !== 1 ? "s" : ""} sin turno en los últimos ${diasMin} días.`}
            </p>
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
              const diasColor =
                turno.dias >= 60 ? "#b91c1c" : turno.dias >= 30 ? "#d97706" : undefined;

              return (
                <div
                  key={petId ?? turno.id}
                  className="service-item"
                  style={{ opacity: yaEnviado ? 0.45 : 1, transition: "opacity 0.3s" }}
                  onClick={() => !yaEnviado && abrirModal(turno)}
                >
                  <div className="service-item__body">
                    <div className="service-item__title">{petName}</div>
                    <div className="service-item__meta">
                      <span>{ownerName}</span>
                      <span>Último turno: {formatFecha(turno.date)}</span>
                      <span>{ownerPhone || "Sin teléfono"}</span>
                    </div>
                    <div className="service-item__badges">
                      <span
                        className="service-badge"
                        style={
                          diasColor
                            ? { background: diasColor + "18", color: diasColor }
                            : undefined
                        }
                      >
                        {turno.dias} días sin turno
                      </span>
                    </div>
                  </div>
                  <div className="service-item__side">
                    {yaEnviado ? (
                      <span style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}>
                        ✓ Enviado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          background: "#25D366",
                          boxShadow: "0 6px 16px rgba(37,211,102,0.35)",
                          fontSize: 13,
                          padding: "8px 14px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModal(turno);
                        }}
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

      {/* Modal WhatsApp */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={cerrarModal}
        title={`Mensaje para ${selected?.petName ?? ""}`}
      >
        {selected && (
          <>
            <p style={{ fontSize: 13, color: "var(--color-text-soft)", marginBottom: 12 }}>
              Para {selected.ownerName} · Tel:{" "}
              {selected.ownerPhone || (
                <span style={{ color: "#b91c1c" }}>Sin teléfono</span>
              )}
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
                  const petId = selected.turno.pet_id ?? selected.turno.pet?.id;
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
