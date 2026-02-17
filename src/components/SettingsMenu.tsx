"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
};

export default function SettingsMenu({ email, role }: Props) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const isAdmin = role === "ADMIN";
  const initial = (email?.[0] ?? "U").toUpperCase();

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  function handleLogout() {
    closeMenu();
    // Submit a REAL POST request so the /auth/logout route.ts runs and redirects
    formRef.current?.requestSubmit();
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary className="list-none cursor-pointer rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
            {initial}
          </span>

          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-gray-900">{email}</div>
            <div className="text-[11px] text-gray-500">{role}</div>
          </div>

          <span className="text-gray-500">▾</span>
        </div>
      </summary>

      <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border bg-white shadow-lg">
        <div className="px-4 py-3">
          <div className="text-xs font-semibold text-gray-900">{email}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">Role: {role}</div>
        </div>

        <div className="h-px bg-gray-100" />

        {isAdmin ? (
          <Link
            href="/admin/users"
            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            onClick={closeMenu}
          >
            Admin Settings
          </Link>
        ) : null}

        <div className="h-px bg-gray-100" />

        {/* REAL POST -> hits src/app/(auth)/auth/logout/route.ts */}
        <form ref={formRef} action="/auth/logout" method="post">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>

          {/* Hidden submit so requestSubmit() works consistently */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </div>
    </details>
  );
}
