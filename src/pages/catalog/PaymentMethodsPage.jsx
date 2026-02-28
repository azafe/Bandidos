import { useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import Modal from "../../components/ui/Modal";
import { apiRequest } from "../../services/apiClient";

const PAYMENT_METHOD_USAGE_SOURCES = [
  { key: "services", label: "Servicios", path: "/v2/services" },
  { key: "agenda", label: "Turnos agenda", path: "/agenda" },
  { key: "daily_expenses", label: "Gastos diarios", path: "/v2/daily-expenses" },
  { key: "fixed_expenses", label: "Gastos fijos", path: "/v2/fixed-expenses" },
  { key: "petshop_sales", label: "Ventas petshop", path: "/v2/petshop/sales" },
  { key: "suppliers", label: "Proveedores", path: "/v2/suppliers" },
];

function normalizeList(data) {
  return Array.isArray(data) ? data : data?.items || [];
}

function sameId(left, right) {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  return Boolean(a && b) && a === b;
}

function hasPaymentMethodReference(record, paymentMethodId) {
  if (!record) return false;
  return sameId(record.payment_method_id, paymentMethodId) ||
    sameId(record.paymentMethodId, paymentMethodId) ||
    sameId(record.payment_method?.id, paymentMethodId) ||
    sameId(record.paymentMethod?.id, paymentMethodId);
}

function buildDeleteBlockedMessage(usageAudit) {
  const lines = usageAudit.sources
    .filter((source) => source.usageCount > 0)
    .map((source) => `- ${source.label}: ${source.usageCount}`);
  if (lines.length > 0) {
    return [
      "No se puede eliminar porque este método está en uso.",
      "",
      ...lines,
      "",
      "Reasigná esos registros a otro método y volvé a intentar.",
    ].join("\n");
  }
  return "No se pudo eliminar el método. Probablemente esté vinculado a registros históricos.";
}

export default function PaymentMethodsPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useApiResource("/v2/payment-methods");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalName, setModalName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Ingresá el nombre del método.");
      return;
    }
    try {
      if (editingId) {
        await updateItem(editingId, { name: name.trim() });
      } else {
        await createItem({ name: name.trim() });
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar el método.");
      return;
    }
    setName("");
    setEditingId(null);
  }

  async function inspectMethodUsage(id) {
    const sources = await Promise.all(
      PAYMENT_METHOD_USAGE_SOURCES.map(async (source) => {
        try {
          const data = await apiRequest(source.path);
          const rows = normalizeList(data);
          const usageCount = rows.filter((row) =>
            hasPaymentMethodReference(row, id)
          ).length;
          return { ...source, usageCount, loaded: true };
        } catch {
          return { ...source, usageCount: 0, loaded: false };
        }
      })
    );
    return {
      sources,
      totalUsage: sources.reduce((sum, source) => sum + source.usageCount, 0),
      loadedSources: sources.filter((source) => source.loaded).length,
    };
  }

  async function handleDelete(id) {
    if (deleteLoading) return false;
    const ok = window.confirm("¿Eliminar este método de pago?");
    if (!ok) return false;
    setDeleteLoading(true);
    try {
      await deleteItem(id);
      return true;
    } catch (err) {
      const status = err?.status;
      const message = String(err?.message || "");
      const likelyRelatedUsage =
        status === 500 ||
        status === 409 ||
        /constraint|foreign|reference|vinculad|in use|unexpected error/i.test(message);

      if (status === 401) {
        alert("Tu sesión venció. Iniciá sesión nuevamente.");
        return false;
      }

      if (likelyRelatedUsage) {
        try {
          const usageAudit = await inspectMethodUsage(id);
          if (usageAudit.totalUsage > 0) {
            alert(buildDeleteBlockedMessage(usageAudit));
            return false;
          }
          if (usageAudit.loadedSources === 0) {
            alert(
              "No se pudo eliminar el método y no se pudo auditar dónde está en uso. Intentá de nuevo en unos segundos."
            );
            return false;
          }
          alert(buildDeleteBlockedMessage(usageAudit));
          return false;
        } catch {
          alert("No se pudo eliminar el método. Probablemente esté en uso.");
          return false;
        }
      }

      const details = status ? ` (${status})` : "";
      alert(`${err.message || "No se pudo eliminar el método."}${details}`);
      return false;
    } finally {
      setDeleteLoading(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
  }

  function openModalEdit(item) {
    setModalName(item.name || "");
    setIsEditingModal(true);
  }

  async function handleModalSave() {
    if (!selectedMethod) return;
    if (!modalName.trim()) {
      alert("Ingresá el nombre del método.");
      return;
    }
    try {
      await updateItem(selectedMethod.id, { name: modalName.trim() });
      setSelectedMethod((prev) =>
        prev ? { ...prev, name: modalName.trim() } : prev
      );
      setIsEditingModal(false);
    } catch (err) {
      alert(err.message || "No se pudo guardar el método.");
    }
  }

  function closeModal() {
    setSelectedMethod(null);
    setIsEditingModal(false);
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Métodos de pago</h1>
          <p className="page-subtitle">
            Administrá los métodos de pago disponibles.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="card-title">
          {editingId ? "Editar método" : "Nuevo método"}
        </h2>
        <p className="card-subtitle">Aparece en servicios y gastos.</p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Guardar cambios" : "Guardar método"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Listado de métodos</h2>
        <p className="card-subtitle">Métodos configurados en el sistema.</p>

        {loading && <div className="card-subtitle">Cargando...</div>}
        {error && (
          <div className="card-subtitle" style={{ color: "#f37b7b" }}>
            {error}
          </div>
        )}

        <div className="list-wrapper">
          {items.length === 0 ? (
            <div className="card-subtitle" style={{ textAlign: "center" }}>
              Sin métodos cargados.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => setSelectedMethod(item)}
              >
                <div className="list-item__header">
                  <div className="list-item__title">{item.name}</div>
                </div>
                <div className="list-item__meta">
                  <span>Nombre: {item.name || "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedMethod)}
        onClose={closeModal}
        title="Detalle del método"
      >
        {selectedMethod && (
          <>
            {isEditingModal ? (
              <label className="form-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                />
              </label>
            ) : (
              <div>
                <strong>Nombre:</strong> {selectedMethod.name || "-"}
              </div>
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
                    onClick={() => openModalEdit(selectedMethod)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={deleteLoading}
                    onClick={async () => {
                      const removed = await handleDelete(selectedMethod.id);
                      if (removed) closeModal();
                    }}
                  >
                    {deleteLoading ? "Eliminando..." : "Eliminar"}
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
