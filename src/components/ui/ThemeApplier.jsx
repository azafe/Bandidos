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
      root.style.setProperty("--color-primary-light", `${primary}33`);
      root.style.setProperty("--color-primary-dark", primary);
      root.style.setProperty("--color-focus", primary);
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
    };
  }, [user]);

  return null;
}
