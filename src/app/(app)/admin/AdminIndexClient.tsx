"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

export default function AdminIndexClient({
  email, userCount, deletedCount, activityCount,
}: {
  email:         string;
  userCount:     number;
  deletedCount:  number;
  activityCount: number;
}) {
  const { mode } = useThemeMode();
  const dark      = mode === "dark";

  const cards = [
    {
      href:    "/admin/users",
      emoji:   "👥",
      label:   "User Management",
      sub:     "Invite, manage roles, remove access",
      accent:  dark ? "bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" : "bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]",
      iconBg:  dark ? "border-blue-500/20 bg-blue-500/10"  : "border-blue-200 bg-blue-50",
      tag:     `${userCount} user${userCount !== 1 ? "s" : ""}`,
      tagCls:  dark ? "border-blue-500/20 bg-blue-500/10 text-blue-300"  : "border-blue-200 bg-blue-50 text-blue-700",
      hoverCl: dark ? "group-hover:text-blue-400" : "group-hover:text-blue-700",
    },
    {
      href:    "/admin/deleted-items",
      emoji:   "🗑️",
      label:   "Recycle Bin",
      sub:     "Review and restore deleted records",
      accent:  "bg-[linear-gradient(90deg,#dc2626,#f87171)]",
      iconBg:  dark ? "border-rose-500/20 bg-rose-500/10"   : "border-rose-200 bg-rose-50",
      tag:     `${deletedCount} deleted item${deletedCount !== 1 ? "s" : ""}`,
      tagCls:  deletedCount > 0
        ? dark ? "border-rose-500/20 bg-rose-500/10 text-rose-300"  : "border-rose-200 bg-rose-50 text-rose-700"
        : dark ? "border-white/10 bg-white/5 text-slate-400"        : "border-[#e0dbd2] bg-[#f5f2ed] text-[#6b655d]",
      hoverCl: dark ? "group-hover:text-rose-400" : "group-hover:text-rose-700",
    },
    {
      href:    "/admin/backup",
      emoji:   "💾",
      label:   "Data Backup & Recovery",
      sub:     "Export all data or restore from backup",
      accent:  "bg-[linear-gradient(90deg,#2a7d52,#10b981)]",
      iconBg:  dark ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50",
      tag:     "Download · Restore",
      tagCls:  dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      hoverCl: dark ? "group-hover:text-emerald-400" : "group-hover:text-emerald-700",
    },
    {
      href:    "/activity",
      emoji:   "📋",
      label:   "Activity Audit Log",
      sub:     "Full trail of every system action",
      accent:  "bg-[linear-gradient(90deg,#b08b2c,#f59e0b)]",
      iconBg:  dark ? "border-amber-500/20 bg-amber-500/10" : "border-amber-200 bg-amber-50",
      tag:     `${activityCount.toLocaleString()} events`,
      tagCls:  dark ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700",
      hoverCl: dark ? "group-hover:text-amber-400" : "group-hover:text-amber-700",
    },
  ];

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">

        {/* ── HEADER ── */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className={dark
                ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                : "inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Admin Panel
              </div>
              <h1 className={dark
                ? "mt-4 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
              }>
                System Administration
              </h1>
              <p className={dark
                ? "mt-2 max-w-xl text-sm font-medium leading-6 text-slate-400"
                : "mt-2 max-w-xl text-sm font-medium leading-6 text-[#857f76]"
              }>
                Manage users, view deleted records, backup data, and review system activity. All actions are logged to the audit trail.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className={dark
                ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                : "inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
              }>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {email}
              </div>
              <span className={dark
                ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#f97316]"
                : "rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#c8611a]"
              }>
                ADMIN
              </span>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Registered Users",  value: String(userCount),                    sub: "with system access",    accent: dark ? "bg-blue-500" : "bg-[#1d5fa8]" },
            { label: "Deleted Items",     value: String(deletedCount),                 sub: "recoverable from bin",  accent: dark ? "bg-rose-500" : "bg-[#dc2626]" },
            { label: "Audit Events",      value: activityCount.toLocaleString(),       sub: "total logged actions",  accent: dark ? "bg-amber-500" : "bg-[#b08b2c]" },
          ].map((s) => (
            <div key={s.label} className={dark
              ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
              : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm"
            }>
              <div className={`h-1 ${s.accent}`} />
              <div className="p-4">
                <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>{s.label}</div>
                <div className={dark ? "mt-2 text-3xl font-semibold text-slate-100" : "mt-2 text-3xl font-semibold text-[#1a1814]"}>{s.value}</div>
                <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CARDS ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="group block">
              <div className={dark
                ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white/20"
                : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              }>
                <div className={`h-1 ${card.accent}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${card.iconBg}`}>
                        {card.emoji}
                      </div>
                      <div>
                        <div className={`text-base font-bold transition-colors ${dark ? "text-slate-100" : "text-[#1a1814]"} ${card.hoverCl}`}>
                          {card.label}
                        </div>
                        <div className={dark ? "mt-0.5 text-sm text-slate-400" : "mt-0.5 text-sm text-[#8b857c]"}>
                          {card.sub}
                        </div>
                      </div>
                    </div>
                    <span className={dark ? "text-slate-600 group-hover:text-slate-300 transition-colors" : "text-[#c8c0b6] group-hover:text-[#1a1814] transition-colors"}>
                      →
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${card.tagCls}`}>
                      {card.tag}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── BACKUP REMINDER ── */}
        <div className={dark
          ? "mt-5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5"
          : "mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50"
        }>
          <div className="h-0.5 bg-[linear-gradient(90deg,#2a7d52,#10b981)]" />
          <div className="flex items-start gap-4 px-6 py-4">
            <span className="mt-0.5 text-xl shrink-0">💡</span>
            <div>
              <div className={dark ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-emerald-800"}>
                Remember to back up weekly
              </div>
              <div className={dark ? "mt-0.5 text-xs text-emerald-400" : "mt-0.5 text-xs text-emerald-700"}>
                Go to <strong>Data Backup & Recovery</strong> and download a backup at least once a week. Save to Google Drive or a USB.{" "}
                Label files clearly — e.g.{" "}
                <code className={dark ? "rounded bg-emerald-500/20 px-1 font-mono" : "rounded bg-emerald-100 px-1 font-mono"}>
                  damp-backup-2026-07-20.json
                </code>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
