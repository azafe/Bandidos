// src/pages/expenses/FixedExpensesPage.jsx
import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

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
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    category: "",
    amount: "",
    dueDay: 1,
    paymentMethod: "",
    supplier: "",
    status: "active",
  });

  function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
  }

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
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el gasto fijo.");
      return false;
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

  function openModalEdit(expense) {
    setModalForm({
      name: expense.name || "",
      category: expense.category_id || expense.category?.id || "",
      amount: expense.amount ? String(expense.amount) : "",
      dueDay: expense.due_day || expense.dueDay || 1,
      paymentMethod: expense.payment_method_id || expense.payment_method?.id || "",
      supplier: expense.supplier_id || expense.supplier?.id || "",
      status: expense.status || "active",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedExpense) return;
    const amountNumber = Number(modalForm.amount);
    if (!amountNumber || amountNumber <= 0) {
      alert("Ingresá un monto mensual válido.");
      return;
    }
    try {
      const payload = {
        name: modalForm.name.trim(),
        category_id: modalForm.category,
        amount: amountNumber,
        due_day: Number(modalForm.dueDay) || 1,
        payment_method_id: modalForm.paymentMethod,
        supplier_id: modalForm.supplier || null,
        status: modalForm.status,
      };
      await updateItem(selectedExpense.id, payload);
      setSelectedExpense((prev) =>
        prev
          ? {
              ...prev,
              name: modalForm.name.trim(),
              category_id: modalForm.category,
              amount: amountNumber,
              due_day: Number(modalForm.dueDay) || 1,
              payment_method_id: modalForm.paymentMethod,
              supplier_id: modalForm.supplier || null,
              status: modalForm.status,
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el gasto fijo.");
    }
  }

  function closeModal() {
    setSelectedExpense(null);
    setIsEditingModal(false);
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

      {/* Lista de gastos fijos */}
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

        <div className="list-wrapper">
          {fixedExpenses.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin gastos fijos cargados.
            </div>
          ) : (
            fixedExpenses.map((e) => (
              <div
                key={e.id}
                className="list-item"
                onClick={() => setSelectedExpense(e)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{e.name}</div>
                </div>
                <div className="list-item__meta">
                  <span>Categoría: {e.category?.name || e.category_id || "-"}</span>
                  <span>Monto: {formatCurrency(e.amount)}</span>
                  <span>Vence: {e.due_day || e.dueDay || "-"}</span>
                  <span>
                    Método: {e.payment_method?.name || e.payment_method_id || "-"}
                  </span>
                  <span>Proveedor: {e.supplier?.name || e.supplier_id || "-"}</span>
                  <span>Estado: {e.status === "active" ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedExpense)}
        onClose={closeModal}
        title="Detalle del gasto fijo"
      >
        {selectedExpense && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={modalForm.name}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Categoría</span>
                  <select
                    value={modalForm.category}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccioná</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Monto</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={modalForm.amount}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Vence día</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={modalForm.dueDay}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        dueDay: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Método de pago</span>
                  <select
                    value={modalForm.paymentMethod}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccioná</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Proveedor</span>
                  <select
                    value={modalForm.supplier}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccioná</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Estado</span>
                  <select
                    value={modalForm.status}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <div>
                  <strong>Nombre:</strong> {selectedExpense.name || "-"}
                </div>
                <div>
                  <strong>Categoría:</strong>{" "}
                  {selectedExpense.category?.name ||
                    selectedExpense.category_id ||
                    "-"}
                </div>
                <div>
                  <strong>Monto:</strong> {formatCurrency(selectedExpense.amount)}
                </div>
                <div>
                  <strong>Vence día:</strong>{" "}
                  {selectedExpense.due_day || selectedExpense.dueDay || "-"}
                </div>
                <div>
                  <strong>Método de pago:</strong>{" "}
                  {selectedExpense.payment_method?.name ||
                    selectedExpense.payment_method_id ||
                    "-"}
                </div>
                <div>
                  <strong>Proveedor:</strong>{" "}
                  {selectedExpense.supplier?.name ||
                    selectedExpense.supplier_id ||
                    "-"}
                </div>
                <div>
                  <strong>Estado:</strong>{" "}
                  {selectedExpense.status === "active" ? "Activo" : "Inactivo"}
                </div>
              </>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleModalSave}
                  >
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openModalEdit(selectedExpense)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedExpense.id);
                      if (removed) closeModal();
                    }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
