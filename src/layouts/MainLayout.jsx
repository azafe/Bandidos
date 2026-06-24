// src/layouts/MainLayout.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar";
import AsistenteIA from "../components/dashboard/AsistenteIA";

const LS_KEY = "bandidos_vio_recordatorios";

const PAGE_TITLES = {
  "/":                        "Inicio",
  "/agenda":                  "Agenda",
  "/services":                "Servicios",
  "/pets":                    "Mascotas",
  "/customers":               "Clientes",
  "/expenses/daily-incomes":  "Rendición de Caja",
  "/expenses/daily":          "Gastos Diarios",
  "/expenses/fixed":          "Gastos Fijos",
  "/employees":               "Equipo",
  "/suppliers":               "Proveedores",
  "/catalog/service-types":   "Tipos de Servicio",
  "/catalog/payment-methods": "Métodos de Pago",
  "/catalog/expense-categories": "Categorías de Gastos",
  "/admin/users":             "Usuarios",
  "/petshop":                 "PetShop",
  "/comunicaciones":          "Comunicaciones",
};

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState(!localStorage.getItem(LS_KEY));
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const pageTitle = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k) && k !== "/") ?? ""] ?? "Bandidos";

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside
        className={`app-sidebar ${
          isSidebarOpen ? "app-sidebar--open" : ""
        }`}
      >
        <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />
      </aside>

      {/* OVERLAY para mobile */}
      <div
        className={`app-overlay ${
          isSidebarOpen ? "app-overlay--visible" : ""
        }`}
        onClick={closeSidebar}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div className="app-main">
        {/* HEADER: solo visible en mobile (lo controlamos por CSS) */}
        <header className="app-header">
          <button
            type="button"
            className="app-header__hamburger"
            onClick={toggleSidebar}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <h1 className="app-header__page-title">{pageTitle}</h1>
        </header>

        <main className="app-main-content">{children}</main>
      </div>

      {/* Asistente IA: solo en Inicio */}
      {pathname === "/" && <AsistenteIA />}

      {/* Toast de bienvenida: Recordatorios */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            right: "calc(24px + env(safe-area-inset-right, 0px))",
            zIndex: 9999,
            background: "#1f2937",
            color: "#fff",
            borderRadius: 12,
            padding: "14px 18px",
            maxWidth: 300,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                🐾 Nueva función: Recordatorios
              </div>
              <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.4 }}>
                Enviá mensajes de WhatsApp a clientes que llevan semanas sin turno.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(LS_KEY, "true");
                setShowToast(false);
                navigate("/recordatorios");
              }}
              style={{
                flex: 1,
                background: "#25D366",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Ver ahora
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(LS_KEY, "true");
                setShowToast(false);
              }}
              style={{
                flex: 1,
                background: "#374151",
                color: "#d1d5db",
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Ahora no
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
