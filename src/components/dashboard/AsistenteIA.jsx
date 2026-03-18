// src/components/dashboard/AsistenteIA.jsx
import { useState, useRef, useEffect } from "react";
import { fetchDashboardData } from "../../lib/dashboardApi";
import { buildDashboardMetrics } from "../../lib/dashboardMetrics";
import { apiRequest } from "../../services/apiClient";
import "../../styles/asistente-ia.css";

// --- Helpers de fecha ---
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  const today = new Date();
  const effectiveTo = to > today ? today : to;
  return {
    from: formatDate(from),
    to: formatDate(effectiveTo),
    label: from.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
  };
}

function getPreviousRange(range) {
  const from = new Date(range.from);
  const prevMonthEnd = new Date(from.getFullYear(), from.getMonth(), 0);
  const prevMonthStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  return {
    from: formatDate(prevMonthStart),
    to: formatDate(prevMonthEnd),
    label: "Mes anterior",
  };
}

function getFutureRange(today) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: formatDate(tomorrow), to: formatDate(endOfMonth) };
}

// --- Formatters ---
const fmt = (n) => `$${Math.round(n || 0).toLocaleString("es-AR")}`;
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const fmtDelta = (n) => (n >= 0 ? `+${fmtPct(n)}` : fmtPct(n));

