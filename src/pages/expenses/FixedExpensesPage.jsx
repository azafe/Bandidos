// src/pages/expenses/FixedExpensesPage.jsx
import { useState } from "react";
import { useFixedExpenses } from "../../context/FixedExpensesContext";

export default function FixedExpensesPage() {
  const { fixedExpenses, addFixedExpense, monthlyTotal } = useFixedExpenses();

  const [form, setForm] = useState({
    name: "",
    category: "Alquiler",
    amount: "",
    dueDay: 1,
    paymentMethod: "Transferencia",
    supplier: "",
    status: "Activo",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto mensual válido.");
      return;
    }

    addFixedExpense({
      name: form.name.trim(),
      category: form.category,
      amount: amountNumber,
      dueDay: Number(form.dueDay) || 1,
      paymentMethod: form.paymentMethod,
      supplier: form.supplier.trim(),
      status: form.status,
    });

    setForm((prev) => ({
      ...prev,
      name: "",
      amount: "",
      supplier: "",
    }));
  }

  return (
    <div className="page-content">
      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Gastos fijos</h1>
          <p className="page-subtitle">
            Registrá los costos mensuales de Bandidos: alquiler, servicios,
            sueldos, internet, etc.
          </p>
        </div>
      </header>

      {/* Formulario */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">Nuevo gasto fijo</h2>
        <p className="card-subtitle">
          Estos gastos se repiten todos los meses. Más adelante podemos generar
          reportes comparando con los ingresos.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre del gasto</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ej: Alquiler local"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="Alquiler">Alquiler</option>
              <option value="Servicios">Servicios (luz, agua, gas)</option>
              <option value="Internet">Internet</option>
              <option value="Sueldos">Sueldos</option>
              <option value="Impuestos">Impuestos</option>
              <option value="Seguros">Seguros</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="amount">Monto mensual (ARS)</label>
            <input
              id="amount"
              type="number"
              name="amount"
              min="0"
              step="100"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="dueDay">Día de vencimiento</label>
            <input
              id="dueDay"
              type="number"
              name="dueDay"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={handleChange}
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
              <option value="Transferencia">Transferencia</option>
              <option value="Débito automático">Débito automático</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Mercado Pago">Mercado Pago</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="supplier">Proveedor</label>
            <input
              id="supplier"
              type="text"
              name="supplier"
              placeholder="Ej: Propietario local, EDET, Telecom"
              value={form.supplier}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="Activo">Activo</option>
              <option value="Pausado">Pausado</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar gasto fijo
          </button>
        </div>

        <div className="expenses-total">
          Total mensual de gastos fijos activos:{" "}
          <strong>${monthlyTotal.toLocaleString("es-AR")}</strong>
        </div>
      </form>

      {/* Tabla de gastos fijos */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de gastos fijos</h2>
        <p className="card-subtitle">
          Todos los compromisos mensuales de Bandidos. Te sirve para comparar
          contra los ingresos del mes.
        </p>

        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Vence día</th>
                <th>Método pago</th>
                <th>Proveedor</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {fixedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>
                    Sin gastos fijos cargados.
                  </td>
                </tr>
              ) : (
                fixedExpenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.category}</td>
                    <td>${e.amount.toLocaleString("es-AR")}</td>
                    <td>{e.dueDay}</td>
                    <td>{e.paymentMethod}</td>
                    <td>{e.supplier}</td>
                    <td>{e.status}</td>
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
