// src/components/dashboard/AsistenteIA.jsx
import { useState, useRef, useEffect } from "react";
import { fetchDashboardData } from "../../lib/dashboardApi";
import { buildDashboardMetrics } from "../../lib/dashboardMetrics";
import "../../styles/asistente-ia.css";

// --- Helpers de rango de fecha (duplicados de DashboardHome para ser autónomos) ---
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

// --- Formatters ---
const fmt = (n) => `$${Math.round(n || 0).toLocaleString("es-AR")}`;
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const fmtDelta = (n) => (n >= 0 ? `+${fmtPct(n)}` : fmtPct(n));

// --- Construcción del system prompt con datos reales ---
function buildSystemPrompt(metrics, currentData, today) {
  const { kpis, series, range } = metrics;
  const todayStr = formatDate(today);

  // Servicios de hoy filtrados del raw data
  const todayServices = (currentData.services || []).filter((s) => {
    const d = String(s.date || s.created_at || s.createdAt || "");
    return d.startsWith(todayStr);
  });
  const todayIncome = todayServices.reduce(
    (acc, s) =>
      acc +
      (Number(
        s.final_price ||
          s.service_type?.default_price ||
          s.service_price ||
          s.amount ||
          s.price ||
          0
      ) || 0),
    0
  );

  // Groomers
  const groomerLines =
    (series.groomerRevenue || [])
      .map((g) => `  - ${g.name}: ${fmt(g.total)} (${g.services} servicios, comisión estimada: ${fmt(g.total * 0.4)})`)
      .join("\n") || "  Sin datos de groomers disponibles";

  // Gastos por categoría
  const expenseLines =
    (series.expensesByCategory || [])
      .map((e) => `  - ${e.name}: ${fmt(e.value)}`)
      .join("\n") || "  Sin gastos registrados";

  // Tipos de servicio top 5
  const serviceTypeLines =
    (series.revenueByServiceType || [])
      .slice(0, 5)
      .map((s) => `  - ${s.name}: ${fmt(s.total)}`)
      .join("\n") || "  Sin datos de tipos de servicio";

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

  // TODO: agregar turnos del día desde /agenda con fecha de hoy cuando el endpoint lo soporte por día
  // TODO: agregar lista de clientes frecuentes cuando el endpoint /clientes esté disponible

  return `Sos el asistente financiero de Bandidos Peluquería Canina. Tu función es ayudar al dueño/a a entender la situación del negocio con datos reales. Respondé en español argentino, de manera concisa y directa. Usá los números reales que te doy. Si alguien pregunta algo que no está en los datos, decilo claramente sin inventar cifras.

=== DATOS DEL NEGOCIO ===
Período activo: ${range.label} (${range.from} al ${range.to})
Fecha de hoy: ${todayStr}

HOY (${todayStr}):
- Servicios realizados: ${todayServices.length}
- Ingresos estimados: ${fmt(todayIncome)}

RESUMEN DEL MES (${range.label}):
- Ingresos totales: ${fmt(kpis.income)}
  · Por servicios de peluquería: ${fmt(kpis.servicesIncome)}
  · Por ventas petshop: ${fmt(kpis.petshopIncome)}
- Total servicios: ${kpis.servicesCount}
- Ticket promedio: ${fmt(kpis.avgTicket)}
- Gastos operativos (diarios): ${fmt(kpis.dailyExpenseTotal)}
- Gastos fijos mensuales: ${fmt(kpis.fixedExpenseTotal)}
- Total gastos: ${fmt(kpis.expenses)}
- Comisiones peluqueros (40% sobre servicios): ${fmt(kpis.groomerCommissions)}
- Costo total (gastos + comisiones): ${fmt(kpis.totalCosts)}
- Profit neto: ${fmt(kpis.profit)}
- Margen neto: ${fmtPct(kpis.margin)}
${deltaSection}

RENDIMIENTO POR GROOMER:
${groomerLines}

GASTOS POR CATEGORÍA:
${expenseLines}

INGRESOS POR TIPO DE SERVICIO (top 5):
${serviceTypeLines}

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

// --- Icono de chat (patita SVG) ---
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

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus en el input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Carga el contexto del negocio la primera vez que se abre
  useEffect(() => {
    if (!isOpen || systemPrompt !== null || isLoadingContext) return;

    async function loadContext() {
      setIsLoadingContext(true);
      setContextError(null);
      try {
        const range = getMonthRange(0);
        const previousRange = getPreviousRange(range);
        const [currentData, previousData] = await Promise.all([
          fetchDashboardData(range),
          fetchDashboardData(previousRange),
        ]);
        // DEBUG TEMPORAL: ver estructura cruda de los datos
        console.log("[AsistenteIA] primer servicio:", currentData.services?.[0]);
        console.log("[AsistenteIA] groomerReport:", currentData.groomerReport);
        console.log("[AsistenteIA] total servicios:", currentData.services?.length);

        const metrics = buildDashboardMetrics({
          range,
          current: currentData,
          previous: { range: previousRange, current: previousData },
          categories: currentData.categories,
        });

        console.log("[AsistenteIA] groomerRevenue calculado:", metrics.series.groomerRevenue);
        console.log("[AsistenteIA] revenueByServiceType:", metrics.series.revenueByServiceType);

        setSystemPrompt(buildSystemPrompt(metrics, currentData, new Date()));
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
      // Para producción, considerar proxy en el backend.
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
          max_tokens: 1000,
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
        {
          role: "assistant",
          content: `Hubo un error: ${err.message}`,
        },
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
      {/* Botón flotante */}
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

      {/* Panel de chat */}
      {isOpen && (
        <div className="ai-panel" role="dialog" aria-label="Asistente IA">
          {/* Header */}
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
                    ? "Datos no disponibles"
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

          {/* Mensajes */}
          <div className="ai-panel__messages">
            {/* Estado de carga inicial */}
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

            {/* Bienvenida con sugerencias rápidas */}
            {showWelcome && (
              <div className="ai-welcome">
                {contextError && (
                  <p className="ai-welcome__error">{contextError}</p>
                )}
                <p className="ai-welcome__text">
                  Hola! Tengo acceso a los datos reales del negocio. ¿En qué te puedo ayudar?
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

            {/* Historial de mensajes */}
            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ai-message--${msg.role}`}>
                <div className="ai-message__bubble">{msg.content}</div>
              </div>
            ))}

            {/* Indicador de escritura */}
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

          {/* Input */}
          <form className="ai-panel__input" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isLoadingContext
                  ? "Cargando datos..."
                  : "Escribí tu pregunta..."
              }
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
