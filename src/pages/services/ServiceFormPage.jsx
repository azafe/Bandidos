// src/pages/services/ServiceFormPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServices } from "../../context/ServicesContext";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // para <input type="date">
}

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const { addService, loading } = useServices();

  const [form, setForm] = useState({
    date: todayISO(),
    dogName: "",
    ownerName: "",
    type: "Baño + corte",
    price: "",
    paymentMethod: "Efectivo",
    groomer: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      date: form.date,
      dogName: form.dogName.trim(),
      ownerName: form.ownerName.trim(),
      type: form.type,
      price: Number(form.price || 0),
      paymentMethod: form.paymentMethod,
      groomer: form.groomer.trim(),
      notes: form.notes.trim(),
    };

    try {
      await addService(payload);
      alert("✅ Servicio guardado correctamente en Bandidos.");
      navigate("/services");
    } catch (err) {
      console.error("[ServiceFormPage] Error al guardar servicio:", err);
      alert(
        "❌ Ocurrió un error al guardar el servicio. Revisá la consola para más detalles."
      );
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

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          {/* Fecha */}
          <div className="form-group">
            <label htmlFor="date">Fecha</label>
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Nombre del perro */}
          <div className="form-group">
            <label htmlFor="dogName">Nombre del perro</label>
            <input
              id="dogName"
              name="dogName"
              type="text"
              placeholder="Ej: Luna"
              value={form.dogName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Dueño */}
          <div className="form-group">
            <label htmlFor="ownerName">Dueño</label>
            <input
              id="ownerName"
              name="ownerName"
              type="text"
              placeholder="Nombre del dueño"
              value={form.ownerName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Tipo de servicio */}
          <div className="form-group">
            <label htmlFor="type">Tipo de servicio</label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="Baño">Baño</option>
              <option value="Baño + corte">Baño + corte</option>
              <option value="Corte">Corte</option>
              <option value="Completo">Completo</option>
            </select>
          </div>

          {/* Precio */}
          <div className="form-group">
            <label htmlFor="price">Precio (ARS)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="100"
              placeholder="Ej: 8500"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>

          {/* Método de pago */}
          <div className="form-group">
            <label htmlFor="paymentMethod">Método de pago</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Débito automático">Débito automático</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>

          {/* Groomer */}
          <div className="form-group">
            <label htmlFor="groomer">Groomer</label>
            <input
              id="groomer"
              name="groomer"
              type="text"
              placeholder="Quién atendió"
              value={form.groomer}
              onChange={handleChange}
            />
          </div>

          {/* Notas */}
          <div className="form-group form-group--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Observaciones del perro o del servicio..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions form-group--full">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}