// --- Construcción del system prompt con datos reales ---
function buildSystemPrompt(
  metrics,
  currentData,
  today,
  employees,
  serviceTypes,
  customers,
  products,
  futureAgenda
) {
  const { kpis, series, range } = metrics;
  const todayStr = formatDate(today);
  const services = currentData.services || [];

  // Maps de ID → nombre
  const employeeMap = new Map(
    (employees || []).map((e) => [String(e.id), e.name || e.nombre || ""])
  );
  const serviceTypeMap = new Map(
    (serviceTypes || []).map((st) => [String(st.id), st.name || st.nombre || ""])
  );

  const getPrice = (s) =>
    Number(s.final_price || s.service_type?.default_price || s.service_price || s.amount || s.price || 0) || 0;

  const getGroomerName = (s) =>
    employeeMap.get(String(s.groomer_id || "")) || (s.groomer_id ? `Groomer ${String(s.groomer_id).slice(0, 6)}` : "Sin groomer");

  const getServiceTypeName = (s) =>
    s.service_type?.name ||
    serviceTypeMap.get(String(s.service_type_id || "")) ||
    "Sin tipo";

  // Servicios de hoy
  const todayServices = services.filter((s) =>
    String(s.date || s.created_at || "").startsWith(todayStr)
  );
  const todayIncome = todayServices.reduce((acc, s) => acc + getPrice(s), 0);

  // Detalle de servicios del mes (máx 200 para no explotar el contexto)
  const servicesDetail = services
    .slice(0, 200)
    .map((s) => {
      const date = String(s.date || s.created_at || "").slice(0, 10);
      return `  ${date} | ${s.pet_name || "-"} (${s.breed || "-"}) | Dueño: ${s.owner_name || "-"} | Groomer: ${getGroomerName(s)} | Servicio: ${getServiceTypeName(s)} | ${fmt(getPrice(s))} | ${s.status || ""}`;
    })
    .join("\n") || "  Sin servicios registrados";

  // Revenue por groomer desde servicios raw
  const groomerRevenue = new Map();
  services.forEach((s) => {
    const name = getGroomerName(s);
    const amount = getPrice(s);
    const prev = groomerRevenue.get(name) || { total: 0, count: 0 };
    groomerRevenue.set(name, { total: prev.total + amount, count: prev.count + 1 });
  });
  const groomerLines =
    Array.from(groomerRevenue.entries())
      .filter(([, v]) => v.total > 0)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, v]) => `  - ${name}: ${fmt(v.total)} (${v.count} servicios, comisión est.: ${fmt(v.total * 0.4)})`)
      .join("\n") || "  Sin datos de groomers";

  // Revenue por tipo de servicio
  const typeRevenue = new Map();
  services.forEach((s) => {
    const name = getServiceTypeName(s);
    typeRevenue.set(name, (typeRevenue.get(name) || 0) + getPrice(s));
  });
  const serviceTypeLines =
    Array.from(typeRevenue.entries())
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, total]) => `  - ${name}: ${fmt(total)}`)
      .join("\n") || "  Sin datos";

  // Gastos diarios desglosados
  const dailyExpenseLines =
    (currentData.dailyExpenses || [])
      .map((e) => {
        const date = String(e.date || e.created_at || "").slice(0, 10);
        return `  ${date} | ${e.category?.name || e.category_name || e.categoryName || "Sin cat."} | ${e.description || "-"} | ${fmt(Number(e.amount || 0))} | ${e.payment_method?.name || e.paymentMethod || "-"}`;
      })
      .join("\n") || "  Sin gastos diarios registrados";

  // Gastos fijos desglosados
  const fixedExpenseLines =
    (currentData.fixedExpenses || [])
      .filter((e) => e.status === "active" || e.status === "Activo")
      .map((e) => `  - ${e.name || "Sin nombre"} | ${fmt(Number(e.amount || 0))} | Vence día ${e.due_day || e.dueDay || "-"}`)
      .join("\n") || "  Sin gastos fijos activos";

  // Gastos por categoría (resumen)
  const expenseCategoryLines =
    (series.expensesByCategory || [])
      .map((e) => `  - ${e.name}: ${fmt(e.value)}`)
      .join("\n") || "  Sin datos";

  // Clientes registrados (máx 100)
  const customerLines =
    (customers || [])
      .slice(0, 100)
      .map((c) => {
        const name = c.name || c.nombre || "-";
        const phone = c.phone || c.telefono || c.whatsapp || "";
        // Contar visitas en el mes desde services
        const visits = services.filter(
          (s) =>
            (s.owner_name || "").toLowerCase() === name.toLowerCase() ||
            String(s.customer_id || "") === String(c.id || "")
        ).length;
        return `  - ${name}${phone ? ` (${phone})` : ""}${visits > 0 ? ` | ${visits} visita(s) este mes` : ""}`;
      })
      .join("\n") || "  Sin clientes registrados";

  // Stock del petshop
  const productLines =
    (products || [])
      .map((p) => {
        const name = p.name || p.nombre || "-";
        const price = fmt(Number(p.price || p.precio || p.sale_price || 0));
        const stock = p.stock !== undefined ? ` | Stock: ${p.stock}` : "";
        return `  - ${name} | ${price}${stock}`;
      })
      .join("\n") || "  Sin productos registrados";

  // Agenda futura (turnos reservados)
  const futureItems = Array.isArray(futureAgenda)
    ? futureAgenda
    : futureAgenda?.items || [];
  const futureLines =
    futureItems
      .filter((t) => t.status === "reserved" || !t.status)
      .slice(0, 50)
      .map((t) => {
        const date = String(t.date || "").slice(0, 10);
        const time = t.time ? t.time.slice(0, 5) : "";
        return `  ${date} ${time} | ${t.pet_name || "-"} | Dueño: ${t.owner_name || "-"} | Groomer: ${getGroomerName(t)} | ${getServiceTypeName(t)}`;
      })
      .join("\n") || "  Sin turnos próximos reservados";

  // Comparativa mes anterior
  const deltas = kpis.deltas;
  const deltaSection = deltas
    ? `
COMPARATIVA CON MES ANTERIOR:
- Ingresos: ${fmtDelta(deltas.income)}
- Gastos: ${fmtDelta(deltas.expenses)}
- Profit: ${fmtDelta(deltas.profit)}
- Cantidad de servicios: ${fmtDelta(deltas.servicesCount)}
- Ticket promedio: ${fmtDelta(deltas.avgTicket)}`
    : "\nComparativa con mes anterior: no disponible";

  return `Sos el asistente de Bandidos Peluquería Canina. Ayudás al dueño/a a entender y gestionar el negocio con datos reales. Respondé en español argentino, de manera concisa y directa. Usá los números reales. Si te preguntan algo que no está en los datos, decilo claramente sin inventar.

=== DATOS DEL NEGOCIO ===
Período activo: ${range.label} (${range.from} al ${range.to})
Fecha de hoy: ${todayStr}

HOY (${todayStr}):
- Servicios realizados: ${todayServices.length}
- Ingresos: ${fmt(todayIncome)}

RESUMEN DEL MES:
- Ingresos totales: ${fmt(kpis.income)}
  · Servicios peluquería: ${fmt(kpis.servicesIncome)}
  · Petshop: ${fmt(kpis.petshopIncome)}
- Total servicios: ${kpis.servicesCount}
- Ticket promedio: ${fmt(kpis.avgTicket)}
- Gastos operativos: ${fmt(kpis.dailyExpenseTotal)}
- Gastos fijos: ${fmt(kpis.fixedExpenseTotal)}
- Comisiones groomers (40%): ${fmt(kpis.groomerCommissions)}
- Costo total: ${fmt(kpis.totalCosts)}
- Profit neto: ${fmt(kpis.profit)}
- Margen: ${fmtPct(kpis.margin)}
${deltaSection}

RENDIMIENTO POR GROOMER:
${groomerLines}

INGRESOS POR TIPO DE SERVICIO:
${serviceTypeLines}

GASTOS POR CATEGORÍA (resumen):
${expenseCategoryLines}

GASTOS DIARIOS DESGLOSADOS (formato: fecha | categoría | descripción | monto | método pago):
${dailyExpenseLines}

GASTOS FIJOS ACTIVOS:
${fixedExpenseLines}

DETALLE DE SERVICIOS DEL MES (formato: fecha | mascota (raza) | dueño | groomer | tipo servicio | precio | estado):
${servicesDetail}

TURNOS PRÓXIMOS RESERVADOS:
${futureLines}

CLIENTES REGISTRADOS:
${customerLines}

STOCK DEL PETSHOP:
${productLines}

=== FIN DE DATOS ===`;
}

