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

  const cards = [
    {
      href:    "/admin/users",
      icon:    "👥",
      label:   "User Management",
      sub:     `${userCount} user${userCount !== 1 ? "s" : ""} registered`,
      accent:  "from-blue-600 to-blue-400",
      border:  "border-blue-500/20",
      bg:      "bg-blue-500/10",
    },
    {
      href:    "/admin/deleted-items",
      icon:    "🗑️",
      label:   "Recycle Bin",
      sub:     `${deletedCount} soft-deleted item${deletedCount !== 1 ? "s" : ""}`,
      accent:  "from-rose-600 to-rose-400",
      border:  "border-rose-500/20",
      bg:      "bg-rose-500/10",
    },
    {
      href:    "/admin/backup",
      icon:    "💾",
      label:   "Data Backup & Recovery",
      sub:     "Export or restore all system data",
      accent:  "from-emerald-600 to-emerald-400",
      border:  "border-emerald-500/20",
      bg:      "bg-emerald-500/10",
    },
    {
      href:    "/activity",
      icon:    "📋",
      label:   "Activity Audit Log",
      sub:     `${activityCount.toLocaleString()} events recorded`,
      accent:  "from-amber-600 to-amber-400",
      border:  "border-amber-500/20",
      bg:      "bg-amber-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)] dark:bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a] dark:border-white/10 dark:bg-white/5 dark:text-[#f97316]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Admin Panel
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] dark:text-slate-100 md:text-4xl">
            System Administration
          </h1>
          <p className="mt-2 text-sm text-[#857f76] dark:text-slate-400">
            Manage users, view deleted records, backup data, and review system activity.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d] dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Logged in as: {me.email} — ADMIN
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="block group">
              <div className={`overflow-hidden rounded-2xl border ${card.border} ${card.bg} backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                <div className={`h-1 bg-gradient-to-r ${card.accent}`} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{card.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-[#1a1814] dark:text-slate-100 group-hover:underline">
                        {card.label}
                      </div>
                      <div className="mt-1 text-sm text-[#8b857c] dark:text-slate-400">
                        {card.sub}
                      </div>
                    </div>
                    <div className="text-[#8b857c] dark:text-slate-500 group-hover:text-[#1a1814] dark:group-hover:text-slate-200 transition-colors">
                      →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick note on backup */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Remember to back up regularly
              </div>
              <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                Go to <strong>Data Backup & Recovery</strong> and download a backup at least once a week. Save it to Google Drive or a USB drive for safekeeping.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
