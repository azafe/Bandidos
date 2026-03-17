// src/pages/reminders/RecordatoriosPage.jsx
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

const DAYS_RANGE = 180;
const LS_KEY = "bandidos_vio_recordatorios";

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
  const [copiado, setCopiado] = useState({});
  const [copiadoModal, setCopiadoModal] = useState(false);
  const [seleccionados, setSeleccionados] = useState({});

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
    // Try embedded first, then join from pets list
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

  const todosSeleccionados =
    pendientes.length > 0 &&
    pendientes.every((r) => seleccionados[r.pet_id ?? r.pet?.id]);

  function toggleSeleccionarTodos() {
    if (todosSeleccionados) {
      setSeleccionados({});
    } else {
      const all = {};
      pendientes.forEach((r) => { all[r.pet_id ?? r.pet?.id] = true; });
      setSeleccionados(all);
    }
  }

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

  function copiarFila(turno) {
    const { petId, petName, ownerName } = getPetInfo(turno);
    const msg = buildMensaje(ownerName, petName, turno.dias);
    navigator.clipboard.writeText(msg).catch(() => {});
    setCopiado((prev) => ({ ...prev, [petId]: true }));
    setTimeout(() => setCopiado((prev) => ({ ...prev, [petId]: false })), 2000);
  }

  function abrirWhatsApp(phone, mensaje, petId) {
    const tel = limpiarTelefono(phone);
    if (!tel) {
      alert("Este cliente no tiene teléfono cargado.");
      return;
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    marcarEnviado(petId);
  }

  function enviarATodos() {
    if (pendientes.length === 0) return;
    pendientes.forEach((r) => {
      const { petId, petName, ownerName, ownerPhone } = getPetInfo(r);
      const tel = limpiarTelefono(ownerPhone);
      if (!tel) return;
      const msg = buildMensaje(ownerName, petName, r.dias);
      window.open(
        `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer"
      );
      marcarEnviado(petId);
    });
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
        <button
          type="button"
          className="btn-primary"
          style={{ background: "#25D366", borderColor: "#25D366" }}
          onClick={enviarATodos}
          disabled={pendientes.length === 0}
        >
          Enviar a todos ({pendientes.length})
        </button>
      </header>

      {error && (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          className="card"
          style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}
        >
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            Pendientes
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: pendientes.length > 0 ? "#b91c1c" : undefined,
            }}
          >
            {loading ? "…" : pendientes.length}
          </div>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}
        >
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            Enviados hoy
          </div>
          <div
            style={{ fontSize: 28, fontWeight: 700, color: "#15803d" }}
          >
            {enviadosHoy}
          </div>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "16px 12px" }}
        >
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            Días promedio
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {loading ? "…" : diasPromedio}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
            Cargando turnos…
          </div>
        ) : recordatorios.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "#6b7280",
              fontSize: 15,
            }}
          >
            Ningún cliente lleva más de {diasMin} días sin turno. ¡Todo al día!
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th style={{ padding: "10px 12px", textAlign: "left", width: 36 }}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleSeleccionarTodos}
                    />
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>
                    Mascota / Dueño
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>
                    Último turno
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>
                    Días
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>
                    Teléfono
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {recordatorios.map((turno) => {
                  const { petId, petName, ownerName, ownerPhone } =
                    getPetInfo(turno);
                  const yaEnviado = Boolean(enviados[petId]);
                  const diasColor =
                    turno.dias >= 60
                      ? "#b91c1c"
                      : turno.dias >= 30
                      ? "#d97706"
                      : undefined;

                  return (
                    <tr
                      key={petId ?? turno.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        opacity: yaEnviado ? 0.45 : 1,
                        transition: "opacity 0.3s",
                      }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="checkbox"
                          disabled={yaEnviado}
                          checked={Boolean(seleccionados[petId])}
                          onChange={(e) =>
                            setSeleccionados((prev) => ({
                              ...prev,
                              [petId]: e.target.checked,
                            }))
                          }
                        />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{petName}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          {ownerName}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        {formatFecha(turno.date)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            background: diasColor
                              ? diasColor + "1a"
                              : "#f3f4f6",
                            color: diasColor ?? "#374151",
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: 12,
                            fontSize: 13,
                          }}
                        >
                          {turno.dias}d
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        {ownerPhone || (
                          <span style={{ color: "#9ca3af" }}>Sin teléfono</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {yaEnviado ? (
                          <span
                            style={{ color: "#15803d", fontWeight: 600, fontSize: 13 }}
                          >
                            ✓ Enviado
                          </span>
                        ) : (
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: "4px 10px" }}
                              onClick={() => copiarFila(turno)}
                            >
                              {copiado[petId] ? "✓ Copiado" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{
                                fontSize: 12,
                                padding: "4px 10px",
                                background: "#25D366",
                                borderColor: "#25D366",
                              }}
                              onClick={() => abrirModal(turno)}
                            >
                              WhatsApp
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal WhatsApp */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={cerrarModal}
        title={`Mensaje para ${selected?.petName ?? ""}`}
      >
        {selected && (
          <>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
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
                border: "1px solid #d1d5db",
                fontSize: 14,
                lineHeight: 1.5,
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={cerrarModal}
              >
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
                style={{ background: "#25D366", borderColor: "#25D366" }}
                onClick={() => {
                  const petId =
                    selected.turno.pet_id ?? selected.turno.pet?.id;
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
