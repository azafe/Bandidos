// src/pages/expenses/DailyExpensesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";

export default function DailyExpensesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category_id: "",
  });
  const {
    items: expenses,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/daily-expenses", filters);
  const { items: categories } = useApiResource("/v2/expense-categories");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: suppliers } = useApiResource("/v2/suppliers");
  const [form, setForm] = useState({
    date: today,
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    supplier: "",
  });
  const [editingId, setEditingId] = useState(null);

  const totalToday = expenses.reduce((sum, exp) => {
    if (exp.date === form.date) return sum + Number(exp.amount || 0);
    return sum;
  }, 0);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto válido.");
      return;
    }
    try {
      const payload = {
        date: form.date,
        category_id: form.category,
        description: form.description || "(Sin detalle)",
        amount: amountNumber,
        payment_method_id: form.paymentMethod,
        supplier_id: form.supplier || null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      description: "",
      amount: "",
      supplier: "",
    }));
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este gasto?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el gasto.");
    }
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setForm({
      date: expense.date || today,
      category: expense.category_id || "",
      description: expense.description || "",
      amount: expense.amount ? String(expense.amount) : "",
      paymentMethod: expense.payment_method_id || "",
      supplier: expense.supplier_id || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      date: today,
      category: "",
      description: "",
      amount: "",
      paymentMethod: "",
      supplier: "",
    });
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, from: e.target.value }))
            }
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, to: e.target.value }))
            }
          />
          <select
            value={filters.category_id}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category_id: e.target.value }))
            }
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Formulario de carga */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar gasto" : "Nuevo gasto"}
        </h2>
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
              required
            >
              <option value="">Seleccioná</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
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
              required
            >
              <option value="">Seleccioná</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="supplier">Proveedor</label>
            <select
              id="supplier"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
            >
              <option value="">Seleccioná</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar gasto"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
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

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <table className="table table--compact">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Proveedor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>
                  Sin gastos cargados.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td>{exp.category?.name || exp.category_id}</td>
                  <td>{exp.description}</td>
                  <td>${Number(exp.amount || 0).toLocaleString("es-AR")}</td>
                  <td>{exp.payment_method?.name || exp.payment_method_id}</td>
                  <td>{exp.supplier?.name || exp.supplier_id || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => startEdit(exp)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => handleDelete(exp.id)}
                      style={{ marginLeft: 8 }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
