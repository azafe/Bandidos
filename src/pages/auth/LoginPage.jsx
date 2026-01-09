// src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", role: "admin" });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      alert("Completá email y contraseña.");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register({
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      navigate("/");
    } catch (err) {
      alert(err.message || "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top left, #262938, #111217 55%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "24px 28px",
          borderRadius: "16px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
          maxWidth: "380px",
          width: "100%",
        }}
      >
        <h1
          style={{
            fontFamily: "Fredoka, system-ui, sans-serif",
            fontSize: "1.6rem",
            marginBottom: "8px",
          }}
        >
          Bandidos · Panel
        </h1>
        <p style={{ fontSize: "0.9rem", marginBottom: "18px" }}>
          {mode === "login" ? "Inicio de sesión" : "Crear cuenta de acceso"}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={mode === "login" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("login")}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={mode === "register" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("register")}
          >
            Registrar
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: "0.85rem", color: "#333" }}>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              required
            />
          </label>

          <label style={{ fontSize: "0.85rem", color: "#333" }}>
            Contraseña
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              required
            />
          </label>

          {mode === "register" && (
            <label style={{ fontSize: "0.85rem", color: "#333" }}>
              Rol
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                }}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </label>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting
              ? "Procesando..."
              : mode === "login"
                ? "Ingresar"
                : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
