// src/pages/expenses/FixedExpensesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";

export default function FixedExpensesPage() {
  const [filters, setFilters] = useState({ category_id: "", status: "" });
  const {
    items: fixedExpenses,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/fixed-expenses", filters);
  const { items: categories } = useApiResource("/v2/expense-categories");
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const { items: suppliers } = useApiResource("/v2/suppliers");
  const monthlyTotal = fixedExpenses
    .filter((e) => e.status === "Activo" || e.status === "active")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const [form, setForm] = useState({
    name: "",
    category: "",
    amount: "",
    dueDay: 1,
    paymentMethod: "",
    supplier: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const amountNumber = Number(form.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto mensual válido.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category,
        amount: amountNumber,
        due_day: Number(form.dueDay) || 1,
        payment_method_id: form.paymentMethod,
        supplier_id: form.supplier || null,
        status: form.status,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto fijo.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      name: "",
      amount: "",
      supplier: "",
    }));
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este gasto fijo?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el gasto fijo.");
    }
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setForm({
      name: expense.name || "",
      category: expense.category_id || "",
      amount: expense.amount ? String(expense.amount) : "",
      dueDay: expense.due_day || expense.dueDay || 1,
      paymentMethod: expense.payment_method_id || "",
      supplier: expense.supplier_id || "",
      status: expense.status || "active",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      category: "",
      amount: "",
      dueDay: 1,
      paymentMethod: "",
      supplier: "",
      status: "active",
    });
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </header>

      {/* Formulario */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
        </h2>
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

          <div className="form-field">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar gasto fijo"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
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

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fixedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                    Sin gastos fijos cargados.
                  </td>
                </tr>
              ) : (
                fixedExpenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.category?.name || e.category_id}</td>
                    <td>${Number(e.amount || 0).toLocaleString("es-AR")}</td>
                    <td>{e.due_day || e.dueDay}</td>
                    <td>{e.payment_method?.name || e.payment_method_id}</td>
                    <td>{e.supplier?.name || e.supplier_id || "-"}</td>
                    <td>{e.status === "active" ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => startEdit(e)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(e.id)}
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
    </div>
  );
}
