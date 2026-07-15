import { useEffect } from "react";
import { useAppStore } from "../state/useAppStore.js";

/**
 * Thin selector over the Zustand store that applies the `dark` class to
 * <html> whenever the theme changes. Replaces the inline useEffect that
 * previously lived in App().
 *
 * Returns [theme, toggleTheme] so call sites can read and toggle without
 * importing the store directly.
 */
export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return [theme, toggleTheme];
}
