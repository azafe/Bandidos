import { useCallback, useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import {
  getTrasladoSolicitud,
  registrarCobroTraslado,
  saveTrasladoSolicitud,
} from "../../services/trasladosApi";
import { solicitudPayload } from "../../lib/traslados";
import { todayISO } from "../../utils/dates";
import TrasladoFields from "../agenda/TrasladoFields";
import TramosFields from "./TramosFields";
import TrasladoHistoricoDetalle from "./TrasladoHistoricoDetalle";

const fmt = (v) =>
  `$${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
export default function TurnoTrasladoPanel({ turno, onSaved, onLoaded }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [cobro, setCobro] = useState({
    fecha: todayISO(),
    cobrado_por: "",
    chofer_id: "",
    payment_method_id: "",
  });
  const methods = useApiResource("/v2/payment-methods");
  const employees = useApiResource("/v2/employees");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTrasladoSolicitud(turno.id);
      setRecord(data);
      onLoaded(data, turno.id);
    } catch (e) {
      setError(e.message || "No se pudo consultar el traslado.");
    } finally {
      setLoading(false);
    }
  }, [turno.id, onLoaded]);
  useEffect(() => {
    let active = true;
    getTrasladoSolicitud(turno.id)
      .then((data) => {
        if (active) {
          setRecord(data);
          onLoaded(data, turno.id);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [turno.id, turno.traslado_amount, turno.traslado_bonificado, onLoaded]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await saveTrasladoSolicitud(
        record.id,
        solicitudPayload(draft, draft.tramos, turno.date.slice(0, 10)),
      );
      setRecord(saved);
      setEditing(false);
      await onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function collect(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const paid = await registrarCobroTraslado(record.id, {
        ...cobro,
        chofer_id: cobro.cobrado_por === "chofer" ? cobro.chofer_id : null,
      });
      setRecord((prev) => ({ ...prev, cobro: paid }));
      setCollecting(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="agenda-turno-modal__panel traslados-panel"
      aria-label="Detalle del traslado"
    >
      <h4>Traslado · precio único ida y vuelta</h4>
      {error && (
        <p role="alert" className="traslados-error">
          {error}{" "}
          <button type="button" onClick={load} disabled={saving}>
            Reintentar consulta
          </button>
        </p>
      )}
      {loading ? (
        <p>Cargando detalle del traslado...</p>
      ) : !record ? (
        !error && (
          <p>
            Registro anterior: se conserva el monto del turno. El detalle de
            tramos, chofer y móvil no está registrado.
          </p>
        )
      ) : record.origen === "historico" ? (
        <TrasladoHistoricoDetalle historico={record.historico} />
      ) : (
        <>
          <p>
            <strong>
              {record.cancelado
                ? "Cancelado"
                : record.bonificado
                  ? "Bonificado"
                  : record.precio_total == null
                    ? "Precio pendiente"
                    : fmt(record.precio_total)}
            </strong>
          </p>
          <p>
            {record.cobro
              ? `Cobrado por ${record.cobro.cobrado_por === "local" ? "el local" : employees.items.find((e) => e.id === record.cobro.chofer_id)?.name || "chofer"} el ${record.cobro.fecha} · ${fmt(record.cobro.monto)}`
              : record.bonificado
                ? "Sin cargo: no hay un cobro a registrar."
                : "Cobro pendiente. Finalizar el turno no registra el pago."}
          </p>
          {record.tramos.map((t) => (
            <p key={t.id}>
              {t.tipo === "busqueda"
                ? "Búsqueda"
                : t.tipo === "entrega"
                  ? "Entrega"
                  : "Ida y vuelta"}{" "}
              · {t.estado.replaceAll("_", " ")} ·{" "}
              {t.direccion || "Dirección pendiente"}
              {t.hora_programada ? ` · ${t.hora_programada.slice(0, 5)}` : ""}
            </p>
          ))}
          {!record.cancelado && !editing && !collecting && (
            <div className="traslados-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setError("");
                  setDraft({
                    traslado_amount: record.precio_total ?? "",
                    traslado_bonificado: record.bonificado,
                    notas: record.notas,
                    tramos: record.tramos.filter(
                      (t) => t.estado !== "cancelado",
                    ),
                  });
                  setEditing(true);
                }}
              >
                Editar traslado
              </button>
              {!record.cobro &&
                !record.bonificado &&
                Number(record.precio_total) > 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setError("");
                      setCollecting(true);
                    }}
                  >
                    Registrar cobro
                  </button>
                )}
            </div>
          )}
          {editing && draft && (
            <form onSubmit={save}>
              <fieldset disabled={saving} className="traslados-tramo">
                <TrasladoFields
                  id="solicitud"
                  disabled={!!record.cobro}
                  value={draft}
                  onChange={(patch) =>
                    setDraft((prev) => ({ ...prev, ...patch }))
                  }
                />
                <TramosFields
                  value={draft.tramos}
                  onChange={(tramos) =>
                    setDraft((prev) => ({ ...prev, tramos }))
                  }
                  fecha={turno.date.slice(0, 10)}
                />
                <label className="form-field">
                  <span>Notas del traslado</span>
                  <textarea
                    value={draft.notas || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, notas: e.target.value }))
                    }
                  />
                </label>
                <div className="traslados-actions">
                  <button className="btn-primary" type="submit">
                    {saving ? "Guardando..." : "Guardar traslado"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar edición
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {collecting && (
            <form onSubmit={collect}>
              <fieldset className="traslados-tramo" disabled={saving}>
                <p>
                  Vas a registrar un único cobro de{" "}
                  <strong>{fmt(record.precio_total)}</strong> por todo el
                  traslado.
                </p>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Fecha del cobro</span>
                    <input
                      type="date"
                      required
                      value={cobro.fecha}
                      onChange={(e) =>
                        setCobro((prev) => ({ ...prev, fecha: e.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>¿Quién cobró?</span>
                    <select
                      required
                      value={cobro.cobrado_por}
                      onChange={(e) =>
                        setCobro((prev) => ({
                          ...prev,
                          cobrado_por: e.target.value,
                          chofer_id: "",
                        }))
                      }
                    >
                      <option value="">Elegí quién recibió el dinero</option>
                      <option value="chofer">Chofer (fuera de caja)</option>
                      <option value="local">Local (entra a caja)</option>
                    </select>
                  </label>
                  {cobro.cobrado_por === "chofer" && (
                    <label className="form-field">
                      <span>Chofer que cobró</span>
                      <select
                        required
                        value={cobro.chofer_id}
                        onChange={(e) =>
                          setCobro((prev) => ({
                            ...prev,
                            chofer_id: e.target.value,
                          }))
                        }
                      >
                        <option value="">Elegí el chofer</option>
                        {employees.items
                          .filter((e) => e.is_driver && e.status === "active")
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <label className="form-field">
                    <span>Medio de pago del traslado</span>
                    <select
                      required
                      value={cobro.payment_method_id}
                      onChange={(e) =>
                        setCobro((prev) => ({
                          ...prev,
                          payment_method_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Elegí el medio de pago</option>
                      {methods.items.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {(methods.error || employees.error) && (
                  <p role="alert">
                    No se pudieron cargar las opciones de cobro. Reabrí el
                    detalle para reintentar.
                  </p>
                )}
                <div className="traslados-actions">
                  <button className="btn-primary" type="submit">
                    {saving ? "Registrando..." : "Confirmar cobro"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => setCollecting(false)}
                  >
                    Cancelar registro
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </>
      )}
    </section>
  );
}
