"use client";

import { useThemeMode } from "@/context/ThemeContext";

export default function DashboardThemeShell({
  children,
}: {
  children: (args: { dark: boolean }) => React.ReactNode;
}) {
  const { mode } = useThemeMode();
  return <>{children({ dark: mode === "dark" })}</>;
}