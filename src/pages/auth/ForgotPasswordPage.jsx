// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { publicRequest } from "../../services/apiClient";
import "./login.css";

function IconMail() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="login-input__icon">
      <path
        d="M4 6.75C4 5.784 4.784 5 5.75 5h12.5C19.216 5 20 5.784 20 6.75v10.5c0 .966-.784 1.75-1.75 1.75H5.75C4.784 19 4 18.216 4 17.25V6.75zm1.75-.25a.25.25 0 0 0-.25.25v.317l6.5 4.55 6.5-4.55V6.75a.25.25 0 0 0-.25-.25H5.75zm12.75 2.384-5.96 4.172a1 1 0 0 1-1.08 0L5.5 8.884v8.366c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V8.884z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Ingresá tu email.");
      return;
    }

    setError(null);
    try {
      setSubmitting(true);
      await publicRequest("/auth/forgot-password", {
        method: "POST",
        body: { email: trimmed.toLowerCase() },
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "No pudimos procesar el pedido. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-default">🐾</div>
        </div>
        <h1 className="login-title">Recuperar contraseña</h1>
        <p className="login-subtitle">
          {sent
            ? "Revisá tu bandeja de entrada"
            : "Ingresá tu email y, si está registrado, te enviamos un link para restablecerla."}
        </p>

        {error && <div className="login-error">{error}</div>}

        {sent ? (
          <div className="login-success">
            Si el email está registrado, en unos minutos vas a recibir un correo con las
            instrucciones para elegir una nueva contraseña.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <div className="login-input">
                <IconMail />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  aria-label="Email"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting && <span className="login-spinner" aria-hidden="true" />}
              {submitting ? "Enviando..." : "Recuperar contraseña"}
            </button>
          </form>
        )}

        <div className="login-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
