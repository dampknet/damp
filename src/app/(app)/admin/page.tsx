import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminIndexPage() {
  const me = await getCurrentProfile();
  if (!me)                redirect("/auth/login");
  if (me.role !== "ADMIN") redirect("/sites");

  const [userCount, deletedCount, activityCount] = await Promise.all([
    prisma.userProfile.count(),
    prisma.inventoryItem.count({ where: { isDeleted: true } }),
    prisma.activityLog.count(),
  ]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)] dark:bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">

        {/* ── HEADER CARD ── */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-8 shadow-[0_16px_40px_rgba(26,24,20,0.06)] dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a] dark:border-white/10 dark:bg-white/5 dark:text-[#f97316]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Admin Panel
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] dark:text-slate-100 md:text-4xl">
                System Administration
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[#857f76] dark:text-slate-400">
                Manage users, view deleted records, backup data, and review system activity. All actions here are logged to the audit trail.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d] dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {me.email}
              </div>
              <span className="rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#c8611a] dark:border-white/10 dark:bg-white/5 dark:text-[#f97316]">
                ADMIN
              </span>
            </div>
          </div>
        </section>

        {/* ── STATS ROW ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Registered Users",   value: userCount,               sub: "with system access",       accent: "bg-blue-500"   },
            { label: "Soft-Deleted Items",  value: deletedCount,            sub: "recoverable from bin",     accent: "bg-rose-500"   },
            { label: "Audit Events",        value: activityCount.toLocaleString(), sub: "total logged actions", accent: "bg-amber-500" },
          ].map((s) => (
            <div key={s.label} className="overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className={`h-1 ${s.accent}`} />
              <div className="p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890] dark:text-slate-500">{s.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1a1814] dark:text-slate-100">{s.value}</div>
                <div className="mt-1 text-xs text-[#8b857c] dark:text-slate-500">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── ADMIN CARDS ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">

          {/* User Management */}
          <Link href="/admin/users" className="group block">
            <div className="overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-2xl dark:border-blue-500/20 dark:bg-blue-500/10">
                      👥
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1a1814] group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400 transition-colors">
                        User Management
                      </div>
                      <div className="mt-0.5 text-sm text-[#8b857c] dark:text-slate-400">
                        Invite, manage roles, remove access
                      </div>
                    </div>
                  </div>
                  <span className="text-[#8b857c] group-hover:text-[#1a1814] dark:text-slate-500 dark:group-hover:text-slate-200 transition-colors text-lg">→</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300">
                    {userCount} users
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Recycle Bin */}
          <Link href="/admin/deleted-items" className="group block">
            <div className="overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <div className="h-1 bg-[linear-gradient(90deg,#dc2626,#f87171)]" />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-2xl dark:border-rose-500/20 dark:bg-rose-500/10">
                      🗑️
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1a1814] group-hover:text-rose-700 dark:text-slate-100 dark:group-hover:text-rose-400 transition-colors">
                        Recycle Bin
                      </div>
                      <div className="mt-0.5 text-sm text-[#8b857c] dark:text-slate-400">
                        Review and restore deleted records
                      </div>
                    </div>
                  </div>
                  <span className="text-[#8b857c] group-hover:text-[#1a1814] dark:text-slate-500 dark:group-hover:text-slate-200 transition-colors text-lg">→</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    deletedCount > 0
                      ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300"
                      : "bg-[#f5f2ed] border-[#e0dbd2] text-[#6b655d] dark:bg-white/5 dark:border-white/10 dark:text-slate-400"
                  }`}>
                    {deletedCount} soft-deleted item{deletedCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Backup */}
          <Link href="/admin/backup" className="group block">
            <div className="overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <div className="h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981)]" />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-2xl dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      💾
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1a1814] group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400 transition-colors">
                        Data Backup & Recovery
                      </div>
                      <div className="mt-0.5 text-sm text-[#8b857c] dark:text-slate-400">
                        Export all data or restore from backup
                      </div>
                    </div>
                  </div>
                  <span className="text-[#8b857c] group-hover:text-[#1a1814] dark:text-slate-500 dark:group-hover:text-slate-200 transition-colors text-lg">→</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300">
                    Download full JSON snapshot
                  </span>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300">
                    One-click restore
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Activity Log */}
          <Link href="/activity" className="group block">
            <div className="overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <div className="h-1 bg-[linear-gradient(90deg,#b08b2c,#f59e0b)]" />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-2xl dark:border-amber-500/20 dark:bg-amber-500/10">
                      📋
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1a1814] group-hover:text-amber-700 dark:text-slate-100 dark:group-hover:text-amber-400 transition-colors">
                        Activity Audit Log
                      </div>
                      <div className="mt-0.5 text-sm text-[#8b857c] dark:text-slate-400">
                        Full trail of every system action
                      </div>
                    </div>
                  </div>
                  <span className="text-[#8b857c] group-hover:text-[#1a1814] dark:text-slate-500 dark:group-hover:text-slate-200 transition-colors text-lg">→</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
                    {activityCount.toLocaleString()} events recorded
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Backup reminder */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="h-0.5 bg-[linear-gradient(90deg,#2a7d52,#10b981)]" />
          <div className="flex items-start gap-4 px-6 py-4">
            <span className="mt-0.5 text-xl">💡</span>
            <div>
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Remember to back up weekly
              </div>
              <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                Go to <strong>Data Backup & Recovery</strong> and download a backup at least once a week. Save to Google Drive or a USB for safekeeping. Label files clearly — e.g. <code className="rounded bg-emerald-100 px-1 dark:bg-emerald-500/20">damp-backup-2026-07-20.json</code>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
