// src/pages/services/ServiceFormPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServices } from "../../context/ServicesContext";

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const { addService } = useServices();

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), // "2025-11-21"
    perro: "",
    dueno: "",
    servicio: "Baño",
    precio: "",
    metodoPago: "Efectivo",
    groomer: "",
    notas: "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload = {
      action: "create",
      Fecha: form.fecha, // Apps Script la formatea
      Perro: form.perro,
      Dueño: form.dueno,
      Servicio: form.servicio,
      Precio: form.precio,
      "Método de pago": form.metodoPago,
      Groomer: form.groomer,
      Notas: form.notas,
    };

    try {
      console.log("[ServiceFormPage] Enviando payload ->", payload);
      await addService(payload);
      navigate("/services");
    } catch (err) {
      console.error("[ServiceFormPage] Error al guardar servicio:", err);
      setErrorMsg(err.message || "Ocurrió un error al guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Nuevo servicio</h1>
          <p className="page-subtitle">
            Cargá un baño, corte o servicio completo para Bandidos.
          </p>
        </div>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        {/* fila 1 */}
        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Nombre del perro</label>
            <input
              type="text"
              name="perro"
              value={form.perro}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Dueño</label>
            <input
              type="text"
              name="dueno"
              value={form.dueno}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* fila 2 */}
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de servicio</label>
            <select
              name="servicio"
              value={form.servicio}
              onChange={handleChange}
            >
              <option value="Baño">Baño</option>
              <option value="Corte">Corte</option>
              <option value="Baño + corte">Baño + corte</option>
              <option value="Completo">Completo</option>
            </select>
          </div>

          <div className="form-group">
            <label>Precio (ARS)</label>
            <input
              type="number"
              name="precio"
              value={form.precio}
              onChange={handleChange}
              min={0}
              step={100}
              required
            />
          </div>

          <div className="form-group">
            <label>Método de pago</label>
            <select
              name="metodoPago"
              value={form.metodoPago}
              onChange={handleChange}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Débito">Débito</option>
            </select>
          </div>
        </div>

        {/* fila 3 */}
        <div className="form-row">
          <div className="form-group">
            <label>Groomer</label>
            <input
              type="text"
              name="groomer"
              value={form.groomer}
              onChange={handleChange}
            />
          </div>

          <div className="form-group form-group--full">
            <label>Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        {errorMsg && <p className="form-error">{errorMsg}</p>}

        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar servicio"}
        </button>
      </form>
    </div>
  );
}