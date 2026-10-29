import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "@/lib/theme";

const STORAGE_KEY = "janeth-theme";

function leerTemaGuardado(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private mode */
  }
  return "light";
}

function sistemaOscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function aplicarClase(oscuro: boolean) {
  document.documentElement.classList.toggle("dark", oscuro);
  document.documentElement.style.colorScheme = oscuro ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(leerTemaGuardado);
  const [systemDark, setSystemDark] = useState(sistemaOscuro);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    aplicarClase(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
