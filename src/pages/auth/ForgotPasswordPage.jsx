// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      alert("Ingresá tu email.");
      return;
    }

    try {
      setSubmitting(true);
      // TODO: reemplazar por llamada real al backend de recuperación.
      alert("Te enviamos un link para recuperar la contraseña.");
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
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
          Recuperar contraseña
        </h1>
        <p style={{ fontSize: "0.9rem", marginBottom: "18px" }}>
          Ingresá tu email y te enviamos un link para restablecerla.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: "0.85rem", color: "#333" }}>
            Email
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Recuperar contraseña"}
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
