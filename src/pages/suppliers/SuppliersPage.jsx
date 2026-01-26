// src/pages/suppliers/SuppliersPage.jsx
import { useMemo, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

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
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    category: "",
    phone: "",
    payment_method_id: "",
    notes: "",
  });
  const paymentMethodById = useMemo(() => {
    const entries = paymentMethods.map((method) => [method.id, method.name]);
    return new Map(entries);
  }, [paymentMethods]);

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

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
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar el proveedor.");
      return false;
    }
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

  function openModalEdit(supplier) {
    setModalForm({
      name: supplier.name || "",
      category: supplier.category || "",
      phone: supplier.phone || "",
      payment_method_id: supplier.payment_method_id || "",
      notes: supplier.notes || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedSupplier) return;
    if (!modalForm.name.trim()) {
      alert("Ingresá al menos el nombre del proveedor.");
      return;
    }
    try {
      await updateItem(selectedSupplier.id, {
        name: modalForm.name.trim(),
        category: modalForm.category.trim(),
        phone: modalForm.phone.trim(),
        payment_method_id: modalForm.payment_method_id || null,
        notes: modalForm.notes.trim(),
      });
      setSelectedSupplier((prev) =>
        prev
          ? {
              ...prev,
              name: modalForm.name.trim(),
              category: modalForm.category.trim(),
              phone: modalForm.phone.trim(),
              payment_method_id: modalForm.payment_method_id || null,
              notes: modalForm.notes.trim(),
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el proveedor.");
    }
  }

  function closeModal() {
    setSelectedSupplier(null);
    setIsEditingModal(false);
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

        <div className="list-wrapper">
          {suppliers.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin proveedores cargados.
            </div>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className="list-item"
                onClick={() => setSelectedSupplier(s)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{s.name}</div>
                </div>
                <div className="list-item__meta">
                  <span>Rubro: {s.category || "-"}</span>
                  <span>Tel: {s.phone || "-"}</span>
                  <span>
                    Pago:{" "}
                    {s.payment_method?.name ||
                      paymentMethodById.get(s.payment_method_id) ||
                      "-"}
                  </span>
                </div>
                {s.notes && (
                  <div className="list-item__meta">
                    <span>Notas: {truncate(s.notes, 80)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedSupplier)}
        onClose={closeModal}
        title="Detalle del proveedor"
      >
        {selectedSupplier && (
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
                  <span>Rubro</span>
                  <input
                    type="text"
                    value={modalForm.category}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Teléfono</span>
                  <input
                    type="text"
                    value={modalForm.phone}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Método de pago</span>
                  <select
                    value={modalForm.payment_method_id}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        payment_method_id: e.target.value,
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
                  <span>Notas</span>
                  <textarea
                    rows={3}
                    value={modalForm.notes}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <div>
                  <strong>Nombre:</strong> {selectedSupplier.name || "-"}
                </div>
                <div>
                  <strong>Rubro:</strong> {selectedSupplier.category || "-"}
                </div>
                <div>
                  <strong>Teléfono:</strong> {selectedSupplier.phone || "-"}
                </div>
                <div>
                  <strong>Método de pago:</strong>{" "}
                  {selectedSupplier.payment_method?.name ||
                    paymentMethodById.get(selectedSupplier.payment_method_id) ||
                    "-"}
                </div>
                <div>
                  <strong>Notas:</strong> {selectedSupplier.notes || "-"}
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
                    onClick={() => openModalEdit(selectedSupplier)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      const removed = await handleDelete(selectedSupplier.id);
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
