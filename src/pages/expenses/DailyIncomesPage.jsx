// src/pages/expenses/DailyIncomesPage.jsx
import { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { apiRequest } from "../../services/apiClient";

const CONCEPTS = [
  { key: "servicios", label: "Servicios", icon: "✂️", desc: "Ingresos por prestaciones directas" },
  { key: "señas", label: "Señas / Anticipos", icon: "🎟️", desc: "Registro de reservas y señas" },
  { key: "traslados", label: "Traslados", icon: "🚗", desc: "Ingresos específicos por transporte" },
  { key: "ventas_petshop", label: "Ventas Pet Shop", icon: "🛍️", desc: "Comercialización de productos físicos" },
];

export default function DailyIncomesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  // Cargar métodos de pago dinámicos desde la base de datos
  const { items: paymentMethods, loading: pmLoading } = useApiResource("/v2/payment-methods");

  const [loading, setLoading] = useState(true);
  const [incomesMap, setIncomesMap] = useState({}); // key: `${concept}-${payment_method_id}`
  const [notes, setNotes] = useState("");
  const [systemTotals, setSystemTotals] = useState([]);
  const [hasSavedData, setHasSavedData] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar planilla de ingresos declarados y sugeridos del sistema para la fecha seleccionada
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setSaveSuccess(false);
      try {
        // 1. Obtener ingresos y notas declaradas
        const data = await apiRequest(`/v2/daily-incomes?date=${selectedDate}`);
        if (!active) return;

        // 2. Obtener sugerencias calculadas en tiempo real de la base de datos
        const totals = await apiRequest(`/v2/daily-incomes/system-totals?date=${selectedDate}`);
        if (!active) return;
        setSystemTotals(totals || []);

        const map = {};
        if (data && data.is_declared) {
          // Si ya existen datos guardados en la DB, los usamos
          data.incomes.forEach((inc) => {
            map[`${inc.concept}-${inc.payment_method_id}`] = inc.amount > 0 ? String(inc.amount) : "";
          });
          setHasSavedData(true);
        } else {
          // Si no hay datos guardados, auto-completamos la matriz con los valores calculados por el sistema
          totals.forEach((item) => {
            if (item.amount > 0) {
              map[`${item.concept}-${item.payment_method_id}`] = String(item.amount);
            }
          });
          setHasSavedData(false);
        }
        setIncomesMap(map);
        setNotes(data?.notes || "");
      } catch (err) {
        console.error("[daily-incomes] Error cargando datos", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [selectedDate]);

  // Manejador del cambio de monto en la matriz
  const handleAmountChange = (concept, pmId, val) => {
    // Permitir solo números y vacíos
    if (val !== "" && (Number.isNaN(Number(val)) || Number(val) < 0)) return;
    setIncomesMap((prev) => ({
      ...prev,
      [`${concept}-${pmId}`]: val,
    }));
  };

  // Recomponer la matriz con los totales del sistema
  const handleResetToSystem = () => {
    const map = {};
    systemTotals.forEach((item) => {
      if (item.amount > 0) {
        map[`${item.concept}-${item.payment_method_id}`] = String(item.amount);
      }
    });
    setIncomesMap(map);
  };

  // Guardar la planilla
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const incomes = [];
      CONCEPTS.forEach((c) => {
        paymentMethods.forEach((pm) => {
          const val = incomesMap[`${c.key}-${pm.id}`];
          const amount = val && !Number.isNaN(Number(val)) ? Number(val) : 0;
          incomes.push({
            concept: c.key,
            payment_method_id: pm.id,
            amount,
          });
        });
      });

      await apiRequest("/v2/daily-incomes", {
        method: "POST",
        body: {
          date: selectedDate,
          incomes,
          notes: notes.trim(),
        },
      });

      setHasSavedData(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert(err.message || "Error al guardar la planilla.");
    } finally {
      setSaving(false);
    }
  };

  // Helpers de Formato
  function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Cálculos en tiempo real
  const getConceptRowTotal = (concept) => {
    if (pmLoading) return 0;
    return paymentMethods.reduce((sum, pm) => {
      const val = Number(incomesMap[`${concept}-${pm.id}`] || 0);
      return sum + val;
    }, 0);
  };

  const getPaymentMethodColTotal = (pmId) => {
    return CONCEPTS.reduce((sum, c) => {
      const val = Number(incomesMap[`${c.key}-${pmId}`] || 0);
      return sum + val;
    }, 0);
  };

  const getGrandTotal = () => {
    if (pmLoading) return 0;
    return paymentMethods.reduce((sum, pm) => sum + getPaymentMethodColTotal(pm.id), 0);
  };

  if (pmLoading) {
    return (
      <div className="daily-incomes-container page-content">
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Cargando métodos de pago del sistema...
        </div>
      </div>
    );
  }

  return (
    <div className="daily-incomes-container page-content">
      {/* HEADER DE CONTROL */}
      <header className="incomes-header-card">
        <div className="incomes-header-title">
          <h2>Rendición de Caja</h2>
          <p>Registrá y consolidá los ingresos cobrados según el concepto y medio de pago.</p>
        </div>
        <div className="incomes-date-selector">
          <label htmlFor="incomes-date">Fecha de Planilla:</label>
          <input
            type="date"
            id="incomes-date"
            className="incomes-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </header>

      {/* CUADRO PRINCIPAL (ANCHO COMPLETO) */}
      <div className="incomes-matrix-card">
        <div className="incomes-reference-title">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
            {hasSavedData ? "Caja Declarada (Guardada)" : "Caja Sugerida por Sistema (Sin Guardar)"}
          </h3>
          {saveSuccess && (
            <span className="incomes-reference-badge">
              ✓ Planilla guardada exitosamente
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Cargando rendición del día...
          </div>
        ) : (
          <>
            {/* TABLA MATRIZ INTERACTIVA */}
            <div className="incomes-table-container">
              <table className="incomes-matrix-table">
                <thead>
                  <tr>
                    <th>Concepto / Ingreso</th>
                    {paymentMethods.map((pm) => (
                      <th key={pm.id} style={{ textAlign: "right" }}>
                        {pm.name}
                      </th>
                    ))}
                    <th style={{ textAlign: "right" }}>Total Fila</th>
                  </tr>
                </thead>
                <tbody>
                  {CONCEPTS.map((c) => (
                    <tr key={c.key}>
                      <td>
                        <div className="incomes-concept-cell" title={c.desc}>
                          <span className="incomes-concept-icon">{c.icon}</span>
                          <span>{c.label}</span>
                        </div>
                      </td>
                      {paymentMethods.map((pm) => {
                        const val = incomesMap[`${c.key}-${pm.id}`] ?? "";
                        return (
                          <td key={pm.id} style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <div className="incomes-amount-input-wrapper">
                                <span className="incomes-currency-symbol">$</span>
                                <input
                                  type="number"
                                  className="incomes-amount-input"
                                  placeholder="0"
                                  min="0"
                                  step="1"
                                  value={val}
                                  onChange={(e) => handleAmountChange(c.key, pm.id, e.target.value)}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "right" }}>
                        <span className="incomes-row-total">
                          {formatCurrency(getConceptRowTotal(c.key))}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* FILA DE TOTALES */}
                  <tr className="incomes-totals-row">
                    <td>Totales por Medio</td>
                    {paymentMethods.map((pm) => (
                      <td key={pm.id} style={{ textAlign: "right" }}>
                        {formatCurrency(getPaymentMethodColTotal(pm.id))}
                      </td>
                    ))}
                    <td style={{ textAlign: "right" }}>
                      <span className="incomes-grand-total">
                        {formatCurrency(getGrandTotal())}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OBSERVACIONES / NOTAS */}
            <div className="incomes-notes-section">
              <label htmlFor="incomes-notes">Notas Marginales / Aclaraciones de Caja</label>
              <textarea
                id="incomes-notes"
                className="incomes-notes-textarea"
                placeholder="Escribí notas rápidas, diferencias de caja, o recordatorios importantes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* BARRA DE ACCIONES */}
            <div className="incomes-actions-bar">
              <button
                type="button"
                className="incomes-btn incomes-btn--secondary"
                onClick={handleResetToSystem}
                disabled={saving}
                style={{ marginRight: "auto" }}
                title="Restablece todos los valores a la suma de las transacciones reales en el sistema para esta fecha"
              >
                🔄 Recomponer con datos del sistema
              </button>
              <button
                type="button"
                className="incomes-btn incomes-btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar Planilla"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