// --- Sugerencias rápidas ---
const QUICK_SUGGESTIONS = [
  "¿Cuánto facturamos hoy?",
  "¿Qué groomer rindió más este mes?",
  "¿Cómo va el mes comparado con el anterior?",
  "¿Cuál es mi margen actual?",
  "¿Qué servicios generan más ingresos?",
];

// --- Íconos ---
function IconPaw() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="15" cy="16" rx="6" ry="9" />
      <ellipse cx="32" cy="11" rx="6" ry="9" />
      <ellipse cx="49" cy="16" rx="6" ry="9" />
      <ellipse cx="8" cy="32" rx="6" ry="8" />
      <path d="M32 22c-12 0-22 8-18 22 2 7 8 12 18 12s16-5 18-12c4-14-6-22-18-22z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l17 2-17 2z" />
    </svg>
  );
}

// --- Componente principal ---
export default function AsistenteIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(null);
  const [contextError, setContextError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Carga el contexto completo del negocio la primera vez que se abre
  useEffect(() => {
    if (!isOpen || systemPrompt !== null || isLoadingContext) return;

    async function loadContext() {
      setIsLoadingContext(true);
      setContextError(null);
      try {
        const today = new Date();
        const range = getMonthRange(0);
        const previousRange = getPreviousRange(range);
        const futureRange = getFutureRange(today);

        const [
          currentData,
          previousData,
          employeesRaw,
          serviceTypesRaw,
          customersRaw,
          productsRaw,
          futureAgendaRaw,
        ] = await Promise.all([
          fetchDashboardData(range),
          fetchDashboardData(previousRange),
          apiRequest("/v2/employees").catch(() => []),
          apiRequest("/v2/service-types").catch(() => []),
          apiRequest("/v2/customers").catch(() => []),
          apiRequest("/v2/petshop/products").catch(() => []),
          apiRequest("/agenda", { params: { from: futureRange.from, to: futureRange.to } }).catch(() => []),
        ]);

        const normalize = (raw) => (Array.isArray(raw) ? raw : raw?.items || []);

        const metrics = buildDashboardMetrics({
          range,
          current: currentData,
          previous: { range: previousRange, current: previousData },
          categories: currentData.categories,
        });

        setSystemPrompt(
          buildSystemPrompt(
            metrics,
            currentData,
            today,
            normalize(employeesRaw),
            normalize(serviceTypesRaw),
            normalize(customersRaw),
            normalize(productsRaw),
            normalize(futureAgendaRaw)
          )
        );
      } catch (err) {
        const fallback =
          "Sos el asistente de Bandidos Peluquería Canina. Los datos del negocio no pudieron cargarse. Respondé en español argentino e informá al usuario que los datos no están disponibles en este momento.";
        setSystemPrompt(fallback);
        setContextError("No pude cargar los datos del negocio.");
      } finally {
        setIsLoadingContext(false);
      }
    }

    loadContext();
  }, [isOpen, systemPrompt, isLoadingContext]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isLoadingContext || !systemPrompt) return;

    const userMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Nota: VITE_ANTHROPIC_API_KEY queda expuesta en el bundle del cliente.
      // Para producción, considerar mover la llamada a un proxy en el backend.
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("La variable VITE_ANTHROPIC_API_KEY no está configurada.");
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text || "No pude generar una respuesta.";
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: `Hubo un error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isInputDisabled = isLoading || isLoadingContext || !systemPrompt;
  const showWelcome = messages.length === 0 && !isLoadingContext;

  return (
    <>
      {!isOpen && (
        <button
          className="ai-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir asistente IA"
          type="button"
        >
          <IconPaw />
          <span>IA</span>
        </button>
      )}

      {isOpen && (
        <div className="ai-panel" role="dialog" aria-label="Asistente IA">
          <div className="ai-panel__header">
            <div className="ai-panel__header-info">
              <div className="ai-panel__avatar">
                <IconPaw />
              </div>
              <div>
                <div className="ai-panel__title">Asistente Bandidos</div>
                <div className="ai-panel__subtitle">
                  {isLoadingContext
                    ? "Cargando datos del negocio..."
                    : contextError
                    ? "Datos parciales"
                    : "Datos en tiempo real"}
                </div>
              </div>
            </div>
            <button
              className="ai-panel__close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente"
              type="button"
            >
              ×
            </button>
          </div>

          <div className="ai-panel__messages">
            {isLoadingContext && messages.length === 0 && (
              <div className="ai-loading-context">
                <div className="ai-typing">
                  <span />
                  <span />
                  <span />
                </div>
                <p>Cargando datos del negocio...</p>
              </div>
            )}

            {showWelcome && (
              <div className="ai-welcome">
                {contextError && (
                  <p className="ai-welcome__error">{contextError}</p>
                )}
                <p className="ai-welcome__text">
                  Hola! Tengo acceso a los datos completos del negocio. ¿En qué te puedo ayudar?
                </p>
                <div className="ai-suggestions">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="ai-suggestion"
                      onClick={() => sendMessage(s)}
                      type="button"
                      disabled={isInputDisabled}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ai-message--${msg.role}`}>
                <div className="ai-message__bubble">{msg.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message__bubble ai-message__bubble--typing">
                  <div className="ai-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="ai-panel__input" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoadingContext ? "Cargando datos..." : "Escribí tu pregunta..."}
              rows={1}
              disabled={isInputDisabled}
            />
            <button
              className="ai-send"
              type="submit"
              disabled={!input.trim() || isInputDisabled}
              aria-label="Enviar mensaje"
            >
              <IconSend />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
