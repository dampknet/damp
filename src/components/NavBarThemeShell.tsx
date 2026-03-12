"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

export default function NavbarThemeShell({
  brand,
  settings,
}: {
  brand: React.ReactNode;
  settings: React.ReactNode;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur ${
        dark
          ? "border-white/8 bg-[#0d1117]/90 text-slate-200"
          : "border-[#e7dfd4] bg-[#fffdf9]/95 text-[#1a1814]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div
          className={
            dark
              ? "[&_.text-sm]:text-slate-100 [&_.text-[11px]]:text-slate-500"
              : "[&_.text-sm]:text-[#1a1814] [&_.text-[11px]]:text-[#8b857c]"
          }
        >
          {brand}
        </div>

        <nav
          className={`hidden items-center gap-2 rounded-full border px-2 py-1 sm:flex ${
            dark
              ? "border-white/10 bg-white/5"
              : "border-[#e7dfd4] bg-white"
          }`}
        >
          <NavItem href="/dashboard" label="Dashboard" dark={dark} />
          <NavItem href="/sites" label="Sites" dark={dark} />
          <NavItem href="/store" label="Store" dark={dark} />
        </nav>

        {settings}
      </div>

      <div
        className={`sm:hidden ${
          dark
            ? "border-t border-white/8 bg-[#101720]"
            : "border-t border-[#efe8de] bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <NavItem href="/dashboard" label="Dashboard" dark={dark} mobile />
          <NavItem href="/sites" label="Sites" dark={dark} mobile />
          <NavItem href="/store" label="Store" dark={dark} mobile />
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  label,
  dark,
  mobile = false,
}: {
  href: string;
  label: string;
  dark: boolean;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        mobile
          ? dark
            ? "rounded-full px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/8"
            : "rounded-full px-3 py-1.5 text-sm font-medium text-[#4a4740] hover:bg-[#f5f2ed]"
          : dark
          ? "rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
          : "rounded-full px-4 py-2 text-sm font-semibold text-[#4a4740] transition hover:bg-[#f5f2ed] hover:text-[#1a1814]"
      }
    >
      {label}
    </Link>
  );
}