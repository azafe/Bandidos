// src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/bandidos-logo.jpg";
import { useAuth } from "../../context/AuthContext";
import "./login.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      alert("Completá email y contraseña.");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });
      navigate("/");
    } catch (err) {
      if (err?.message === "Invalid request body") {
        alert("Credenciales inválidas. Verificá email y contraseña (mínimo 6 caracteres).");
      } else {
        alert(err.message || "No se pudo iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Logo Bandidos" />
        </div>
        <h1 className="login-title">Bandidos</h1>
        <p className="login-subtitle">Inicio de sesión</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <div className="login-input">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="login-input__icon"
            >
              <path
                d="M4 6.75C4 5.784 4.784 5 5.75 5h12.5C19.216 5 20 5.784 20 6.75v10.5c0 .966-.784 1.75-1.75 1.75H5.75C4.784 19 4 18.216 4 17.25V6.75zm1.75-.25a.25.25 0 0 0-.25.25v.317l6.5 4.55 6.5-4.55V6.75a.25.25 0 0 0-.25-.25H5.75zm12.75 2.384-5.96 4.172a1 1 0 0 1-1.08 0L5.5 8.884v8.366c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V8.884z"
                fill="currentColor"
              />
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              autoComplete="email"
              aria-label="Email"
              required
            />
          </div>

          <label className="login-label" htmlFor="password">
            Contraseña
          </label>
          <div className="login-input">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="login-input__icon"
            >
              <path
                d="M8.75 8V6.75a3.25 3.25 0 0 1 6.5 0V8h1.5A1.75 1.75 0 0 1 18.5 9.75v7.5A1.75 1.75 0 0 1 16.75 19h-9.5A1.75 1.75 0 0 1 5.5 17.25v-7.5A1.75 1.75 0 0 1 7.25 8h1.5zm1.5 0h3.5V6.75a1.75 1.75 0 0 0-3.5 0V8z"
                fill="currentColor"
              />
            </svg>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-label="Contraseña"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting && <span className="login-spinner" aria-hidden="true" />}
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/forgot-password">Olvidé mi contraseña</Link>
        </div>
      </div>
    </div>
  );
}
