"use client";

import Link from "next/link";
import Image from "next/image";
import SettingsMenu from "@/components/SettingsMenu";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  displayName: string;
};

export default function AppNavbarClient({
  email,
  role,
  displayName,
}: Props) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur ${
        isDark
          ? "border-white/8 bg-[#0d1117]/90"
          : "border-[#e7dfd4] bg-[#fffdf9]/95"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className={`relative h-10 w-10 overflow-hidden rounded-xl border shadow-sm ${
              isDark ? "border-white/10 bg-white/5" : "border-[#e7dfd4] bg-white"
            }`}
          >
            <Image
              src="/logo.png"
              alt="Company logo"
              fill
              className="object-contain p-1.5"
              priority
            />
          </div>

          <div className="leading-tight">
            <div
              className={`text-sm font-semibold tracking-tight ${
                isDark ? "text-slate-100" : "text-[#1a1814]"
              }`}
            >
              DTT Asset Management
            </div>
            <div
              className={`text-[11px] font-medium ${
                isDark ? "text-slate-500" : "text-[#8b857c]"
              }`}
            >
              Secure inventory & site assets
            </div>
          </div>
        </Link>

        <nav
          className={`hidden items-center gap-2 rounded-full border px-2 py-1 sm:flex ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-[#e7dfd4] bg-white"
          }`}
        >
          <NavItem href="/dashboard" label="Dashboard" isDark={isDark} />
          <NavItem href="/sites" label="Sites" isDark={isDark} />
          <NavItem href="/store" label="Store" isDark={isDark} />
        </nav>

        <SettingsMenu
          email={email}
          role={role}
          displayName={displayName}
        />
      </div>

      <div
        className={`sm:hidden ${
          isDark
            ? "border-t border-white/8 bg-[#101720]"
            : "border-t border-[#efe8de] bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <NavItem href="/dashboard" label="Dashboard" isDark={isDark} mobile />
          <NavItem href="/sites" label="Sites" isDark={isDark} mobile />
          <NavItem href="/store" label="Store" isDark={isDark} mobile />
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  label,
  isDark,
  mobile = false,
}: {
  href: string;
  label: string;
  isDark: boolean;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        mobile
          ? isDark
            ? "rounded-full px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white"
            : "rounded-full px-3 py-1.5 text-sm font-medium text-[#4a4740] transition hover:bg-[#f5f2ed]"
          : isDark
          ? "rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
          : "rounded-full px-4 py-2 text-sm font-semibold text-[#4a4740] transition hover:bg-[#f5f2ed] hover:text-[#1a1814]"
      }
    >
      {label}
    </Link>
  );
}