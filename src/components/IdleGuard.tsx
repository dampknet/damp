"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Clock } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import { WARN_MS, PING_EVERY_MS, idleLimitFor, isIssuePage } from "@/lib/session-policy";

// Shared between all open tabs of the app through localStorage.
const LAST_ACTIVITY_KEY = "kims:lastActivity";
const LOGOUT_KEY        = "kims:logout";
const ACTIVITY_EVENTS   = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"] as const;

function readShared(): number {
  try { return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0; } catch { return 0; }
}
function writeShared(t: number) {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(t)); } catch {}
}

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Signs the user out after inactivity (30 min; 2 h on the issue page), with a 2-minute warning.
export default function IdleGuard() {
  const pathname = usePathname();
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  const limit        = idleLimitFor(pathname);
  const lastLocal    = useRef(Date.now());
  const lastWrite    = useRef(0);
  const lastPing     = useRef(0);
  const loggingOut   = useRef(false);
  const [remaining, setRemaining] = useState(limit);

  const lastActivity = () => Math.max(lastLocal.current, readShared());

  const goToLogin = useCallback(() => {
    window.location.href = `/auth/login?error=idle&callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }, []);

  // Tell the server the user is active (moves the server-side clock and keeps the cookie browser-session only).
  const ping = useCallback(async () => {
    lastPing.current = Date.now();
    try {
      const res = await fetch("/api/session/activity", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ issuePage: isIssuePage(window.location.pathname) }),
      });
      if (res.status === 401 && !loggingOut.current) {
        // The server already ended this session (e.g. it was idle while the browser was closed).
        loggingOut.current = true;
        goToLogin();
      }
    } catch {}
  }, [goToLogin]);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try { localStorage.setItem(LOGOUT_KEY, String(Date.now())); } catch {}
    try { await fetch("/api/session/idle-logout", { method: "POST" }); } catch {}
    const back = window.location.pathname + window.location.search;
    await signOut({ callbackUrl: `/auth/login?error=idle&callbackUrl=${encodeURIComponent(back)}` });
  }, []);

  const markActive = useCallback(() => {
    if (loggingOut.current) return;
    const now = Date.now();
    lastLocal.current = now;
    if (now - lastWrite.current > 5_000) { lastWrite.current = now; writeShared(now); }
    if (now - lastPing.current > PING_EVERY_MS) ping();
  }, [ping]);

  // Activity listeners + a page load counts as activity.
  useEffect(() => {
    markActive();
    const opts = { passive: true } as AddEventListenerOptions;
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, opts));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive, opts));
  }, [markActive]);

  // Moving to a different page (e.g. onto or off the issue page) updates the server's limit straight away.
  useEffect(() => { ping(); }, [pathname, ping]);

  // Signing out in one tab signs out every tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY && !loggingOut.current) { loggingOut.current = true; goToLogin(); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [goToLogin]);

  // The clock: one tick a second.
  useEffect(() => {
    const tick = () => {
      const left = limit - (Date.now() - lastActivity());
      setRemaining(left);
      if (left <= 0) logout();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [limit, logout]);

  if (remaining > WARN_MS || loggingOut.current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className={`w-full max-w-sm overflow-hidden rounded-[28px] border shadow-2xl ${dark ? "border-white/10 bg-[#0f1923]" : "border-[#e7ded3] bg-white"}`}>
        <div className="h-1 bg-[linear-gradient(90deg,#b08b2c,#f59e0b)]" />
        <div className="p-6 text-center">
          <Clock size={30} className="mx-auto text-amber-500" />
          <h2 id="idle-title" className={`mt-3 text-base font-bold ${dark ? "text-slate-100" : "text-[#1a1814]"}`}>Are you still there?</h2>
          <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-[#6b655d]"}`}>
            For security, you'll be signed out in
          </p>
          <div className={`mt-2 font-mono text-4xl font-bold tabular-nums ${dark ? "text-amber-300" : "text-amber-600"}`}>{fmt(remaining)}</div>
          <button type="button" onClick={() => { markActive(); ping(); }} autoFocus
            className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            Stay signed in
          </button>
          <button type="button" onClick={logout}
            className={`mt-2 w-full rounded-xl border py-2.5 text-sm font-semibold ${dark ? "border-white/10 text-slate-300" : "border-[#ddd5c9] text-[#1a1814]"}`}>
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
