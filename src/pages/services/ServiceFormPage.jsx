// src/pages/services/ServiceFormPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    dogName: "",
    ownerName: "",
    breed: "",
    serviceType: "BAÑO_CORTE",
    price: "",
    paymentMethod: "EFECTIVO",
    groomer: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Nuevo servicio:", form);
    alert("Servicio guardado (por ahora solo en consola).");
    navigate("/services");
  }

  function handleCancel() {
    navigate("/services");
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

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="date">Fecha</label>
            <input
              id="date"
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="dogName">Nombre del perro</label>
            <input
              id="dogName"
              type="text"
              name="dogName"
              value={form.dogName}
              onChange={handleChange}
              placeholder="Ej: Luna"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="ownerName">Dueño</label>
            <input
              id="ownerName"
              type="text"
              name="ownerName"
              value={form.ownerName}
              onChange={handleChange}
              placeholder="Nombre del dueño"
            />
          </div>

          <div className="form-field">
            <label htmlFor="breed">Raza</label>
            <input
              id="breed"
              type="text"
              name="breed"
              value={form.breed}
              onChange={handleChange}
              placeholder="Ej: Schnauzer"
            />
          </div>

          <div className="form-field">
            <label htmlFor="serviceType">Tipo de servicio</label>
            <select
              id="serviceType"
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
            >
              <option value="BAÑO">Baño</option>
              <option value="CORTE">Corte</option>
              <option value="BAÑO_CORTE">Baño + corte</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="price">Precio (ARS)</label>
            <input
              id="price"
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              min="0"
              step="100"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="paymentMethod">Método de pago</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
              <option value="MP">Mercado Pago</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="groomer">Groomer</label>
            <input
              id="groomer"
              type="text"
              name="groomer"
              value={form.groomer}
              onChange={handleChange}
              placeholder="Quien atendió"
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: 12 }}>
          <label htmlFor="notes">Notas</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            placeholder="Observaciones del perro o del servicio..."
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar servicio
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
