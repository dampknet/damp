"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { 
  BarChart3, 
  Settings2, 
  Activity, 
  Database, 
  Globe, 
  Package, 
  AlertCircle,
  ChevronRight,
  User,
  ShieldCheck,
  Clock
} from "lucide-react";

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
  stats,
  recentActivity,
}: {
  role: Role;
  email: string | null;
  displayName: string;
  stats: Stats;
  recentActivity: ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div className={dark ? "min-h-screen bg-[#0b0e14] text-slate-200" : "min-h-screen bg-[#fcfcfc] text-slate-900"}>
      
      {/* SYSTEM STATUS BAR */}
      <div className={`${dark ? "bg-[#11141d] border-white/5" : "bg-white border-slate-200"} border-b shadow-sm`}>
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live • April 2026
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            <User size={12} className="text-slate-400" /> {displayName} <span className="opacity-40">|</span> {role}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        
        {/* HEADER SECTION */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Enterprise Asset Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">Operational summary for network sites, assets, and inventory.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sites" className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              Sites
            </Link>
            <Link href="/store" className="rounded-lg bg-[#1d5fa8] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#164a82] transition-all">
              Store
            </Link>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          <KpiCard
            dark={dark}
            href="/sites"
            label="Total Sites"
            value={String(stats.sites)}
            icon={<Globe size={18} className="text-[#1d5fa8]" />}
            tag={`${stats.sitesActive} Active`}
            meta="registered"
          />
          <KpiCard
            dark={dark}
            href="/sites?group=status"
            label="Availability"
            value={`${stats.sitesActive} / ${stats.sites}`}
            icon={<Activity size={18} className="text-emerald-600" />}
            tag={`${stats.sitesDown} Offline`}
            tagColor={stats.sitesDown > 0 ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}
            meta="network health"
          />
          <KpiCard
            dark={dark}
            href="/sites?group=tt"
            label="Cooling Distribution"
            value={`${stats.airSites} Air`}
            icon={<Settings2 size={18} className="text-amber-600" />}
            tag={`${stats.liquidSites} Liquid`}
            meta="thermal config"
          />
          <KpiCard
            dark={dark}
            href="/sites?group=tower"
            label="Tower Ownership"
            value={String(stats.knetSites)}
            icon={<Database size={18} className="text-slate-500" />}
            tag={`${stats.knetPct}% KNET`}
            meta="core vs GBC"
          />
        </div>

        {/* MIDDLE SECTION - PROGRESS & STORE */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Assets Card */}
          <Card dark={dark} title="Asset Inventory" rightTag={`${stats.assets} Total`}>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <MiniStat dark={dark} label="Total Assets" value={String(stats.assets)} color="text-[#1d5fa8]" />
                <MiniStat dark={dark} label="Site Nodes" value={String(stats.sites)} color="text-slate-500" />
              </div>
              <ProgressRow
                dark={dark}
                label="Resource Utilization"
                value={`${stats.assetUtilPct}%`}
                width={stats.assetUtilPct}
                fill="bg-[#1d5fa8]"
              />
            </div>
          </Card>

          {/* Store Card */}
          <Card dark={dark} title="Store Logistics" rightTag={`${stats.storeTotal} Items`}>
            <div className="space-y-4">
              <StoreRow dark={dark} label="Received" value={String(stats.received)} color="text-emerald-600" />
              <StoreRow dark={dark} label="Pending" value={String(stats.notReceived)} color="text-orange-600" />
              <div className="pt-2">
                <ProgressRow
                  dark={dark}
                  label="Fulfilment Rate"
                  value={`${stats.receivedPct}%`}
                  width={stats.receivedPct}
                  fill="bg-emerald-600"
                />
              </div>
            </div>
          </Card>

          {/* Site Health Card */}
          <Card dark={dark} title="Site Analytics" rightTag={`${stats.activePct}% Health`}>
            <div className="space-y-5">
              <ProgressRow dark={dark} label="Online Status" value={`${stats.sitesActive}/${stats.sites}`} width={stats.activePct} fill="bg-emerald-600" />
              <ProgressRow dark={dark} label="Air-Cooled Sites" value={`${stats.airSites}/${stats.sites}`} width={stats.airPct} fill="bg-[#1d5fa8]" />
              <ProgressRow dark={dark} label="KNET Infrastructure" value={`${stats.knetSites}/${stats.sites}`} width={stats.knetPct} fill="bg-slate-700" />
            </div>
          </Card>
        </div>

        {/* BOTTOM SECTION - LOGS & ACTIONS */}
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Card 
            dark={dark} 
            title="System Activity Log" 
            action={<Link href="/activity" className="text-[10px] font-bold text-[#1d5fa8] uppercase tracking-widest hover:underline">Full Audit Trail</Link>}
          >
            <div className="divide-y dark:divide-white/5 divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No logs found.</div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1d5fa8]" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 truncate">{item.actorEmail}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap pt-1">
                      <Clock size={10} className="inline mr-1" /> {item.createdAtLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card dark={dark} title="Operations Menu">
            <div className="space-y-3">
              <QuickAction dark={dark} href="/sites" title="Network Sites" subtitle="Browse global registry" icon="🌐" />
              <QuickAction dark={dark} href="/store" title="Inventory Flow" subtitle="Verify pending items" icon="📦" />
              <QuickAction dark={dark} href="/sites?group=status" title="Maintenance" subtitle={`${stats.sitesDown} issues found`} icon="⚠️" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- SHARED UI COMPONENTS ---

function KpiCard({ dark, href, label, value, icon, tag, meta, tagColor }: any) {
  const content = (
    <div className={`rounded-xl border ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"} p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dark ? "bg-white/5" : "bg-slate-50"}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold dark:text-white text-slate-900 mb-4">{value}</div>
      <div className="flex items-center gap-2 border-t dark:border-white/5 border-slate-100 pt-4">
        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${tagColor || "bg-slate-100 dark:bg-white/10 text-slate-500"}`}>
          {tag}
        </span>
        <span className="text-[9px] font-bold text-slate-400 uppercase">{meta}</span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function Card({ dark, title, rightTag, action, children }: any) {
  return (
    <div className={`rounded-xl border ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"} shadow-sm overflow-hidden`}>
      <div className="px-6 py-4 border-b border-inherit flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">{title}</span>
        {action || (rightTag && <span className="text-[10px] font-bold bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-slate-500">{rightTag}</span>)}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ProgressRow({ dark, label, value, width, fill }: any) {
  return (
    <div className="space-y-2 mb-4 last:mb-0">
      <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
        <span className="text-slate-400">{label}</span>
        <span className="dark:text-slate-200 text-slate-800">{value}</span>
      </div>
      <div className={`h-1.5 w-full rounded-full ${dark ? "bg-white/5" : "bg-slate-100"} overflow-hidden`}>
        <div className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`} />
      </div>
    </div>
  );
}

function MiniStat({ dark, label, value, color }: any) {
  return (
    <div className={`p-4 rounded-lg border ${dark ? "border-white/5 bg-white/2" : "border-slate-100 bg-slate-50"}`}>
      <div className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-widest">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StoreRow({ dark, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 border-slate-50 dark:border-white/5">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

function QuickAction({ dark, href, title, subtitle, icon }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded-lg border ${dark ? "border-white/5 bg-white/2 hover:bg-white/5" : "border-slate-100 bg-slate-50 hover:bg-slate-100"} transition-colors group`}>
      <div className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold dark:text-slate-200 text-slate-800 tracking-tight">{title}</div>
        <div className="text-[10px] font-medium text-slate-400">{subtitle}</div>
      </div>
      <ChevronRight size={14} className="text-slate-300" />
    </Link>
  );
}