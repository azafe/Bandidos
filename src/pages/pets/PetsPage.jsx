import { useState } from "react";
import { Link } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";

const PET_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
  "#6366f1", "#ec4899",
];

function petColor(name) {
  if (!name) return PET_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PET_COLORS[Math.abs(hash) % PET_COLORS.length];
}

function petInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function PetsPage() {
  const [filters, setFilters] = useState({ q: "" });
  const {
    items: pets,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
  } = useApiResource("/v2/pets", filters);
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "", breed: "", owner_name: "", owner_phone: "",
    notes: "", neutered: false, behavior: "", age: "", address: "",
  });
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({
    name: "", breed: "", owner_name: "", owner_phone: "",
    notes: "", neutered: false, behavior: "", age: "", address: "",
  });
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({ name: "", breed: "", owner_name: "", owner_phone: "", notes: "", neutered: false, behavior: "", age: "", address: "" });
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_name.trim()) {
      alert("Ingresá el nombre de la mascota y el dueño.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        breed: form.breed.trim(),
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),
        notes: form.notes.trim(),
        neutered: Boolean(form.neutered),
        behavior: form.behavior.trim() || null,
        age: form.age.trim() || null,
        address: form.address.trim() || null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar la mascota.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar esta mascota?")) return false;
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
      name: pet.name || "",
      breed: pet.breed || "",
      owner_name: pet.owner_name || "",
      owner_phone: pet.owner_phone || "",
      notes: pet.notes || "",
      neutered: Boolean(pet.neutered),
      behavior: pet.behavior || "",
      age: pet.age || "",
      address: pet.address || "",
    });
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedPet) return;
    if (!modalForm.name.trim() || !modalForm.owner_name.trim()) {
      alert("Ingresá el nombre de la mascota y el dueño.");
      return;
    }
    try {
      const payload = {
        name: modalForm.name.trim(),
        breed: modalForm.breed.trim(),
        owner_name: modalForm.owner_name.trim(),
        owner_phone: modalForm.owner_phone.trim(),
        notes: modalForm.notes.trim(),
        neutered: Boolean(modalForm.neutered),
        behavior: modalForm.behavior.trim() || null,
        age: modalForm.age.trim() || null,
        address: modalForm.address.trim() || null,
      };
      await updateItem(selectedPet.id, payload);
      setSelectedPet((prev) => prev ? { ...prev, ...payload } : prev);
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar la mascota.");
    }
  }

  function closeModal() {
    setSelectedPet(null);
    setIsEditingModal(false);
  }

  return (
    <div className="page-content">

      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Mascotas</h1>
          <p className="page-subtitle">Registro de perros y datos básicos.</p>
        </div>
        <div className="fixed-expenses-header-actions">
          <input
            type="text"
            placeholder="Buscar por mascota, dueño o celular…"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            className="pets-search-input"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => { resetForm(); setFormOpen((v) => !v); }}
          >
            {formOpen ? "Cancelar" : "+ Nueva mascota"}
          </button>
        </div>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {/* Formulario colapsable */}
      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">{editingId ? "Editar mascota" : "Nueva mascota"}</h2>
          <p className="card-subtitle">Registrá los datos básicos para identificar a la mascota y su dueño.</p>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nombre mascota</label>
              <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="breed">Raza</label>
              <input id="breed" name="breed" type="text" value={form.breed} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="owner_name">Dueño</label>
              <input id="owner_name" name="owner_name" type="text" value={form.owner_name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="owner_phone">Celular</label>
              <input id="owner_phone" name="owner_phone" type="text" value={form.owner_phone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="neutered">Castrado</label>
              <select
                id="neutered" name="neutered"
                value={String(form.neutered)}
                onChange={(e) => setForm((prev) => ({ ...prev, neutered: e.target.value === "true" }))}
              >
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="behavior">Comportamiento</label>
              <input id="behavior" name="behavior" type="text" value={form.behavior} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="age">Edad</label>
              <input id="age" name="age" type="text" placeholder="Ej: 3 años" value={form.age} onChange={handleChange} />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="address">Dirección</label>
              <input id="address" name="address" type="text" placeholder="Ej: Av. Corrientes 1234" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="notes">Observaciones</label>
              <textarea id="notes" name="notes" rows={3} value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar mascota"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setFormOpen(false); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Grid de cards */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 className="card-title">Mascotas registradas</h2>
            <p className="card-subtitle">{pets.length} registros · Hacé clic para ver detalle.</p>
          </div>
        </div>

        {loading && <div className="card-subtitle">Cargando...</div>}

        {!loading && pets.length === 0 && (
          <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
            Sin mascotas cargadas. Usá el botón "+ Nueva mascota".
          </div>
        )}

        <div className="pet-cards-grid">
          {pets.map((pet) => {
            const color = petColor(pet.name);
            return (
              <div
                key={pet.id}
                className="pet-card"
                style={{ "--pet-color": color }}
                onClick={() => setSelectedPet(pet)}
              >
                <div className="pet-card__avatar" style={{ background: color }}>
                  {petInitial(pet.name)}
                </div>
                <div className="pet-card__body">
                  <div className="pet-card__name">
                    <span className="pet-card__avatar-circle" style={{ background: color }}>
                      {petInitial(pet.name)}
                    </span>
                    {pet.name}
                  </div>
                  {pet.breed && <div className="pet-card__breed">{pet.breed}</div>}
                  <div className="pet-card__owner">
                    <span className="pet-card__owner-name">
                      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="currentColor"/>
                      </svg>
                      {pet.owner_name || "-"}
                    </span>
                    {pet.owner_phone && (
                      <span className="pet-card__owner-phone">
                        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style={{ flexShrink: 0 }}>
                          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/>
                        </svg>
                        {pet.owner_phone}
                      </span>
                    )}
                  </div>
                  <div className="pet-card__tags">
                    <span className={`pet-card__tag${pet.neutered ? " pet-card__tag--yes" : ""}`}>
                      {pet.neutered ? "Castrado" : "Sin castrar"}
                    </span>
                    {pet.behavior && (
                      <span className="pet-card__tag">{pet.behavior}</span>
                    )}
                    {pet.age && (
                      <span className="pet-card__tag">{pet.age}</span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/pets/${pet.id}`}
                  className="pet-card__ficha-btn"
                  onClick={(e) => e.stopPropagation()}
                  title="Ver ficha completa"
                >
                  Ver ficha →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalle / edición */}
      <Modal isOpen={Boolean(selectedPet)} onClose={closeModal} title="Detalle de la mascota">
        {selectedPet && (
          <>
            {isEditingModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input type="text" value={modalForm.name}
                    onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Raza</span>
                  <input type="text" value={modalForm.breed}
                    onChange={(e) => setModalForm((p) => ({ ...p, breed: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Dueño</span>
                  <input type="text" value={modalForm.owner_name}
                    onChange={(e) => setModalForm((p) => ({ ...p, owner_name: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Celular</span>
                  <input type="text" value={modalForm.owner_phone}
                    onChange={(e) => setModalForm((p) => ({ ...p, owner_phone: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Castrado</span>
                  <select value={String(modalForm.neutered)}
                    onChange={(e) => setModalForm((p) => ({ ...p, neutered: e.target.value === "true" }))}>
                    <option value="false">No</option>
                    <option value="true">Sí</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Comportamiento</span>
                  <input type="text" value={modalForm.behavior}
                    onChange={(e) => setModalForm((p) => ({ ...p, behavior: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Edad</span>
                  <input type="text" value={modalForm.age}
                    onChange={(e) => setModalForm((p) => ({ ...p, age: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Dirección</span>
                  <input type="text" value={modalForm.address}
                    onChange={(e) => setModalForm((p) => ({ ...p, address: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Observaciones</span>
                  <textarea rows={3} value={modalForm.notes}
                    onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
              </>
            ) : (
              <div className="fe-modal-detail">
                <div className="pet-modal-header">
                  <div className="pet-modal-avatar" style={{ background: petColor(selectedPet.name) }}>
                    {petInitial(selectedPet.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{selectedPet.name}</div>
                    {selectedPet.breed && <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{selectedPet.breed}</div>}
                  </div>
                </div>
                <div className="fe-modal-detail__rows">
                  <div><strong>Dueño</strong><span>{selectedPet.owner_name || "-"}</span></div>
                  <div><strong>Celular</strong><span>{selectedPet.owner_phone || "-"}</span></div>
                  <div><strong>Edad</strong><span>{selectedPet.age || "-"}</span></div>
                  <div><strong>Castrado</strong><span>{selectedPet.neutered ? "Sí" : "No"}</span></div>
                  <div><strong>Comportamiento</strong><span>{selectedPet.behavior || "-"}</span></div>
                  <div><strong>Dirección</strong><span>{selectedPet.address || "-"}</span></div>
                  {selectedPet.notes && (
                    <div style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <strong>Observaciones</strong>
                      <span style={{ marginTop: 4, fontSize: "0.88rem" }}>{selectedPet.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="modal-actions">
              {isEditingModal ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setIsEditingModal(false)}>Cancelar</button>
                  <button type="button" className="btn-primary" onClick={handleModalSave}>Guardar cambios</button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={!isAdmin}
                    title={isAdmin ? "Eliminar mascota" : "Solo administradores pueden eliminar"}
                    onClick={async () => {
                      if (!isAdmin) return;
                      const removed = await handleDelete(selectedPet.id);
                      if (removed) closeModal();
                    }}
                  >
                    Eliminar
                  </button>
                  <Link to={`/pets/${selectedPet.id}`} className="btn-secondary" onClick={closeModal}>
                    Ver ficha
                  </Link>
                  <button type="button" className="btn-primary" onClick={() => openModalEdit(selectedPet)}>
                    Editar
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
