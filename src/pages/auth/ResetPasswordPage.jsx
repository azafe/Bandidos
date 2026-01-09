// src/pages/auth/ResetPasswordPage.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get("email");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.password || !form.confirm) {
      alert("Completá ambos campos.");
      return;
    }
    if (form.password !== form.confirm) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    try {
      setSubmitting(true);
      // TODO: reemplazar por llamada real al backend de reseteo.
      alert("Contraseña actualizada.");
      navigate("/login");
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
            fontSize: "1.4rem",
            marginBottom: "8px",
          }}
        >
          Nueva contraseña
        </h1>
        <p style={{ fontSize: "0.9rem", marginBottom: "18px" }}>
          {email ? `Restableciendo para ${email}` : "Elegí tu nueva contraseña."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: "0.85rem", color: "#333" }}>
            Nueva contraseña
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

          <label style={{ fontSize: "0.85rem", color: "#333" }}>
            Confirmar contraseña
            <input
              name="confirm"
              type="password"
              value={form.confirm}
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

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          <Link to="/login" style={{ fontSize: "0.85rem", color: "#4a4a4a" }}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
