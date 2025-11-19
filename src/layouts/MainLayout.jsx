// src/layouts/MainLayout.jsx
import Sidebar from "../components/navigation/Sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="app-main">{children}</main>
    </div>
  );
}