import { useApiResource } from "../../hooks/useApiResource";
import "../../styles/traslados.css";

const labels = { busqueda: "Búsqueda", entrega: "Entrega" };
const options = (items, selected, condition) =>
  items.filter((v) => v.id === selected || condition(v));
export default function TramosFields({
  value,
  onChange,
  fecha,
  disabled = false,
}) {
  const vehicles = useApiResource("/v2/vehiculos");
  const zones = useApiResource("/v2/traslado-zonas");
  const employees = useApiResource("/v2/employees");
  const patch = (tipo, changes) =>
    onChange(value.map((t) => (t.tipo === tipo ? { ...t, ...changes } : t)));
  return (
    <div className="traslados-tramos">
      <p className="agenda-helper">
        Un solo precio para todo el traslado. Elegí los tramos que necesitás;
        podés asignar chofer y móvil después.
      </p>
      {[vehicles.error, zones.error, employees.error].some(Boolean) && (
        <p role="alert">
          No se pudieron cargar todas las opciones de traslado. Reabrí el
          detalle para reintentar.
        </p>
      )}
      {["busqueda", "entrega"].map((tipo) => {
        const t = value.find((v) => v.tipo === tipo);
        return (
          <fieldset key={tipo} className="traslados-tramo" disabled={disabled}>
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={!!t}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [
                            ...value,
                            {
                              tipo,
                              estado: "pendiente",
                              fecha_programada: fecha,
                            },
                          ]
                        : value.filter((v) => v.tipo !== tipo),
                    )
                  }
                />{" "}
                {labels[tipo]}
              </label>
            </legend>
            {t && (
              <div className="form-grid">
                <label className="form-field">
                  <span>Dirección de {labels[tipo].toLowerCase()}</span>
                  <input
                    value={t.direccion || ""}
                    onChange={(e) => patch(tipo, { direccion: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Fecha de {labels[tipo].toLowerCase()}</span>
                  <input
                    type="date"
                    value={t.fecha_programada || fecha}
                    onChange={(e) =>
                      patch(tipo, { fecha_programada: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Hora de {labels[tipo].toLowerCase()}</span>
                  <input
                    type="time"
                    value={t.hora_programada?.slice(0, 5) || ""}
                    onChange={(e) =>
                      patch(tipo, { hora_programada: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Chofer de {labels[tipo].toLowerCase()}</span>
                  <select
                    value={t.chofer_id || ""}
                    onChange={(e) =>
                      patch(tipo, { chofer_id: e.target.value || null })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {options(
                      employees.items,
                      t.chofer_id,
                      (v) => v.is_driver && v.status === "active",
                    ).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {v.status !== "active" ? " (inactivo)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Móvil de {labels[tipo].toLowerCase()}</span>
                  <select
                    value={t.vehiculo_id || ""}
                    onChange={(e) =>
                      patch(tipo, { vehiculo_id: e.target.value || null })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {options(
                      vehicles.items,
                      t.vehiculo_id,
                      (v) => v.activo,
                    ).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                        {!v.activo ? " (inactivo)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Zona de {labels[tipo].toLowerCase()}</span>
                  <select
                    value={t.zona_id || ""}
                    onChange={(e) =>
                      patch(tipo, { zona_id: e.target.value || null })
                    }
                  >
                    <option value="">Sin zona</option>
                    {options(zones.items, t.zona_id, (v) => v.activo).map(
                      (v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                          {v.tarifa == null
                            ? ""
                            : ` · sugerido $${Number(v.tarifa).toLocaleString("es-AR")}`}
                          {!v.activo ? " (inactiva)" : ""}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
