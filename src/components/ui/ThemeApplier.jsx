import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ThemeApplier() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const root = document.documentElement;
    const primary = user.primary_color;
    const secondary = user.secondary_color;

    if (primary) {
      root.style.setProperty("--color-primary", primary);
      // Intentar derivar colores si es posible, o usar el mismo
      root.style.setProperty("--color-primary-light", `${primary}33`); // 20% opacity hex
      root.style.setProperty("--color-primary-dark", primary);
      root.style.setProperty("--color-focus", primary);
      
      // Actualizar el gradiente del body dinámicamente
      document.body.style.background = `
        radial-gradient(circle at 20% 0%, ${primary}40, transparent 55%),
        radial-gradient(circle at 80% 10%, ${secondary || "#50e6dc"}33, transparent 60%),
        radial-gradient(circle at 40% 60%, ${primary}38, transparent 65%),
        radial-gradient(circle at top left, #2a2e45, #0f1016 60%)
      `;
    }

    if (secondary) {
      root.style.setProperty("--color-accent", secondary);
      root.style.setProperty("--color-accent-strong", secondary);
    }

    return () => {
      // Opcional: limpiar estilos al desloguear
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-primary-light");
      root.style.removeProperty("--color-primary-dark");
      root.style.removeProperty("--color-accent");
      root.style.removeProperty("--color-accent-strong");
      root.style.removeProperty("--color-focus");
      document.body.style.background = "";
    };
  }, [user]);

  return null;
}
