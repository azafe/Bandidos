// src/layouts/MainLayout.jsx
import { useState } from "react";
import Sidebar from "../components/navigation/Sidebar";
import logo from "../assets/bandidos-logo.jpg";

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    </div>
  );
}
