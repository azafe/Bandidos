// src/layouts/MainLayout.jsx
import { useState } from "react";
import Sidebar from "../components/navigation/Sidebar";

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Header solo visible en móvil */}
      <header className="mobile-header">
        <div className="mobile-header__brand">
          <div className="mobile-header__logo-circle" />
          <div className="mobile-header__brand-text">
            <span className="mobile-header__brand-title">Bandidos</span>
            <span className="mobile-header__brand-subtitle">
              Peluquería Canina
            </span>
          </div>
        </div>

        <button
          type="button"
          className="mobile-header__menu-btn"
          onClick={toggleSidebar}
        >
          ☰
        </button>
      </header>

      {/* Backdrop oscuro cuando el menú está abierto en móvil */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="app-container">
        <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
