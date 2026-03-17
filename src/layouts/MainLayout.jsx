// src/layouts/MainLayout.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar";
import logo from "../assets/bandidos-logo.jpg";

const LS_KEY = "bandidos_vio_recordatorios";

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState(!localStorage.getItem(LS_KEY));
  const navigate = useNavigate();

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
          <div className="app-header__brand">
            <div className="app-header__logo">
              <img src={logo} alt="Logo Bandidos" />
            </div>
            <div className="app-header__brand-text">
              <span className="app-header__brand-title">Bandidos</span>
              <span className="app-header__brand-subtitle">
                Peluquería Canina
              </span>
            </div>
          </div>

          <button
            type="button"
            className="app-header__menu-button"
            onClick={toggleSidebar}
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        <main className="app-main-content">{children}</main>
      </div>

      {/* Toast de bienvenida: Recordatorios */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
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
