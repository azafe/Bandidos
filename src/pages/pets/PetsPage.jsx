import { useMemo, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";

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
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    customer_id: "",
    name: "",
    breed: "",
    size: "",
    notes: "",
  });
  const isAdmin = user?.role === "admin";
  const customerById = useMemo(() => {
    const entries = customers.map((customer) => [customer.id, customer.name]);
    return new Map(entries);
  }, [customers]);

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
    if (!ok) return false;
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo eliminar la mascota.");
      return false;
    }
  }

  function openModalEdit(pet) {
    setModalForm({
      customer_id: pet.customer_id || "",
      name: pet.name || "",
      breed: pet.breed || "",
      size: pet.size || "",
      notes: pet.notes || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedPet) return;
    if (!modalForm.name.trim() || !modalForm.customer_id) {
      alert("Ingresá nombre y cliente.");
      return;
    }
    try {
      await updateItem(selectedPet.id, {
        customer_id: modalForm.customer_id,
        name: modalForm.name.trim(),
        breed: modalForm.breed.trim(),
        size: modalForm.size.trim(),
        notes: modalForm.notes.trim(),
      });
      setSelectedPet((prev) =>
        prev
          ? {
              ...prev,
              customer_id: modalForm.customer_id,
              name: modalForm.name.trim(),
              breed: modalForm.breed.trim(),
              size: modalForm.size.trim(),
              notes: modalForm.notes.trim(),
            }
          : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar la mascota.");
    }
  }

  function closeModal() {
    setSelectedPet(null);
    setIsEditingModal(false);
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
                  </div>
                </div>
                <div className="list-item__meta">
                  <span>
                    Cliente:{" "}
                    {pet.customer?.name ||
                      customerById.get(pet.customer_id) ||
                      "-"}
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
        onClose={closeModal}
        title="Detalle de la mascota"
      >
        {selectedPet && (
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
                  <span>Cliente</span>
                  <select
                    value={modalForm.customer_id}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        customer_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccioná</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Raza</span>
                  <input
                    type="text"
                    value={modalForm.breed}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        breed: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Tamaño</span>
                  <input
                    type="text"
                    value={modalForm.size}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        size: e.target.value,
                      }))
                    }
                  />
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
                  <strong>Nombre:</strong> {selectedPet.name || "-"}
                </div>
                <div>
                  <strong>Cliente:</strong>{" "}
                  {selectedPet.customer?.name ||
                    customerById.get(selectedPet.customer_id) ||
                    "-"}
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
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openModalEdit(selectedPet)}
                >
                  <span
                    style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                    >
                      <path
                        d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 2.75 2.75 1.99-1.66z"
                        fill="currentColor"
                      />
                    </svg>
                    Editar
                  </span>
                </button>
              )}
              <button
                type="button"
                className="btn-danger"
                disabled={!isAdmin}
                onClick={async () => {
                  if (!isAdmin) return;
                  const removed = await handleDelete(selectedPet.id);
                  if (removed) closeModal();
                }}
                title={
                  isAdmin
                    ? "Eliminar mascota"
                    : "Solo administradores pueden eliminar"
                }
              >
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                  >
                    <path
                      d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                      fill="currentColor"
                    />
                  </svg>
                  Eliminar
                </span>
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
