import { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import {
  getTrasladoConfig,
  saveTrasladoConfig,
} from "../../services/trasladosApi";
import "../../styles/traslados.css";

const emptyConfig = {
  modelo_pago: "",
  valor_pago: "",
  costo_referencia: "",
  unidad_referencia: "",
};
function Catalog({ title, path, vehicle = false }) {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource(path);
  const initial = {
    nombre: "",
    patente: "",
    propietario: "",
    tarifa: "",
    activo: true,
  };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const change = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const payload = vehicle
      ? {
          nombre: form.nombre.trim(),
          patente: form.patente.trim(),
          propietario: form.propietario.trim() || null,
          activo: form.activo,
        }
      : {
          nombre: form.nombre.trim(),
          tarifa: form.tarifa === "" ? null : Number(form.tarifa),
          activo: form.activo,
        };
    try {
      if (editing) await updateItem(editing, payload);
      else await createItem(payload);
      setForm(initial);
      setEditing(null);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function toggle(item) {
    setSaving(true);
    setSaveError("");
    try {
      if (item.activo) await deleteItem(item.id);
      else await updateItem(item.id, { activo: true });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="card" aria-label={title}>
      <h2>{title}</h2>
      {(error || saveError) && (
        <p role="alert" className="traslados-error">
          {saveError || error}
        </p>
      )}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="traslados-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>{vehicle ? "Patente" : "Tarifa sugerida"}</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td>{v.nombre}</td>
                  <td>
                    {vehicle
                      ? v.patente
                      : v.tarifa == null
                        ? "Sin definir"
                        : `$${Number(v.tarifa).toLocaleString("es-AR")}`}
                  </td>
                  <td>{v.activo ? "Activo" : "Inactivo"}</td>
                  <td>
                    <div className="traslados-actions">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setEditing(v.id);
                          setForm({
                            ...initial,
                            ...v,
                            propietario: v.propietario || "",
                            tarifa: v.tarifa ?? "",
                          });
                        }}
                      >
                        Editar {v.nombre}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => toggle(v)}
                      >
                        {v.activo ? "Desactivar" : "Activar"} {v.nombre}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p>Todavía no hay registros.</p>}
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset className="traslados-tramo" disabled={saving}>
          <legend>{editing ? "Editar registro" : "Nuevo registro"}</legend>
          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input
                required
                maxLength={100}
                value={form.nombre}
                onChange={change("nombre")}
              />
            </label>
            {vehicle ? (
              <>
                <label className="form-field">
                  <span>Patente</span>
                  <input
                    required
                    maxLength={20}
                    value={form.patente}
                    onChange={change("patente")}
                  />
                </label>
                <label className="form-field">
                  <span>Propietario (opcional)</span>
                  <input
                    value={form.propietario}
                    onChange={change("propietario")}
                  />
                </label>
              </>
            ) : (
              <label className="form-field">
                <span>Tarifa sugerida (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tarifa}
                  onChange={change("tarifa")}
                />
              </label>
            )}
          </div>
          <p className="agenda-helper">
            {vehicle
              ? "Desactivar conserva el historial del móvil."
              : "Elegir una zona no cambia el precio acordado. No se aplican tarifas automáticamente."}
          </p>
          <div className="traslados-actions">
            <button type="submit" className="btn-primary">
              {saving
                ? "Guardando..."
                : vehicle
                  ? "Guardar vehículo"
                  : "Guardar zona"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(initial);
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
export default function TrasladosSettingsPage() {
  const [config, setConfig] = useState(emptyConfig);
  const [version, setVersion] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getTrasladoConfig()
      .then((v) => {
        if (active) {
          if (v) {
            setConfig(
              Object.fromEntries(
                Object.entries(emptyConfig).map(([k]) => [k, v[k] ?? ""]),
              ),
            );
            setVersion(v.version);
          }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoadFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const change = (key) => (e) => {
    setMessage("");
    setConfig((prev) => ({
      ...prev,
      [key]: e.target.value,
      ...(key === "modelo_pago"
        ? { valor_pago: e.target.value === "ninguno" ? "0" : "" }
        : {}),
    }));
  };
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveTrasladoConfig({
        modelo_pago: config.modelo_pago || null,
        valor_pago: config.valor_pago === "" ? null : Number(config.valor_pago),
        costo_referencia:
          config.costo_referencia === ""
            ? null
            : Number(config.costo_referencia),
        unidad_referencia: config.unidad_referencia || null,
      });
      setVersion(saved.version);
      setMessage(
        "Configuración guardada. Los traslados anteriores conservan sus condiciones.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page-content traslados-settings">
      <header className="page-header">
        <div>
          <h1>Bandimóviles · Configuración</h1>
          <p>Vehículos, zonas y condiciones de los traslados del local.</p>
        </div>
      </header>
      <Catalog title="Vehículos" path="/v2/vehiculos" vehicle />
      <Catalog title="Zonas" path="/v2/traslado-zonas" />
      <section className="card" aria-label="Pago a choferes">
        <h2>Pago y costo de referencia</h2>
        <p>
          {version
            ? `Configuración vigente · versión ${version}`
            : "Sin configuración: los costos siguen pendientes de definir."}
        </p>
        {error && (
          <p role="alert" className="traslados-error">
            {error}
            {loadFailed && (
              <button type="button" onClick={() => window.location.reload()}>
                Volver a cargar configuración
              </button>
            )}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {loading ? (
          <p>Cargando condiciones...</p>
        ) : (
          <form onSubmit={save}>
            <fieldset
              className="traslados-tramo"
              disabled={saving || loadFailed}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>Modelo de pago al chofer</span>
                  <select
                    value={config.modelo_pago}
                    onChange={change("modelo_pago")}
                  >
                    <option value="">Sin definir</option>
                    <option value="ninguno">Ninguno</option>
                    <option value="porcentaje">Porcentaje</option>
                    <option value="jornal">Jornal</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>
                    {config.modelo_pago === "porcentaje"
                      ? "Porcentaje (%)"
                      : "Valor del jornal ($)"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={config.modelo_pago === "porcentaje" ? 100 : undefined}
                    value={config.valor_pago}
                    disabled={
                      !config.modelo_pago || config.modelo_pago === "ninguno"
                    }
                    required={
                      !!config.modelo_pago && config.modelo_pago !== "ninguno"
                    }
                    onChange={change("valor_pago")}
                  />
                </label>
                <label className="form-field">
                  <span>Costo de chofer de referencia ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.costo_referencia}
                    onChange={change("costo_referencia")}
                  />
                </label>
                <label className="form-field">
                  <span>Unidad del costo de referencia</span>
                  <select
                    value={config.unidad_referencia}
                    onChange={change("unidad_referencia")}
                  >
                    <option value="">Sin definir</option>
                    <option value="dia">Por día</option>
                    <option value="traslado">Por traslado completo</option>
                  </select>
                </label>
              </div>
              <p className="agenda-helper">
                Un campo sin definir no equivale a costo cero. Estas condiciones
                quedan asociadas a los traslados nuevos; cambiar la
                configuración no recalcula los anteriores.
              </p>
              <button type="submit" className="btn-primary">
                {saving ? "Guardando..." : "Guardar condiciones"}
              </button>
            </fieldset>
          </form>
        )}
      </section>
    </div>
  );
}
