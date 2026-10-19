// src/pages/expenses/DailyIncomesPage.jsx
import { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { apiRequest } from "../../services/apiClient";
import { todayISO } from "../../utils/dates";
import { useAuth } from "../../context/AuthContext";
import RendicionesCaja from "../../components/traslados/RendicionesCaja";

const CONCEPTS = [
  { key: "traslados", label: "Traslados cobrados por el local", icon: "🚗", desc: "Cobros explícitos recibidos por el local" },
  { key: "servicios", label: "Servicios", icon: "✂️", desc: "Ingresos por prestaciones directas" },
  { key: "señas", label: "Señas / Anticipos", icon: "🎟️", desc: "Registro de reservas y señas" },
  { key: "ventas_petshop", label: "Ventas Pet Shop", icon: "🛍️", desc: "Comercialización de productos físicos" },
];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DailyIncomesPage() {
  const { user } = useAuth();
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [totalsMap, setTotalsMap] = useState({});
  const [totalsError, setTotalsError] = useState("");
  const [trasladosAmount, setTrasladosAmount] = useState(null);
  const [trasladosLoading, setTrasladosLoading] = useState(true);
  const [trasladosError, setTrasladosError] = useState("");

  const { items: paymentMethods, loading: pmLoading } = useApiResource("/v2/payment-methods");

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setTotalsMap({});
      setTotalsError("");
      try {
        const totals = await apiRequest(`/v2/daily-incomes/system-totals?date=${selectedDate}`);
        if (!active) return;
        const map = {};
        (totals || []).forEach((item) => {
          map[`${item.concept}-${item.payment_method_id}`] = Number(item.amount) || 0;
        });
        setTotalsMap(map);
      } catch (err) {
        console.error("[daily-incomes] Error cargando totales", err);
        if (active) setTotalsError("No se pudo cargar la rendición. Volvé a elegir la fecha para reintentar.");
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadTraslados() {
      setTrasladosLoading(true);
      setTrasladosAmount(null);
      setTrasladosError("");
      try {
        const summary = await apiRequest("/v2/daily-incomes/traslados-summary", { params: { date: selectedDate } });
        if (active) setTrasladosAmount(summary.amount);
      } catch (err) {
        console.error("[daily-incomes] Error cargando traslados", err);
        if (active) setTrasladosError("No se pudo cargar lo cobrado por choferes. Volvé a elegir la fecha para reintentar.");
      } finally {
        if (active) setTrasladosLoading(false);
      }
    }
    loadData();
    loadTraslados();
    return () => { active = false; };
  }, [selectedDate]);

  const getConceptRowTotal = (concept) => {
    if (pmLoading) return 0;
    return paymentMethods.reduce((sum, pm) => sum + (totalsMap[`${concept}-${pm.id}`] || 0), 0);
  };

  const getPaymentMethodColTotal = (pmId) => {
    return CONCEPTS.reduce((sum, c) => sum + (totalsMap[`${c.key}-${pmId}`] || 0), 0);
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
      <header className="incomes-header-card">
        <div className="incomes-header-title">
          <h2>Rendición de Caja</h2>
          <p>Resumen de ingresos del día calculado automáticamente desde las operaciones del sistema.</p>
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

      <div className="incomes-matrix-card">
        <div className="incomes-reference-title">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Totales del Sistema</h3>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Cargando rendición del día...
          </div>
        ) : totalsError ? (
          <p role="alert">{totalsError}</p>
        ) : (
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
                    {paymentMethods.map((pm) => (
                      <td key={pm.id} style={{ textAlign: "right" }}>
                        <span className="incomes-row-total">
                          {formatCurrency(totalsMap[`${c.key}-${pm.id}`] || 0)}
                        </span>
                      </td>
                    ))}
                    <td style={{ textAlign: "right" }}>
                      <span className="incomes-row-total">
                        {formatCurrency(getConceptRowTotal(c.key))}
                      </span>
                    </td>
                  </tr>
                ))}

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
        )}
      </div>

      <section className="incomes-reference-card incomes-traslados-info" aria-labelledby="traslados-info-title">
        <h3 id="traslados-info-title">Cobrado por choferes (no entra a caja)</h3>
        {trasladosLoading ? (
          <p>Cargando traslados del día...</p>
        ) : trasladosError ? (
          <p role="alert">{trasladosError}</p>
        ) : (
          <strong className="incomes-ref-item-total">{formatCurrency(trasladosAmount)}</strong>
        )}
        <p className="incomes-ref-help">Cobros de choferes registrados en la fecha elegida. Los registros anteriores sin detalle conservan su fecha de turno. Está separado de los totales de caja.</p>
      </section>
      {user?.role === "admin" && !user?.chofer_id && <RendicionesCaja fecha={selectedDate} />}
    </div>
  );
}
