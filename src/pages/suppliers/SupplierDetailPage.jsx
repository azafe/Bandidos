// src/pages/suppliers/SupplierDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";

const SUPPLIER_COLORS = [
  "#ff4fa8", "#f97316", "#22c55e", "#38bdf8",
  "#a855f7", "#eab308", "#ef4444", "#14b8a6",
];

function supplierColor(name) {
  if (!name) return SUPPLIER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUPPLIER_COLORS[Math.abs(hash) % SUPPLIER_COLORS.length];
}

function initial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).split("T")[0].split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function fmt(n) {
  return `$${Math.round(Number(n || 0)).toLocaleString("es-AR")}`;
}

export default function SupplierDetailPage() {
  const { id } = useParams();

  const [supplier, setSupplier]       = useState(null);
  const [movements, setMovements]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState({
    date: todayISO(),
    tipo: "",
    monto: "",
    descripcion: "",
    referencia: "",
  });

  // ── Carga de datos ────────────────────────────────────────────────────────
  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [sup, movs] = await Promise.all([
        apiRequest(`/v2/suppliers/${id}`),
        apiRequest(`/v2/suppliers/${id}/movements`),
      ]);
      setSupplier(sup);
      setMovements(Array.isArray(movs) ? movs : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar el proveedor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalCargos = useMemo(
    () => movements.filter((m) => m.tipo === "cargo").reduce((s, m) => s + Number(m.monto), 0),
    [movements]
  );

  const totalPagos = useMemo(
    () => movements.filter((m) => m.tipo === "pago").reduce((s, m) => s + Number(m.monto), 0),
    [movements]
  );

  const saldo = totalCargos - totalPagos;

  // Movimientos con saldo acumulado: acumular ASC, luego invertir para mostrar DESC
  const movementsWithBalance = useMemo(() => {
    let running = 0;
    const withBal = movements.map((m) => {
      running += m.tipo === "cargo" ? Number(m.monto) : -Number(m.monto);
      return { ...m, balanceAfter: running };
    });
    return withBal.reverse();
  }, [movements]);

  // ── Formulario de movimiento ──────────────────────────────────────────────
  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Formato $1.111.111,11 mientras el usuario escribe
  function handleMontoChange(e) {
    let raw = e.target.value.replace(/[^\d,]/g, "");
    const parts = raw.split(",");
    if (parts.length > 2) raw = parts[0] + "," + parts.slice(1).join("");
    const intFormatted = (parts[0] || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const result = parts.length > 1
      ? intFormatted + "," + parts[1].slice(0, 2)
      : intFormatted;
    setForm((prev) => ({ ...prev, monto: result }));
  }

  // Convierte "1.234,56" → 1234.56
  function parseMontoValue(val) {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function resetForm() {
    setForm({ date: todayISO(), tipo: "", monto: "", descripcion: "", referencia: "" });
  }

  async function handleSaveMovement(e) {
    e.preventDefault();
    if (!form.date || !form.tipo || !form.monto) {
      alert("Completá fecha, tipo y monto.");
      return;
    }
    try {
      setSaving(true);
      await apiRequest(`/v2/suppliers/${id}/movements`, {
        method: "POST",
        body: {
          date:        form.date,
          tipo:        form.tipo,
          monto:       parseMontoValue(form.monto),
          descripcion: form.descripcion.trim() || null,
          referencia:  form.referencia.trim() || null,
        },
      });
      setMovModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      alert(err.message || "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMovement(movId) {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    try {
      await apiRequest(`/v2/supplier-movements/${movId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err.message || "No se pudo eliminar el movimiento.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const color = supplierColor(supplier?.name);

  return (
    <div className="page-content">

      <header className="page-header">
        <div>
          <h1 className="page-title">Cuenta corriente</h1>
          <p className="page-subtitle">Movimientos y saldo del proveedor.</p>
        </div>
        <Link to="/suppliers" className="btn-secondary">← Volver</Link>
      </header>

      {error && <div className="card" style={{ color: "#f37b7b" }}>{error}</div>}

      {loading && !supplier && (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <span className="card-subtitle">Cargando...</span>
        </div>
      )}

      {supplier && (
        <>
          {/* Perfil del proveedor */}
          <div className="pet-detail-profile">
            <div className="pet-detail-profile__bar" style={{ background: color }} />
            <div className="pet-detail-profile__body">
              <div className="pet-detail-profile__left">
                <div className="pet-detail-profile__avatar" style={{ background: color }}>
                  {initial(supplier.name)}
                </div>
                <div>
                  <h2 className="pet-detail-profile__name">{supplier.name}</h2>
                  <div className="pet-detail-profile__badges">
                    {supplier.category && (
                      <span className="supplier-card__category">{supplier.category}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pet-detail-profile__info">
                {supplier.phone && (
                  <div className="pet-detail-profile__row">
                    <span className="pet-detail-profile__row-label">Teléfono</span>
                    <span className="pet-detail-profile__row-value">{supplier.phone}</span>
                  </div>
                )}
                {supplier.notes && (
                  <div className="pet-detail-profile__row">
                    <span className="pet-detail-profile__row-label">Notas</span>
                    <span className="pet-detail-profile__row-value">{supplier.notes}</span>
                  </div>
                )}
                <div className="pet-detail-profile__row">
                  <span className="pet-detail-profile__row-label">Saldo pendiente</span>
                  <span
                    className="pet-detail-profile__row-value"
                    style={{ fontWeight: 700, fontSize: "1.2rem", color: saldo === 0 ? "#22c55e" : "#f97316" }}
                  >
                    {fmt(saldo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="card fixed-expenses-summary">
            <div className="fixed-expenses-summary__kpis">
              <div className="fe-kpi">
                <span>Total cargado</span>
                <strong style={{ color: "#ef4444" }}>{fmt(totalCargos)}</strong>
              </div>
              <div className="fe-kpi">
                <span>Total pagado</span>
                <strong style={{ color: "#22c55e" }}>{fmt(totalPagos)}</strong>
              </div>
              <div className="fe-kpi fe-kpi--total">
                <span>Saldo actual</span>
                <strong style={{ color: saldo === 0 ? "#22c55e" : "#f97316" }}>{fmt(saldo)}</strong>
              </div>
              <div className="fe-kpi">
                <span>Movimientos</span>
                <strong>{movements.length}</strong>
              </div>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div>
                <h2 className="card-title">Movimientos</h2>
                <p className="card-subtitle">
                  {movements.length} registros · Del más reciente al más antiguo.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => { resetForm(); setMovModalOpen(true); }}
              >
                + Registrar movimiento
              </button>
            </div>

            {movements.length === 0 && (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "24px 0" }}>
                Sin movimientos registrados. Usá el botón para agregar el primero.
              </div>
            )}

            {movements.length > 0 && (
              <div className="table-wrapper" style={{ marginTop: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Saldo acum.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsWithBalance.map((m) => (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(m.date)}</td>
                        <td>
                          {m.descripcion}
                          {m.referencia && (
                            <small style={{ color: "var(--color-text-soft)", display: "block", marginTop: 2 }}>
                              Ref: {m.referencia}
                            </small>
                          )}
                        </td>
                        <td>
                          <span
                            className="sup-mov-badge"
                            style={{
                              background: m.tipo === "cargo" ? "#ef444420" : "#22c55e20",
                              color:      m.tipo === "cargo" ? "#ef4444"   : "#22c55e",
                            }}
                          >
                            {m.tipo === "cargo" ? "Cargo" : "Pago"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap", color: m.tipo === "cargo" ? "#ef4444" : "#22c55e" }}>
                          {m.tipo === "cargo" ? "−" : "+"}{fmt(m.monto)}
                        </td>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap", color: m.balanceAfter === 0 ? "#22c55e" : "#f97316" }}>
                          {fmt(m.balanceAfter)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-danger"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            onClick={() => handleDeleteMovement(m.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: nuevo movimiento */}
      <Modal
        isOpen={movModalOpen}
        onClose={() => setMovModalOpen(false)}
        title="Registrar movimiento"
      >
        <form onSubmit={handleSaveMovement}>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="form-field">
              <label htmlFor="mov-date">Fecha</label>
              <input
                id="mov-date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="mov-tipo">Tipo</label>
              <select id="mov-tipo" name="tipo" value={form.tipo} onChange={handleFormChange} required>
                <option value="" disabled>Seleccioná tipo…</option>
                <option value="cargo">Cargo (mercadería recibida)</option>
                <option value="pago">Pago realizado</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="mov-monto">Monto</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{
                  position: "absolute", left: 11,
                  color: "#6a7184", fontWeight: 600,
                  fontSize: "0.95rem", pointerEvents: "none",
                }}>$</span>
                <input
                  id="mov-monto"
                  name="monto"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.monto}
                  onChange={handleMontoChange}
                  required
                  style={{ paddingLeft: 24 }}
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="mov-ref">Referencia (opcional)</label>
              <input
                id="mov-ref"
                name="referencia"
                type="text"
                placeholder="Nro. factura, remito, etc."
                value={form.referencia}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="mov-desc">Descripción</label>
              <input
                id="mov-desc"
                name="descripcion"
                type="text"
                placeholder="Ej: Compra shampoo x24 (opcional)"
                value={form.descripcion}
                onChange={handleFormChange}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMovModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar movimiento"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
