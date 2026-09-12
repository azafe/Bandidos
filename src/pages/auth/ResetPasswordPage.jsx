// src/pages/auth/ResetPasswordPage.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { publicRequest } from "../../services/apiClient";
import "./login.css";

function IconLock() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="login-input__icon">
      <path
        d="M8.75 8V6.75a3.25 3.25 0 0 1 6.5 0V8h1.5A1.75 1.75 0 0 1 18.5 9.75v7.5A1.75 1.75 0 0 1 16.75 19h-9.5A1.75 1.75 0 0 1 5.5 17.25v-7.5A1.75 1.75 0 0 1 7.25 8h1.5zm1.5 0h3.5V6.75a1.75 1.75 0 0 0-3.5 0V8z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.password || !form.confirm) {
      setError("Completá ambos campos.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError(null);
    try {
      setSubmitting(true);
      await publicRequest("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: form.password },
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err?.message === "Invalid or expired token") {
        setError('Este link venció o ya fue usado. Pedí uno nuevo desde "Olvidé mi contraseña".');
      } else if (err?.message === "Password does not meet requirements") {
        setError("La contraseña debe tener al menos 8 caracteres.");
      } else {
        setError(err.message || "No pudimos actualizar la contraseña.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-default">🐾</div>
          </div>
          <h1 className="login-title">Link inválido</h1>
          <p className="login-subtitle">
            Este enlace de recuperación no es válido o está incompleto.
          </p>
          <div className="login-footer">
            <Link to="/forgot-password">Pedir un nuevo link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-default">🐾</div>
        </div>
        <h1 className="login-title">Nueva contraseña</h1>
        <p className="login-subtitle">{done ? "¡Listo!" : "Elegí tu nueva contraseña."}</p>

        {error && <div className="login-error">{error}</div>}

        {done ? (
          <div className="login-success">
            Contraseña actualizada. Te llevamos al inicio de sesión...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label" htmlFor="password">Nueva contraseña</label>
              <div className="login-input">
                <IconLock />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="confirm">Confirmar contraseña</label>
              <div className="login-input">
                <IconLock />
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting && <span className="login-spinner" aria-hidden="true" />}
              {submitting ? "Guardando..." : "Actualizar contraseña"}
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
