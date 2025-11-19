// src/pages/auth/LoginPage.jsx
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #262938, #111217 55%)",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "24px 28px",
          borderRadius: "16px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
          maxWidth: "360px",
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
          Inicio de sesión (más adelante lo conectamos).
        </p>

        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Por ahora este login es solo de prueba. Podés navegar directo al
          dashboard desde <code>/</code>.
        </p>
      </div>
    </div>
  );
}