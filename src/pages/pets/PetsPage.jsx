import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";

export default function PetsPage() {
  const [filters, setFilters] = useState({ customer_id: "", q: "" });
  const {
    items: pets,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/pets", filters);
  const { items: customers } = useApiResource("/v2/customers");
  const [editingId, setEditingId] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  const [form, setForm] = useState({
    customer_id: "",
    name: "",
    breed: "",
    size: "",
    notes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.customer_id) {
      alert("Ingresá nombre y cliente.");
      return;
    }

    try {
      if (editingId) {
        await updateItem(editingId, {
          customer_id: form.customer_id,
          name: form.name.trim(),
          breed: form.breed.trim(),
          size: form.size.trim(),
          notes: form.notes.trim(),
        });
      } else {
        await createItem({
          customer_id: form.customer_id,
          name: form.name.trim(),
          breed: form.breed.trim(),
          size: form.size.trim(),
          notes: form.notes.trim(),
        });
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar la mascota.");
      return;
    }

    setForm({
      customer_id: "",
      name: "",
      breed: "",
      size: "",
      notes: "",
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const ok = window.confirm("¿Eliminar esta mascota?");
    if (!ok) return;
    try {
      await deleteItem(id);
    } catch (err) {
      alert(err.message || "No se pudo eliminar la mascota.");
    }
  }

  function startEdit(pet) {
    setEditingId(pet.id);
    setForm({
      customer_id: pet.customer_id || "",
      name: pet.name || "",
      breed: pet.breed || "",
      size: pet.size || "",
      notes: pet.notes || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      customer_id: "",
      name: "",
      breed: "",
      size: "",
      notes: "",
    });
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Mascotas</h1>
          <p className="page-subtitle">
            Registro de perros y datos básicos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            value={filters.customer_id}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customer_id: e.target.value }))
            }
          >
            <option value="">Todos los clientes</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Buscar por nombre o raza..."
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
              minWidth: 240,
            }}
          />
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar mascota" : "Nueva mascota"}
        </h2>
        <p className="card-subtitle">
          Asociá la mascota con su dueño para reportes y servicios.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="customer_id">Cliente</label>
            <select
              id="customer_id"
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccioná</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="breed">Raza</label>
            <input
              id="breed"
              name="breed"
              type="text"
              value={form.breed}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="size">Tamaño</label>
            <input
              id="size"
              name="size"
              type="text"
              value={form.size}
              onChange={handleChange}
            />
          </div>

          <div className="form-field form-field--full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar mascota"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de mascotas</h2>
        <p className="card-subtitle">Mascotas registradas en Bandidos.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {pets.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin mascotas cargadas.
            </div>
          ) : (
            pets.map((pet) => (
              <div
                key={pet.id}
                className="list-item"
                onClick={() => setSelectedPet(pet)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{pet.name}</div>
                  <div className="list-item__actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(pet);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pet.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="list-item__meta">
                  <span>
                    Cliente: {pet.customer?.name || pet.customer_id || "-"}
                  </span>
                  <span>Raza: {pet.breed || "-"}</span>
                  <span>Tamaño: {pet.size || "-"}</span>
                </div>
                {pet.notes && (
                  <div className="list-item__meta">
                    <span>Notas: {truncate(pet.notes, 80)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedPet)}
        onClose={() => setSelectedPet(null)}
        title="Detalle de la mascota"
      >
        {selectedPet && (
          <>
            <div>
              <strong>Nombre:</strong> {selectedPet.name || "-"}
            </div>
            <div>
              <strong>Cliente:</strong>{" "}
              {selectedPet.customer?.name || selectedPet.customer_id || "-"}
            </div>
            <div>
              <strong>Raza:</strong> {selectedPet.breed || "-"}
            </div>
            <div>
              <strong>Tamaño:</strong> {selectedPet.size || "-"}
            </div>
            <div>
              <strong>Notas:</strong> {selectedPet.notes || "-"}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
