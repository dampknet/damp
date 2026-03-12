"use client";

import * as React from "react";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("dtt-theme-mode");
    if (saved === "dark" || saved === "light") {
      setModeState(saved);
    }
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    window.localStorage.setItem("dtt-theme-mode", mode);

    const root = document.documentElement;
    root.dataset.theme = mode;

    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [mode, mounted]);

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggleMode = React.useCallback(() => {
    setModeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}