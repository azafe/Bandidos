// src/pages/suppliers/SuppliersPage.jsx
import { useState } from "react";
import { useSuppliers } from "../../context/SuppliersContext";

export default function SuppliersPage() {
  const { suppliers, addSupplier } = useSuppliers();

  const [form, setForm] = useState({
    name: "",
    category: "",
    phone: "",
    payment: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá al menos el nombre del proveedor.");
      return;
    }

    addSupplier({
      name: form.name.trim(),
      category: form.category.trim(),
      phone: form.phone.trim(),
      payment: form.payment,
      notes: form.notes.trim(),
    });

    setForm({
      name: "",
      category: "",
      phone: "",
      payment: "",
      notes: "",
    });
  }

  return (
    <div className="page-content">
      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">
            Registrá y gestioná los proveedores de Bandidos para tener claro
            con quién comprás insumos, snacks y servicios.
          </p>
        </div>
      </header>

      {/* Formulario */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">Nuevo proveedor</h2>
        <p className="card-subtitle">
          Completá los datos básicos. Más adelante podemos sumar CUIT, dirección
          y condiciones de pago.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre del proveedor</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ej: Pet Shop Tucumán"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="category">Rubro</label>
            <input
              id="category"
              type="text"
              name="category"
              placeholder="Ej: Insumos, Veterinaria, Snacks"
              value={form.category}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="text"
              name="phone"
              placeholder="Ej: 381-555-5555"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="payment">Método de pago preferido</label>
            <select
              id="payment"
              name="payment"
              value={form.payment}
              onChange={handleChange}
            >
              <option value="">Seleccioná</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Mercado Pago">Mercado Pago</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>

          <div className="form-field form-field--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Observaciones, horarios, descuentos, etc."
              value={form.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar proveedor
          </button>
        </div>
      </form>

      {/* Tabla de proveedores */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de proveedores</h2>
        <p className="card-subtitle">
          Vista rápida de todos los proveedores con los que trabaja Bandidos.
        </p>

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rubro</th>
                <th>Teléfono</th>
                <th>Método pago</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                    Sin proveedores cargados.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.category}</td>
                    <td>{s.phone}</td>
                    <td>{s.payment}</td>
                    <td>{s.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
