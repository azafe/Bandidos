// src/pages/expenses/DailyExpensesPage.jsx
import { useState } from "react";

const initialExpenses = [
  {
    id: 1,
    date: new Date().toISOString().slice(0, 10),
    category: "Insumos",
    description: "Shampoo neutro x5",
    amount: 12000,
    paymentMethod: "Efectivo",
    supplier: "Proveedor demo",
  },
  {
    id: 2,
    date: new Date().toISOString().slice(0, 10),
    category: "Snacks",
    description: "Galletitas para perros",
    amount: 4500,
    paymentMethod: "MP",
    supplier: "Pet Shop",
  },
];

export default function DailyExpensesPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [expenses, setExpenses] = useState(initialExpenses);
  const [form, setForm] = useState({
    date: today,
    category: "Insumos",
    description: "",
    amount: "",
    paymentMethod: "Efectivo",
    supplier: "",
  });

  const totalToday = expenses.reduce((sum, exp) => {
    if (exp.date === form.date) return sum + exp.amount;
    return sum;
  }, 0);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto válido.");
      return;
    }

    const newExpense = {
      id: expenses.length ? expenses[0].id + 1 : 1,
      date: form.date,
      category: form.category,
      description: form.description || "(Sin detalle)",
      amount: amountNumber,
      paymentMethod: form.paymentMethod,
      supplier: form.supplier,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    setForm((prev) => ({
      ...prev,
      description: "",
      amount: "",
      supplier: "",
    }));
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gastos diarios</h1>
          <p className="page-subtitle">
            Registrá los gastos del día a día: shampoo, limpieza, snacks,
            mantenimiento menor, etc.
          </p>
        </div>
      </header>

      {/* Formulario de carga */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">Nuevo gasto</h2>
        <p className="card-subtitle">
          Completa los datos del gasto para llevar el control de caja.
        </p>

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
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="Insumos">Insumos (shampoo, toallas)</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Snacks">Snacks / premios</option>
              <option value="Mantenimiento">Mantenimiento menor</option>
              <option value="Transporte">Transporte</option>
              <option value="Varios">Varios</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="description">Descripción</label>
            <input
              id="description"
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ej: Shampoo para pelaje largo"
            />
          </div>

          <div className="form-field">
            <label htmlFor="amount">Monto (ARS)</label>
            <input
              id="amount"
              type="number"
              name="amount"
              value={form.amount}
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
              <option value="Efectivo">Efectivo</option>
              <option value="Débito">Débito</option>
              <option value="Crédito">Crédito</option>
              <option value="MP">Mercado Pago</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="supplier">Proveedor</label>
            <input
              id="supplier"
              type="text"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="Ej: PetShop Tucumán"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar gasto
          </button>
        </div>

        <div className="expenses-total">
          Total del día ({form.date}):{" "}
          <strong>${totalToday.toLocaleString("es-AR")}</strong>
        </div>
      </form>

      {/* Tabla de gastos */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de gastos</h2>
        <p className="card-subtitle">
          Resumen de los gastos cargados. Más adelante podemos filtrar por
          fecha, categoría y método de pago.
        </p>

        <table className="table table--compact">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.date}</td>
                <td>{exp.category}</td>
                <td>{exp.description}</td>
                <td>${exp.amount.toLocaleString("es-AR")}</td>
                <td>{exp.paymentMethod}</td>
                <td>{exp.supplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
