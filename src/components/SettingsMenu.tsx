"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  email:         string;
  role:          "ADMIN" | "EDITOR" | "VIEWER";
  isMasterAdmin:    boolean;
  hasLocalPassword: boolean;
  displayName:      string;
};

export default function SettingsMenu({
  email,
  role,
  isMasterAdmin,
  hasLocalPassword,
  displayName,
}: Props) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const { mode, toggleMode } = useThemeMode();
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin   = role === "ADMIN";
  const isDark    = mode === "dark";
  const roleLabel = isMasterAdmin ? "MASTER ADMIN" : role;
  const safeName  = displayName.trim() || email;
  const initial   = (safeName?.[0] ?? email?.[0] ?? "U").toUpperCase();

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }

    function onClickOutside(e: MouseEvent) {
      const root = detailsRef.current;
      if (!root || !root.open) return;
      if (!root.contains(e.target as Node)) closeMenu();
    }

    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  async function handleLogout() {
    closeMenu();
    setSigningOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  }

  const itemCls = `block px-5 py-3 text-sm font-medium transition ${
    isDark ? "text-slate-200 hover:bg-white/5" : "text-[#2f2a25] hover:bg-[#faf7f2]"
  }`;
  const subCls  = `mt-0.5 text-[11px] ${isDark ? "text-slate-500" : "text-[#8b857c]"}`;
  const divider = isDark ? "h-px bg-white/8" : "h-px bg-[#f0e6dc]";

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={`list-none cursor-pointer rounded-2xl border px-3 py-2 text-sm shadow-sm transition ${
          isDark
            ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            : "border-[#e7dfd4] bg-white hover:bg-[#faf7f2]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
              isDark
                ? "bg-[linear-gradient(135deg,#1d5fa8,#60a5fa)] text-white"
                : "bg-[#f3efe8] text-[#4a4740]"
            }`}
          >
            {initial}
          </span>

          <div className="hidden text-left sm:block">
            <div className={`max-w-37.5 truncate text-xs font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
              {safeName}
            </div>
            <div className={`text-[11px] font-medium ${isMasterAdmin ? "text-amber-500" : isDark ? "text-slate-500" : "text-gray-500"}`}>
              {roleLabel}
            </div>
          </div>

          <span className={isDark ? "text-slate-500" : "text-gray-500"}>▾</span>
        </div>
      </summary>

      <div
        className={`absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl ${
          isDark ? "border-white/10 bg-[#101720]/95" : "border-[#eadfd3] bg-white/95"
        }`}
      >
        <div
          className={`px-5 py-4 ${
            isDark
              ? "bg-[linear-gradient(135deg,rgba(29,95,168,0.18),rgba(59,130,246,0.08))]"
              : "bg-[linear-gradient(135deg,#fffaf5,#f8f2ea)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold ${
                isDark ? "bg-[linear-gradient(135deg,#1d5fa8,#60a5fa)] text-white" : "bg-[#1a1814] text-white"
              }`}
            >
              {initial}
            </div>

            <div className="min-w-0">
              <div className={`max-w-45 truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-[#1a1814]"}`}>
                {safeName}
              </div>
              <div className={`mt-0.5 truncate text-[11px] ${isDark ? "text-slate-500" : "text-[#8b857c]"}`}>
                {email}
              </div>
              <div
                className={`mt-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                  isMasterAdmin ? "text-amber-500" : isDark ? "text-[#60a5fa]" : "text-[#c8611a]"
                }`}
              >
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        <div className={divider} />

        <button
          type="button"
          onClick={() => {
            toggleMode();
            closeMenu();
          }}
          className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium transition ${
            isDark ? "text-slate-200 hover:bg-white/5" : "text-[#2f2a25] hover:bg-[#faf7f2]"
          }`}
        >
          <div>
            <div className="font-semibold">{isDark ? "Light Mode" : "Dark Mode"}</div>
            <div className={subCls}>Switch dashboard appearance</div>
          </div>

          <div
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isDark ? "bg-[#1d5fa8]/20 text-[#60a5fa]" : "bg-[#edf4ff] text-[#1d5fa8]"
            }`}
          >
            {isDark ? "ON" : "OFF"}
          </div>
        </button>

        {hasLocalPassword && (
          <>
            <div className={divider} />
            <Link href="/auth/change-password" className={itemCls} onClick={closeMenu}>
              <div className="font-semibold">Change Password</div>
              <div className={subCls}>Update your local sign-in password</div>
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <div className={divider} />
            <Link href="/admin" className={itemCls} onClick={closeMenu}>
              <div className="font-semibold">Admin Settings</div>
              <div className={subCls}>
                {isMasterAdmin ? "Users, security and system settings" : "Recycle bin, backups and audit trail"}
              </div>
            </Link>

            <div className={divider} />
            <Link href="/admin/deleted-items" className={itemCls} onClick={closeMenu}>
              <div className="font-semibold">Deleted Items</div>
              <div className={subCls}>Restore or permanently remove deleted records</div>
            </Link>
          </>
        )}

        <div className={divider} />

        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className={`w-full px-5 py-3 text-left text-sm font-medium transition disabled:opacity-60 ${
            isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"
          }`}
        >
          <div className="font-semibold">{signingOut ? "Signing out…" : "Logout"}</div>
          <div className={subCls}>End your current session</div>
        </button>
      </div>
    </details>
  );
}
