"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

type Stats = {
  sites: number; sitesActive: number; sitesDown: number;
  airSites: number; liquidSites: number; knetSites: number;
  gbcSites: number; assets: number; storeTotal: number;
  received: number; notReceived: number; activePct: number;
  airPct: number; knetPct: number; receivedPct: number;
  assetUtilPct: number;
};

type ActivityItem = {
  id: string; title: string; details: string | null;
  actorEmail: string | null; createdAtLabel: string;
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
  role, email, displayName, currentTime, stats, recentActivity,
}: {
  role: Role; email: string | null; displayName: string;
  currentTime: string; stats: Stats; recentActivity: ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  // COLOR SYSTEM (Matching Admin Page)
  const bgMain = dark ? "bg-[#0b0e14]" : "bg-[#fcfcfc]";
  const bgCard = dark ? "bg-[#11141d]" : "bg-white";
  const borderCard = dark ? "border-white/5" : "border-slate-200";
  const textMuted = "text-slate-500 uppercase tracking-widest font-bold text-[10px]";

  return (
    <div className={`min-h-screen ${bgMain} text-slate-900 dark:text-slate-200 transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        
        {/* HEADER SECTION */}
        <div className={`mb-10 flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between ${borderCard}`}>
          <div>
            <div className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${dark ? "text-orange-500" : "text-[#c8611a]"}`}>
              ● Live Status · {currentTime}
            </div>
            <h1 className="text-4xl font-bold tracking-tight dark:text-white text-slate-900">
              Operations Dashboard
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Welcome back, {displayName}. Accessing system as <span className="dark:text-slate-300 text-slate-700 font-bold">{role}</span>.
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/sites" className={`rounded-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-widest shadow-sm transition-all ${dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              Network Sites
            </Link>
            <Link href="/store" className="rounded-lg bg-[#1d5fa8] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:bg-[#164a82] transition-all">
              Inventory Store
            </Link>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard dark={dark} border={borderCard} bg={bgCard} label="Registry Total" value={String(stats.sites)} stripe="bg-[#1d5fa8]" tag="Registered" tagClass={dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-[#1d5fa8]"} />
          <KpiCard dark={dark} border={borderCard} bg={bgCard} label="Active Status" value={`${stats.sitesActive}/${stats.sites}`} stripe="bg-emerald-600" tag={`${stats.sitesDown} Down`} tagClass={stats.sitesDown > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-50 text-emerald-700"} />
          <KpiCard dark={dark} border={borderCard} bg={bgCard} label="Air vs Liquid" value={`${stats.airSites}/${stats.liquidSites}`} stripe="bg-amber-600" tag={`${stats.airPct}% Air`} tagClass="bg-amber-500/10 text-amber-500" />
          <KpiCard dark={dark} border={borderCard} bg={bgCard} label="KNET Core" value={String(stats.knetSites)} stripe="bg-[#c8611a]" tag={`${stats.knetPct}% KNET`} tagClass="bg-orange-500/10 text-[#c8611a]" />
        </div>

        {/* MAIN DATA MODULES */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card dark={dark} border={borderCard} bg={bgCard} title="Asset Management" rightTag={`${stats.assets} Total`}>
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat dark={dark} label="Utilities" value={String(stats.assets)} vClass="text-[#1d5fa8]" />
                <MiniStat dark={dark} label="Site Nodes" value={String(stats.sites)} vClass="text-slate-500" />
              </div>
              <ProgressRow dark={dark} label="Infrastructure Usage" value={`${stats.assetUtilPct}%`} width={stats.assetUtilPct} fill="bg-slate-800 dark:bg-blue-600" />
            </div>
          </Card>

          <Card dark={dark} border={borderCard} bg={bgCard} title="Store Logistics" rightTag={`${stats.storeTotal} Items`}>
            <div className="space-y-4 pt-2">
              <StoreRow dark={dark} border={borderCard} label="Verified Received" value={String(stats.received)} vClass="text-emerald-600" icon="✓" iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"} />
              <StoreRow dark={dark} border={borderCard} label="Pending Delivery" value={String(stats.notReceived)} vClass="text-orange-600" icon="⏳" iconBg={dark ? "bg-orange-500/10" : "bg-orange-50"} />
              <div className="pt-2">
                <ProgressRow dark={dark} label="Fulfilment Rate" value={`${stats.receivedPct}%`} width={stats.receivedPct} fill="bg-emerald-600" />
              </div>
            </div>
          </Card>

          <Card dark={dark} border={borderCard} bg={bgCard} title="Site Health Analytics">
            <div className="space-y-5 pt-2">
              <ProgressRow dark={dark} label="Network Availability" value={`${stats.activePct}%`} width={stats.activePct} fill="bg-emerald-600" />
              <ProgressRow dark={dark} label="Cooling Efficiency" value={`${stats.airPct}%`} width={stats.airPct} fill="bg-blue-600" />
              <ProgressRow dark={dark} label="KNET Tower Distribution" value={`${stats.knetPct}%`} width={stats.knetPct} fill="bg-[#c8611a]" />
            </div>
          </Card>
        </div>

        {/* LOGS & ACTIONS */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Card dark={dark} border={borderCard} bg={bgCard} title="Recent Activity Logs" 
                action={<Link href="/activity" className="text-[10px] font-black text-[#1d5fa8] uppercase tracking-widest hover:underline">Audit Trail →</Link>}>
            <div className="divide-y dark:divide-white/5 divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No logs found in registry.</div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dark ? "bg-blue-500" : "bg-[#1d5fa8]"}`} />
                      <div>
                        <div className="text-sm font-bold dark:text-slate-200 text-slate-800">{item.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{item.actorEmail}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{item.createdAtLabel}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card dark={dark} border={borderCard} bg={bgCard} title="Quick Operations">
            <div className="space-y-2">
              <QuickAction dark={dark} href="/sites" title="Manage Sites" sub={`Control all ${stats.sites} nodes`} icon="🗺" />
              <QuickAction dark={dark} href="/store" title="Inventory Flow" sub={`Track ${stats.storeTotal} total items`} icon="📦" />
              <QuickAction dark={dark} href="/sites?group=status" title="System Alerts" sub={`${stats.sitesDown} maintenance flags`} icon="⚠️" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function KpiCard({ dark, border, bg, label, value, stripe, tag, tagClass }: any) {
  return (
    <div className={`overflow-hidden rounded-lg border shadow-sm ${border} ${bg}`}>
      <div className={`h-1 w-full ${stripe}`} />
      <div className="p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-bold dark:text-white text-slate-900">{value}</div>
        <div className={`mt-5 flex items-center gap-2 border-t pt-4 ${dark ? "border-white/5" : "border-slate-100"}`}>
          <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${tagClass}`}>{tag}</span>
          <span className="text-[9px] font-bold uppercase text-slate-400">Current Status</span>
        </div>
      </div>
    </div>
  );
}

function Card({ dark, border, bg, title, rightTag, action, children }: any) {
  return (
    <div className={`rounded-lg border shadow-sm ${border} ${bg}`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${dark ? "border-white/5 bg-white/2" : "border-slate-100 bg-slate-50/50"}`}>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{title}</span>
        {action || (rightTag && <span className="text-[10px] font-bold dark:bg-white/5 bg-slate-100 px-2 py-0.5 rounded text-slate-500">{rightTag}</span>)}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ProgressRow({ dark, label, value, width, fill }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-tight text-slate-500">
        <span>{label}</span>
        <span className="dark:text-slate-300 text-slate-800">{value}</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/5" : "bg-slate-100"}`}>
        <div className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`} />
      </div>
    </div>
  );
}

function MiniStat({ dark, label, value, vClass }: any) {
  return (
    <div className={`rounded p-4 ${dark ? "bg-white/5" : "bg-slate-50"}`}>
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${vClass}`}>{value}</div>
    </div>
  );
}

function StoreRow({ dark, border, label, value, vClass, icon, iconBg }: any) {
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${dark ? "border-white/5" : "border-slate-50"}`}>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{label}</div>
        <div className={`text-xl font-bold ${vClass}`}>{value}</div>
      </div>
      <div className={`h-10 w-10 rounded flex items-center justify-center ${iconBg}`}>{icon}</div>
    </div>
  );
}

function QuickAction({ dark, href, title, sub, icon }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded border transition-all ${dark ? "border-white/5 bg-white/2 hover:bg-white/5" : "border-slate-100 bg-slate-50 hover:bg-white"}`}>
      <div className="text-xl">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold dark:text-slate-200 text-slate-800">{title}</div>
        <div className="text-[10px] font-medium text-slate-400">{sub}</div>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  );
}