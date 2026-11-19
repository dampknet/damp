"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Bell, Crown, Loader2 } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import { setNotificationAccess } from "./actions";

type UserRow = {
  id:                  string;
  email:               string;
  fullName:            string | null;
  role:                string;
  isMasterAdmin:       boolean;
  isSuspended:         boolean;
  canSeeNotifications: boolean;
};

export default function NotificationAccessClient({ users }: { users: UserRow[] }) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  const [rows,    setRows]    = useState(users);
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, start] = useTransition();

  const toggle = (u: UserRow, allowed: boolean) => {
    setBusyId(u.id);
    setMessage(null);
    start(async () => {
      const res = await setNotificationAccess(u.id, allowed);
      if (res.ok) setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, canSeeNotifications: allowed } : r)));
      setMessage({ ok: res.ok, text: res.message });
      setBusyId(null);
    });
  };

  const allowedCount = rows.filter((r) => r.isMasterAdmin || r.canSeeNotifications).length;

  const card  = dark ? "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-2xl border border-[#e6ddd1] bg-white shadow-sm";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <section className={`${card} relative overflow-hidden p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#dc2626,#f59e0b)]" />
          <Link href="/admin" className={`mb-4 inline-flex items-center gap-2 text-sm font-medium ${muted} hover:underline`}>
            <ArrowLeft size={16} /> Back to Admin
          </Link>
          <h1 className={`flex items-center gap-2 text-2xl font-semibold tracking-tight ${txt}`}>
            <Bell size={22} /> Notification Access
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Choose which accounts see the notification bell and the Notifications page.
            Master admins always see them. {allowedCount} of {rows.length} accounts currently have access.
          </p>
        </section>

        {message && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              : dark ? "border-red-500/20 bg-red-500/10 text-red-300"             : "border-red-200 bg-red-50 text-red-700"
          }`}>{message.text}</div>
        )}

        <section className={`${card} mt-5 overflow-hidden`}>
          <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {rows.map((u) => {
              const on = u.isMasterAdmin || u.canSeeNotifications;
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${txt}`}>
                      <span className="[overflow-wrap:anywhere]">{u.fullName || u.email}</span>
                      {u.isMasterAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Crown size={10} /> Master admin
                        </span>
                      )}
                      {u.isSuspended && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dark ? "border-rose-500/30 text-rose-300" : "border-rose-200 text-rose-700"}`}>Suspended</span>
                      )}
                    </div>
                    <div className={`mt-0.5 text-xs [overflow-wrap:anywhere] ${muted}`}>{u.email} · {u.role}</div>
                  </div>

                  {u.isMasterAdmin ? (
                    <span className={`text-xs font-semibold ${muted}`}>Always</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {busyId === u.id && <Loader2 size={14} className="animate-spin text-sky-500" />}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Notifications for ${u.email}`}
                        disabled={busyId !== null}
                        onClick={() => toggle(u, !on)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-slate-400/50"}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
