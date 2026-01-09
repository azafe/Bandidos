// src/pages/suppliers/SuppliersPage.jsx
import { useMemo, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";

export default function SuppliersPage() {
  const [filters, setFilters] = useState({ q: "", category: "" });
  const {
    items: suppliers,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/suppliers", filters);
  const { items: paymentMethods } = useApiResource("/v2/payment-methods");
  const [editingId, setEditingId] = useState(null);
  const paymentMethodById = useMemo(() => {
    const entries = paymentMethods.map((method) => [method.id, method.name]);
    return new Map(entries);
  }, [paymentMethods]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Ingresá al menos el nombre del proveedor.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        phone: form.phone.trim(),
        payment_method_id: form.payment || null,
        notes: form.notes.trim(),
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el proveedor.");
      return;
    }

    setForm({
      name: "",
      category: "",
      phone: "",
      payment: "",
      notes: "",
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar este proveedor?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar el proveedor.");
    }
  }

  function startEdit(supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || "",
      category: supplier.category || "",
      phone: supplier.phone || "",
      payment: supplier.payment_method_id || "",
      notes: supplier.notes || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={filters.q}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, q: e.target.value }))
            }
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 14px",
              background: "#12131a",
              color: "#fff",
              minWidth: 220,
            }}
          />
          <input
            type="text"
            placeholder="Filtrar por rubro..."
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 14px",
              background: "#12131a",
              color: "#fff",
              minWidth: 200,
            }}
          />
        </div>
      </header>

      {/* Formulario */}
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar proveedor" : "Nuevo proveedor"}
        </h2>
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
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
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
            {editingId ? "Guardar cambios" : "Guardar proveedor"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Tabla de proveedores */}
      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de proveedores</h2>
        <p className="card-subtitle">
          Vista rápida de todos los proveedores con los que trabaja Bandidos.
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
                <th>Rubro</th>
                <th>Teléfono</th>
                <th>Método pago</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    Sin proveedores cargados.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.category}</td>
                    <td>{s.phone}</td>
                    <td>
                      {s.payment_method?.name ||
                        paymentMethodById.get(s.payment_method_id) ||
                        "-"}
                    </td>
                    <td>{s.notes}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => startEdit(s)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(s.id)}
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
