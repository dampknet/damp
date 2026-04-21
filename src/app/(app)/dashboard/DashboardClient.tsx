"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

type Stats = {
  sites: number;
  sitesActive: number;
  sitesDown: number;
  airSites: number;
  liquidSites: number;
  knetSites: number;
  gbcSites: number;
  assets: number;
  storeTotal: number;
  received: number;
  notReceived: number;
  activePct: number;
  airPct: number;
  knetPct: number;
  receivedPct: number;
  assetUtilPct: number;
};

type ActivityItem = {
  id: string;
  title: string;
  details: string | null;
  actorEmail: string | null;
  createdAtLabel: string;
};

function progressWidthClass(width: number) {
  const safe = Math.max(0, Math.min(100, width));
  const rounded = Math.round(safe / 5) * 5;
  switch (rounded) {
    case 0:   return "w-0";
    case 5:   return "w-[5%]";
    case 10:  return "w-[10%]";
    case 15:  return "w-[15%]";
    case 20:  return "w-[20%]";
    case 25:  return "w-[25%]";
    case 30:  return "w-[30%]";
    case 35:  return "w-[35%]";
    case 40:  return "w-[40%]";
    case 45:  return "w-[45%]";
    case 50:  return "w-[50%]";
    case 55:  return "w-[55%]";
    case 60:  return "w-[60%]";
    case 65:  return "w-[65%]";
    case 70:  return "w-[70%]";
    case 75:  return "w-[75%]";
    case 80:  return "w-[80%]";
    case 85:  return "w-[85%]";
    case 90:  return "w-[90%]";
    case 95:  return "w-[95%]";
    case 100: return "w-full";
    default:  return "w-0";
  }
}

