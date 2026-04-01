"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
    case 0: return "w-0";
    case 5: return "w-[5%]";
    case 10: return "w-[10%]";
    case 15: return "w-[15%]";
    case 20: return "w-[20%]";
    case 25: return "w-[25%]";
    case 30: return "w-[30%]";
    case 35: return "w-[35%]";
    case 40: return "w-[40%]";
    case 45: return "w-[45%]";
    case 50: return "w-[50%]";
    case 55: return "w-[55%]";
    case 60: return "w-[60%]";
    case 65: return "w-[65%]";
    case 70: return "w-[70%]";
    case 75: return "w-[75%]";
    case 80: return "w-[80%]";
    case 85: return "w-[85%]";
    case 90: return "w-[90%]";
    case 95: return "w-[95%]";
    case 100: return "w-full";
    default: return "w-0";
  }
}

export default function DashboardClient({
  role,
  email,
  displayName,
  currentTime,
  stats,
  recentActivity,
}: {
  role: Role;
  email: string | null;
  displayName: string;
  currentTime: string;
  stats: Stats;
  recentActivity: ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0b0e14] text-slate-200" : "bg-[#fcfcfc]"}`}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        
        {/* AUTOMATIC LIVE HEADER */}
        <div className={`mb-8 flex flex-col gap-5 border-b pb-7 lg:flex-row lg:items-end lg:justify-between ${dark ? "border-white/5" : "border-slate-200"}`}>
          <div>
            <div className={`mb-2 text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? "text-orange-500" : "text-[#c8611a]"}`}>
              ● Live · {currentTime}
            </div>

            <h1 className={`text-4xl font-bold tracking-tight ${dark ? "text-slate-50" : "text-slate-900"}`}>
              Asset Dashboard
            </h1>

            <p className={`mt-2 text-sm font-medium ${dark ? "text-slate-500" : "text-slate-500"}`}>
              Welcome back, {displayName}. Here is a live summary of your sites,
              assets and store activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/sites"
              className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all shadow-sm ${dark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}
            >
              Go to Sites
            </Link>

            <Link
              href="/store"
              className="rounded-lg bg-[#1d5fa8] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#164a82] transition-all"
            >
              Go to Store
            </Link>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            dark={dark}
            href="/sites"
            label="Total Sites"
            value={String(stats.sites)}
            stripe={dark ? "bg-blue-600" : "bg-[#1d5fa8]"}
            tag={`${stats.sites} total`}
            tagClass={dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-[#1d5fa8]"}
            meta="registered in system"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=status"
            label="Active / Down"
            value={`${stats.sitesActive} / ${stats.sitesDown}`}
            stripe={dark ? "bg-emerald-600" : "bg-emerald-700"}
            tag={`${stats.sitesDown} offline`}
            tagClass={dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"}
            meta="view grouped status"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=tt"
            label="Air / Liquid"
            value={`${stats.airSites} / ${stats.liquidSites}`}
            stripe={dark ? "bg-amber-600" : "bg-[#b08b2c]"}
            tag={`${stats.airPct}% air`}
            tagClass={dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-[#b08b2c]"}
            meta="view grouped cooling"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=tower"
            label="KNET / GBC"
            value={`${stats.knetSites} / ${stats.gbcSites}`}
            stripe={dark ? "bg-orange-600" : "bg-[#c8611a]"}
            tag={`${stats.knetPct}% KNET`}
            tagClass={dark ? "bg-orange-500/10 text-orange-400" : "bg-orange-50 text-[#c8611a]"}
            meta="view grouped towers"
          />
        </div>

        {/* MAIN DATA SECTION */}
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card dark={dark} title="Assets" rightTag={`${stats.assets} total`} href="/assets">
            <ProgressRow
              dark={dark}
              label="Utilization"
              value={`${stats.assetUtilPct}%`}
              width={stats.assetUtilPct}
              fill={dark ? "bg-blue-600" : "bg-slate-900"}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat dark={dark} label="Registered Assets" value={String(stats.assets)} valueClass="text-emerald-600" />
              <MiniStat dark={dark} label="Site Records" value={String(stats.sites)} valueClass="text-amber-600" />
            </div>
          </Card>

          <Card dark={dark} title="Store" rightTag={`${stats.storeTotal} items`}>
            <StoreRow dark={dark} label="Received" value={String(stats.received)} valueClass="text-emerald-600" icon="✓" iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"} />
            <StoreRow dark={dark} label="Pending" value={String(stats.notReceived)} valueClass="text-orange-600" icon="⏳" iconBg={dark ? "bg-orange-500/10" : "bg-orange-50"} />
            <div className="mt-4">
              <ProgressRow
                dark={dark}
                label="Fulfilment rate"
                value={`${stats.receivedPct}%`}
                width={stats.receivedPct}
                fill="bg-emerald-600"
              />
            </div>
          </Card>

          <Card dark={dark} title="Site Health" rightTag={`${stats.activePct}% up`}>
            <ProgressRow dark={dark} label="Active" value={`${stats.sitesActive} / ${stats.sites}`} width={stats.activePct} fill="bg-emerald-600" />
            <ProgressRow dark={dark} label="Air-cooled" value={`${stats.airSites} / ${stats.sites}`} width={stats.airPct} fill={dark ? "bg-blue-600" : "bg-[#1d5fa8]"} />
            <ProgressRow dark={dark} label="KNET" value={`${stats.knetSites} / ${stats.sites}`} width={stats.knetPct} fill={dark ? "bg-orange-600" : "bg-[#c8611a]"} />
          </Card>
        </div>

        {/* LOGS SECTION */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <Card
            dark={dark}
            title="Recent Activity"
            action={<Link href="/activity" className={`text-xs font-bold uppercase tracking-widest hover:underline ${dark ? "text-orange-500" : "text-[#c8611a]"}`}>View all →</Link>}
            href="/activity"
          >
            <div className="space-y-1">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-sm text-slate-500">No recent activity yet.</div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className={`flex items-start gap-3 border-b py-3 last:border-b-0 ${dark ? "border-white/5" : "border-slate-100"}`}>
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${dark ? "bg-orange-500" : "bg-[#c8611a]"}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-bold ${dark ? "text-slate-200" : "text-slate-900"}`}>{item.title}</div>
                      {item.details && <div className="mt-0.5 text-xs text-slate-500">{item.details}</div>}
                      {item.actorEmail && <div className="mt-1 text-[10px] font-bold uppercase text-slate-400">By {item.actorEmail}</div>}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase pt-1">{item.createdAtLabel}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card dark={dark} title="Quick Actions">
            <QuickAction dark={dark} href="/sites" title="Go to Sites" subtitle={`Manage all ${stats.sites} sites`} iconBg={dark ? "bg-blue-500/10" : "bg-blue-50"} iconColor="text-[#1d5fa8]" icon="🗺" />
            <QuickAction dark={dark} href="/store" title="Go to Store" subtitle={`${stats.storeTotal} items total`} iconBg={dark ? "bg-amber-500/10" : "bg-amber-50"} iconColor="text-[#b08b2c]" icon="📦" />
            <QuickAction dark={dark} href="/sites?group=status" title="Review Down Sites" subtitle={`${stats.sitesDown} offline`} iconBg={dark ? "bg-red-500/10" : "bg-red-50"} iconColor="text-red-700" icon="⚠️" />
          </Card>
        </div>

        {/* FOOTER */}
        <div className={`mt-10 text-[10px] font-bold uppercase tracking-widest ${dark ? "text-slate-600" : "text-slate-400"}`}>
          Authenticated Profile: <span className={dark ? "text-slate-400" : "text-slate-700"}>{role}</span>
          {email ? <> • {email}</> : null}
        </div>
      </div>
    </div>
  );
}

// --- SHARED COMPONENTS (Restored to your raw structure) ---

function KpiCard({ dark, href, label, value, stripe, tag, tagClass, meta }: any) {
  const content = (
    <div className={`overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"}`}>
      <div className={`h-1 ${stripe}`} />
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className={`mt-3 text-3xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>{value}</div>
        <div className={`mt-4 flex items-center gap-2 border-t pt-3 ${dark ? "border-white/5" : "border-slate-100"}`}>
          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${tagClass}`}>{tag}</span>
          <span className="text-[9px] font-bold uppercase text-slate-400">{meta}</span>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

function Card({ dark, title, rightTag, action, children, href }: any) {
  const content = (
    <div className={`rounded-xl border p-5 shadow-sm ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={`text-sm font-bold uppercase tracking-widest ${dark ? "text-slate-200" : "text-slate-800"}`}>{title}</div>
        {action || (rightTag && <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${dark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>{rightTag}</span>)}
      </div>
      {children}
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

function ProgressRow({ dark, label, value, width, fill }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
        <span className="text-slate-400">{label}</span>
        <span className={dark ? "text-slate-200" : "text-slate-900"}>{value}</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/5" : "bg-slate-100"}`}>
        <div className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`} />
      </div>
    </div>
  );
}

function MiniStat({ dark, label, value, valueClass }: any) {
  return (
    <div className={`rounded-lg p-3 ${dark ? "bg-white/5" : "bg-slate-50"}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function StoreRow({ dark, label, value, valueClass, icon, iconBg }: any) {
  return (
    <div className={`flex items-center justify-between border-b py-2 last:border-b-0 ${dark ? "border-white/5" : "border-slate-100"}`}>
      <div>
        <div className="text-[11px] font-bold uppercase text-slate-400">{label}</div>
        <div className={`text-lg font-bold ${valueClass}`}>{value}</div>
      </div>
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${iconBg}`}><span className="text-sm">{icon}</span></div>
    </div>
  );
}

function QuickAction({ dark, href, title, subtitle, iconBg, iconColor, icon }: any) {
  return (
    <Link href={href} className={`mb-2 flex items-center gap-3 rounded-lg border p-3 transition-colors last:mb-0 ${dark ? "border-white/5 bg-white/2 hover:bg-white/5" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}><span className={`text-sm ${iconColor}`}>{icon}</span></div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-bold ${dark ? "text-slate-200" : "text-slate-900"}`}>{title}</div>
        <div className="text-[10px] font-medium text-slate-500">{subtitle}</div>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  );
}