export default function DashboardClient({
  role,
  email,
  displayName,
  dateLabel,
  stats,
  recentActivity,
}: {
  role: Role;
  email: string | null;
  displayName: string;
  dateLabel: string;
  stats: Stats;
  recentActivity: ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  // ── Exact navbar palette ──────────────────────────────────────────────────
  const bg        = dark ? "bg-[#0d1117]"       : "bg-[#f5f2ed]";
  const surface   = dark ? "bg-[#101720]"       : "bg-[#fffdf9]";
  const border    = dark ? "border-white/8"      : "border-[#e7dfd4]";
  const txt       = dark ? "text-slate-100"      : "text-[#1a1814]";
  const muted     = dark ? "text-slate-500"      : "text-[#8b857c]";
  const subtler   = dark ? "text-slate-600"      : "text-[#a09890]";
  const hoverBg   = dark ? "hover:bg-white/5"   : "hover:bg-[#f5f2ed]";
  const divider   = dark ? "divide-white/6"      : "divide-[#efe8de]";
  const pill      = dark ? "bg-white/6 border-white/10 text-slate-400" : "bg-[#f5f2ed] border-[#e7dfd4] text-[#6b6560]";
  const accent    = "#1d5fa8";  // the blue from your navbar
  const accentHov = "#164a82";

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className={`mb-8 flex flex-col gap-4 border-b ${border} pb-6 lg:flex-row lg:items-end lg:justify-between`}>
          <div>
            <div className={`mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live · {dateLabel}
            </div>
            <h1 className={`text-[28px] font-semibold tracking-tight ${txt}`}>
              Asset Dashboard
            </h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Welcome back,{" "}
              <span className={`font-semibold ${txt}`}>{displayName}</span>.
              Here's a live summary of sites, assets and store activity.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/sites"
              className={`rounded-xl border ${border} ${surface} px-4 py-2 text-sm font-semibold ${txt} transition ${hoverBg}`}
            >
              Go to Sites
            </Link>
            <Link
              href="/store"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Go to Store
            </Link>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/sites",
              label: "Total Sites",
              value: String(stats.sites),
              chip: `${stats.sites} total`,
              chipOk: true,
              meta: "registered in system",
              bar: accent,
            },
            {
              href: "/sites?group=status",
              label: "Active / Down",
              value: `${stats.sitesActive} / ${stats.sitesDown}`,
              chip: `${stats.sitesDown} offline`,
              chipOk: stats.sitesDown === 0,
              meta: "view grouped status",
              bar: "#10b981",
            },
            {
              href: "/sites?group=tt",
              label: "Air / Liquid",
              value: `${stats.airSites} / ${stats.liquidSites}`,
              chip: `${stats.airPct}% air`,
              chipOk: true,
              meta: "view grouped cooling",
              bar: "#f59e0b",
            },
            {
              href: "/sites?group=tower",
              label: "KNET / GBC",
              value: `${stats.knetSites} / ${stats.gbcSites}`,
              chip: `${stats.knetPct}% KNET`,
              chipOk: true,
              meta: "view grouped towers",
              bar: "#6366f1",
            },
          ].map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className={`group relative overflow-hidden rounded-2xl border ${border} ${surface} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              {/* coloured left edge */}
              <div
                className="absolute inset-y-0 left-0 w-0.75 rounded-l-2xl"
                style={{ backgroundColor: k.bar }}
              />
              <div className={`pl-1 text-[11px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                {k.label}
              </div>
              <div className={`mt-2 text-[28px] font-semibold tracking-tight ${txt}`}>
                {k.value}
              </div>
              <div className={`mt-3 flex items-center justify-between border-t ${border} pt-3`}>
                <span className={`text-[11px] ${muted}`}>{k.meta}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={
                    k.chipOk
                      ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
                      : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                  }
                >
                  {k.chip}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Middle row ───────────────────────────────────────────────────── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">

          {/* Assets card */}
          <Link
            href="/assets"
            className={`rounded-2xl border ${border} ${surface} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <SectionHeader dark={dark} border={border} txt={txt} muted={muted} pill={pill}
              title="Assets" badge={`${stats.assets} total`} />
            <ProgressRow dark={dark} border={border} txt={txt} muted={muted}
              label="Utilisation" value={`${stats.assetUtilPct}%`}
              pct={stats.assetUtilPct} color={accent} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat dark={dark} border={border} txt={txt} muted={muted}
                label="Registered Assets" value={String(stats.assets)} valueColor="#10b981" />
              <MiniStat dark={dark} border={border} txt={txt} muted={muted}
                label="Site Records" value={String(stats.sites)} valueColor="#f59e0b" />
            </div>
          </Link>

          {/* Store card */}
          <div className={`rounded-2xl border ${border} ${surface} p-5 shadow-sm`}>
            <SectionHeader dark={dark} border={border} txt={txt} muted={muted} pill={pill}
              title="Store" badge={`${stats.storeTotal} items`} />
            <StoreRow dark={dark} border={border} txt={txt} muted={muted}
              label="Received" value={String(stats.received)} valueColor="#10b981" icon="✓" iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"} />
            <StoreRow dark={dark} border={border} txt={txt} muted={muted}
              label="Pending" value={String(stats.notReceived)} valueColor="#f97316" icon="⏳" iconBg={dark ? "bg-orange-500/10" : "bg-orange-50"} />
            <div className="mt-4">
              <ProgressRow dark={dark} border={border} txt={txt} muted={muted}
                label="Fulfilment rate" value={`${stats.receivedPct}%`}
                pct={stats.receivedPct} color="#10b981" />
            </div>
          </div>

          {/* Site health card */}
          <div className={`rounded-2xl border ${border} ${surface} p-5 shadow-sm`}>
            <SectionHeader dark={dark} border={border} txt={txt} muted={muted} pill={pill}
              title="Site Health" badge={`${stats.activePct}% up`} />
            <ProgressRow dark={dark} border={border} txt={txt} muted={muted}
              label="Active" value={`${stats.sitesActive} / ${stats.sites}`}
              pct={stats.activePct} color="#10b981" />
            <ProgressRow dark={dark} border={border} txt={txt} muted={muted}
              label="Air-cooled" value={`${stats.airSites} / ${stats.sites}`}
              pct={stats.airPct} color={accent} />
            <ProgressRow dark={dark} border={border} txt={txt} muted={muted}
              label="KNET" value={`${stats.knetSites} / ${stats.sites}`}
              pct={stats.knetPct} color="#f97316" />
          </div>
        </div>

        {/* ── Bottom row ───────────────────────────────────────────────────── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">

          {/* Recent activity */}
          <div className={`rounded-2xl border ${border} ${surface} p-5 shadow-sm`}>
            <div className={`mb-4 flex items-center justify-between border-b ${border} pb-4`}>
              <span className={`text-sm font-semibold ${txt}`}>Recent Activity</span>
              <Link
                href="/activity"
                className="text-[11px] font-bold transition hover:opacity-70"
                style={{ color: accent }}
              >
                View all →
              </Link>
            </div>
            <div className={`divide-y ${divider}`}>
              {recentActivity.length === 0 ? (
                <p className={`py-8 text-sm ${muted}`}>No recent activity yet.</p>
              ) : recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${txt}`}>{item.title}</p>
                    {item.details && (
                      <p className={`mt-0.5 text-xs ${muted}`}>{item.details}</p>
                    )}
                    {item.actorEmail && (
                      <p className={`mt-0.5 text-[11px] ${subtler}`}>
                        by {item.actorEmail}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${pill}`}>
                    {item.createdAtLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className={`rounded-2xl border ${border} ${surface} p-5 shadow-sm`}>
            <div className={`mb-4 border-b ${border} pb-4`}>
              <span className={`text-sm font-semibold ${txt}`}>Quick Actions</span>
            </div>
            <div className="space-y-2">
              {[
                {
                  href: "/sites",
                  title: "Go to Sites",
                  sub: `Manage all ${stats.sites} sites`,
                  icon: "🗺",
                  iconBg: dark ? "bg-blue-500/10" : "bg-blue-50",
                },
                {
                  href: "/store",
                  title: "Go to Store",
                  sub: `${stats.storeTotal} items · ${stats.notReceived} pending`,
                  icon: "📦",
                  iconBg: dark ? "bg-amber-500/10" : "bg-amber-50",
                },
                {
                  href: "/sites?group=status",
                  title: "Review Down Sites",
                  sub: `${stats.sitesDown} currently offline`,
                  icon: "⚠️",
                  iconBg: dark ? "bg-red-500/10" : "bg-red-50",
                },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex items-center gap-3 rounded-xl border ${border} px-4 py-3 transition ${hoverBg} hover:-translate-y-0.5`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base ${a.iconBg}`}>
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${txt}`}>{a.title}</p>
                    <p className={`text-[11px] ${muted}`}>{a.sub}</p>
                  </div>
                  <span className={`text-base ${muted}`}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <p className={`mt-6 text-xs font-medium ${subtler}`}>
          Signed in as{" "}
          <span className={`font-semibold ${txt}`}>{role}</span>
          {email ? <> · {email}</> : null}
        </p>
      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────────────────────── */

function SectionHeader({ dark, border, txt, muted, pill, title, badge }: any) {
  return (
    <div className={`mb-4 flex items-center justify-between border-b ${border} pb-4`}>
      <span className={`text-sm font-semibold ${txt}`}>{title}</span>
      {badge && (
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${pill}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function ProgressRow({ dark, border, txt, muted, label, value, pct, color }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`text-xs font-medium ${muted}`}>{label}</span>
        <span className={`text-xs font-semibold ${txt}`}>{value}</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/8" : "bg-[#efe8de]"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${progressWidthClass(pct)}`}
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MiniStat({ dark, border, txt, muted, label, value, valueColor }: any) {
  return (
    <div className={`rounded-xl border ${border} ${dark ? "bg-white/3" : "bg-[#f5f2ed]"} px-4 py-3`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}

function StoreRow({ dark, border, txt, muted, label, value, valueColor, icon, iconBg }: any) {
  return (
    <div className={`flex items-center justify-between border-b ${border} py-3.5 last:border-b-0`}>
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${muted}`}>{label}</p>
        <p className="mt-0.5 text-2xl font-semibold" style={{ color: valueColor }}>{value}</p>
      </div>
      <div className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}