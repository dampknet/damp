"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import { useThemeMode } from "@/context/ThemeContext";
import { FileText, Loader2, X, ShieldAlert, RefreshCw, ArrowLeft, CheckCheck } from "lucide-react";
import { PERIOD_OPTIONS } from "@/lib/reports/period";
import { markSecurityReviewed } from "./actions";

type IndicatorLabel =
  | "DOWN" | "UP" | "FAULT" | "UPDATED" | "SYSTEM" | "LOGIN"
  | "ISSUED" | "RETURNED" | "RESTOCK" | "IMPORT"
  | "LOW STOCK" | "OUT" | "DELETED" | "CREATED" | "UNIT"
  | "SECURITY" | "DELIVERED";

type ActivityItem = {
  id:          string;
  no:          number;
  timeLabel:   string;
  reason:      string;
  details:     string;
  actorEmail:  string;
  type:        string;
  typeLabel:   string;
  indicator:   { color: string; label: IndicatorLabel };
  href:        string | null;
  entityLabel: string;
  exportTime:  string;
  entityType:  string;
  entityId:    string;
  isNew:       boolean;   // security alert not yet reviewed by this master admin
};

type ActionOption  = { value: string; label: string };
type InventorySite = { id: string; name: string };

type ReportType = "FULL" | "SITES" | "WAREHOUSES" | "ACTIVITY";
const REPORT_TYPES: { value: ReportType; label: string; sub: string }[] = [
  { value: "FULL",       label: "Full system",   sub: "Everything in one document" },
  { value: "SITES",      label: "Site stores",   sub: "42 sites + other places" },
  { value: "WAREHOUSES", label: "Warehouses",    sub: "Issues, returns, restocks, stock" },
  { value: "ACTIVITY",   label: "Activity",      sub: "Actions and sign-ins" },
];

const BADGE_COLOR: Record<IndicatorLabel, string> = {
  UP:          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  CREATED:     "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  RETURNED:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  RESTOCK:     "border-green-500/30 bg-green-500/10 text-green-400",
  IMPORT:      "border-blue-500/30 bg-blue-500/10 text-blue-400",
  UPDATED:     "border-blue-500/30 bg-blue-500/10 text-blue-400",
  LOGIN:       "border-sky-500/30 bg-sky-500/10 text-sky-400",
  UNIT:        "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  ISSUED:      "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "LOW STOCK": "border-orange-500/30 bg-orange-500/10 text-orange-400",
  FAULT:       "border-orange-500/30 bg-orange-500/10 text-orange-400",
  DOWN:        "border-red-500/30 bg-red-500/10 text-red-400",
  OUT:         "border-red-500/30 bg-red-500/10 text-red-400",
  DELETED:     "border-rose-500/30 bg-rose-500/10 text-rose-400",
  SYSTEM:      "border-slate-500/30 bg-slate-500/10 text-slate-400",
  SECURITY:    "border-red-600/40 bg-red-600/10 text-red-400",
  DELIVERED:   "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const BADGE_COLOR_LIGHT: Record<IndicatorLabel, string> = {
  UP:          "border-emerald-200 bg-emerald-50 text-emerald-700",
  CREATED:     "border-emerald-200 bg-emerald-50 text-emerald-700",
  RETURNED:    "border-emerald-200 bg-emerald-50 text-emerald-700",
  RESTOCK:     "border-green-200 bg-green-50 text-green-700",
  IMPORT:      "border-blue-200 bg-blue-50 text-blue-700",
  UPDATED:     "border-blue-200 bg-blue-50 text-blue-700",
  LOGIN:       "border-sky-200 bg-sky-50 text-sky-700",
  UNIT:        "border-indigo-200 bg-indigo-50 text-indigo-700",
  ISSUED:      "border-amber-200 bg-amber-50 text-amber-700",
  "LOW STOCK": "border-orange-200 bg-orange-50 text-orange-700",
  FAULT:       "border-orange-200 bg-orange-50 text-orange-700",
  DOWN:        "border-red-200 bg-red-50 text-red-700",
  OUT:         "border-red-200 bg-red-50 text-red-700",
  DELETED:     "border-rose-200 bg-rose-50 text-rose-700",
  SYSTEM:      "border-slate-200 bg-slate-50 text-slate-600",
  SECURITY:    "border-red-300 bg-red-50 text-red-700",
  DELIVERED:   "border-violet-200 bg-violet-50 text-violet-700",
};

export default function ActivityClient({
  q, type, period, from, to, site, view, actionOptions,
  title, activities, securityActivities, isMasterAdmin,
  exportRows, exportCols, inventorySites, broadcastSites,
  securityUnseen, securitySeenAt,
}: {
  broadcastSites:     InventorySite[];
  securityUnseen:     number;
  securitySeenAt:     string | null;
  q:                  string;
  type:               string;
  period:             "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";
  from:               string;
  to:                 string;
  site:               string;
  view:               string;
  actionOptions:      ActionOption[];
  title:              string;
  activities:         ActivityItem[];
  securityActivities: ActivityItem[];
  isMasterAdmin:      boolean;
  exportRows:         Array<Record<string, string | number>>;
  exportCols:         Array<{ key: string; label: string }>;
  inventorySites:     InventorySite[];
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();

  const isSecurityView = view === "security" && isMasterAdmin;
  const displayItems   = isSecurityView ? securityActivities : activities;

  const [reviewing, startReview] = useTransition();
  const markReviewed = () => startReview(async () => {
    await markSecurityReviewed();
    router.refresh();
  });

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 60000);
    return () => clearInterval(interval);
  }, [router]);

  const [periodSel,    setPeriodSel]    = useState<string>(period);
  const [showReport,   setShowReport]   = useState(false);
  const [reportType,   setReportType]   = useState<ReportType>("FULL");
  const [reportPeriod, setReportPeriod] = useState("THIS_MONTH");
  const [reportFrom,   setReportFrom]   = useState("");
  const [reportTo,     setReportTo]     = useState("");
  const [reportWh,     setReportWh]     = useState("ALL");
  const [reportSite,   setReportSite]   = useState("ALL");
  const [generating,   setGenerating]   = useState(false);
  const [reportError,  setReportError]  = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (reportPeriod === "CUSTOM" && (!reportFrom || !reportTo)) {
      setReportError("Choose both a From and a To date.");
      return;
    }
    setGenerating(true);
    setReportError(null);
    try {
      const res = await fetch("/api/activity/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type: reportType, period: reportPeriod, from: reportFrom, to: reportTo,
          warehouseId: reportWh, siteScope: reportSite,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Report generation failed. Please try again.");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.headers.get("X-Report-Filename") ?? "KIMS-Report.docx";
      a.click();
      URL.revokeObjectURL(url);
      setShowReport(false);
    } catch (e) {
      setReportError((e as Error).message || "Report generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";

  const labelCls = dark ? "mb-1.5 block text-xs font-semibold text-slate-300" : "mb-1.5 block text-xs font-semibold text-[#1a1814]";

  const selectCls = dark
    ? "rounded-xl border border-white/10 bg-[#101720] px-3 py-2 text-sm text-slate-100"
    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm";

  const SITE_INCLUDES = [
    "Items sent, delivered and still pending",
    "All 42 sites in one table — including sites that got nothing",
    "Other places (typed destinations)",
    "Top 5 most sent items per site",
    "Everything still pending, with days waiting",
  ];
  const WAREHOUSE_INCLUDES = [
    "Issued, returned and restocked — per warehouse",
    "Most issued items and where they were sent",
    "Full lists of issues, returns and restocks",
    "Items low or out of stock today",
  ];
  const ACTIVITY_INCLUDES = [
    "Actions by type and by person",
    ...(isMasterAdmin ? ["Sign-ins per person and security events"] : []),
  ];
  const reportIncludes =
    reportType === "SITES"      ? SITE_INCLUDES :
    reportType === "WAREHOUSES" ? WAREHOUSE_INCLUDES :
    reportType === "ACTIVITY"   ? ACTIVITY_INCLUDES :
    ["Site stores (42 sites + other places)", "Warehouses (issues, returns, restocks, stock alerts)", "Activity & sign-ins"];

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        <div className={dark
          ? "rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm"
        }>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className={dark
                ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }>
                Audit Trail
              </div>
              <h1 className={dark
                ? "text-3xl font-semibold tracking-tight text-slate-100"
                : "text-3xl font-semibold tracking-tight text-[#1a1814]"
              }>
                Activity Log
              </h1>
              <p className={dark ? "mt-2 text-sm font-medium text-slate-500" : "mt-2 text-sm font-medium text-[#8b857c]"}>
                {isMasterAdmin
                  ? "Full audit trail — sign-ins, security events, site changes, inventory issues, restocks and more."
                  : "Site changes, inventory issues, restocks, warehouse borrowing and more."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isMasterAdmin && (
                <div className={`flex overflow-hidden rounded-xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
                  <Link href="/activity"
                    className={`px-3 py-2 text-xs font-bold transition ${
                      !isSecurityView
                        ? dark ? "bg-white/10 text-slate-100" : "bg-[#1a1814] text-white"
                        : dark ? "text-slate-400 hover:bg-white/5" : "text-[#5b564d] hover:bg-[#f5f2ed]"
                    }`}>
                    All Activity
                  </Link>
                  <Link href="/activity?view=security"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition ${
                      isSecurityView
                        ? "bg-red-600 text-white"
                        : dark ? "text-red-400 hover:bg-red-500/10" : "text-red-700 hover:bg-red-50"
                    }`}>
                    <ShieldAlert size={13} />
                    Security
                    {securityUnseen > 0 && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white" title="New security events since your last review">
                        {securityUnseen > 99 ? "99+" : securityUnseen}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                dark ? "border-white/10 bg-white/5 text-slate-500" : "border-[#e0dbd2] bg-white text-[#8b857c]"
              }`}>
                <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "8s" }} />
                Live · 60s
              </div>

              <button
                onClick={() => setShowReport(true)}
                className={dark
                  ? "inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  : "inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                }
              >
                <FileText size={16} /> Generate Report
              </button>

              <PrintExportButton
                title={title}
                filename={isSecurityView ? "security-events.csv" : "activity-log.csv"}
                rows={exportRows}
                columns={exportCols}
              />

              <Link href="/admin" className={dark
                ? "inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25"
                : "inline-flex items-center gap-1.5 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
              }>
                <ArrowLeft size={15} /> Admin Settings
              </Link>
            </div>
          </div>

          {!isSecurityView && (
            <div className="mt-6">
              <form className="grid gap-3 md:grid-cols-[1fr_220px_160px_160px_auto_auto]">
                <input name="q" defaultValue={q}
                  placeholder="Search title, details, actor, entity..."
                  title="Search logs"
                  className={dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    : "w-full rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
                  }
                />

                <select name="type" defaultValue={type} aria-label="Filter by action" title="Filter by action" className={selectCls}>
                  <option value="">All Actions</option>
                  {actionOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>

                <select name="site" defaultValue={site} aria-label="Filter by site" title="Filter by site" className={selectCls}>
                  <option value="">All Sites</option>
                  {inventorySites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select name="period" value={periodSel} onChange={(e) => setPeriodSel(e.target.value)}
                  aria-label="Filter by period" title="Filter by period" className={selectCls}>
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                  <option value="YEAR">This Year</option>
                  <option value="CUSTOM">Custom dates…</option>
                </select>

                <button type="submit" className={dark
                  ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                }>
                  Search
                </button>

                <Link href="/activity" className={dark
                  ? "self-center text-sm font-semibold text-slate-400 hover:underline"
                  : "self-center text-sm font-semibold text-[#5b564d] hover:underline"
                }>
                  Clear
                </Link>

                {periodSel === "CUSTOM" && (
                  <div className="flex flex-wrap items-center gap-3 md:col-span-6">
                    <label className={dark ? "flex items-center gap-2 text-xs font-semibold text-slate-400" : "flex items-center gap-2 text-xs font-semibold text-[#5b564d]"}>
                      From
                      <input type="date" name="from" defaultValue={from} max={to || undefined} className={selectCls} />
                    </label>
                    <label className={dark ? "flex items-center gap-2 text-xs font-semibold text-slate-400" : "flex items-center gap-2 text-xs font-semibold text-[#5b564d]"}>
                      To
                      <input type="date" name="to" defaultValue={to} min={from || undefined} className={selectCls} />
                    </label>
                    <span className={dark ? "text-[11px] text-slate-500" : "text-[11px] text-[#8b857c]"}>
                      Leave one side empty for an open range. Both days are included.
                    </span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        <div className={dark
          ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
        }>
          <div className="flex items-center justify-between px-5 py-4">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              {isSecurityView ? (
                <span className="flex items-center gap-2 text-red-500">
                  <ShieldAlert size={16} /> Security Events
                </span>
              ) : "Activity Log"}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {isSecurityView && (
                securityUnseen > 0 ? (
                  <button type="button" onClick={markReviewed} disabled={reviewing}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {reviewing ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                    Mark all as reviewed ({securityUnseen})
                  </button>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-emerald-400" : "text-emerald-700"}`} suppressHydrationWarning>
                    <CheckCheck size={13} /> All reviewed{securitySeenAt ? ` · ${new Date(securitySeenAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </span>
                )
              )}
              <div className={dark ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-[#8b857c]"}>
                {displayItems.length} shown
              </div>
            </div>
          </div>
          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <div className="max-h-[75vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className={dark
                ? "sticky top-0 z-20 bg-[#101720] text-left text-slate-400"
                : "sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm"
              }>
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Title & Details</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 text-right font-semibold">Entity</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dark ? "px-5 py-12 text-center text-slate-500" : "px-5 py-12 text-center text-[#8b857c]"}>
                      {isSecurityView ? "No security events recorded." : "No activity found"}
                    </td>
                  </tr>
                ) : displayItems.map((a) => (
                  <tr key={a.id} className={
                    isSecurityView && a.isNew
                      ? dark ? "bg-red-500/8 hover:bg-red-500/12" : "bg-red-50/70 hover:bg-red-50"
                      : dark ? "hover:bg-white/5" : "transition-colors hover:bg-[#fcfaf7]"
                  }>
                    <td className={dark ? "px-5 py-4 font-medium text-slate-500" : "px-5 py-4 font-medium text-[#6b655d]"}>{a.no}</td>
                    <td className={dark ? "px-5 py-4 font-mono text-[12px] text-slate-400" : "px-5 py-4 font-mono text-[12px] text-[#5d584f]"}>{a.timeLabel}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${dark ? BADGE_COLOR[a.indicator.label] : BADGE_COLOR_LIGHT[a.indicator.label]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${a.indicator.color}`} />
                        {a.indicator.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={dark
                        ? "inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-300"
                        : "inline-flex rounded-full border border-[#e0dbd2] bg-[#f8f4ee] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[#5b564d]"
                      }>
                        {a.typeLabel}
                      </span>
                    </td>
                    <td className={dark ? "min-w-[280px] px-5 py-4 text-slate-100" : "min-w-[280px] px-5 py-4 text-[#1a1814]"}>
                      <div className="text-sm font-semibold [overflow-wrap:anywhere]">
                        {isSecurityView && a.isNew && (
                          <span className="mr-1.5 inline-block rounded bg-red-600 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-wide text-white">New</span>
                        )}
                        {a.reason}
                      </div>
                      {a.details && (
                        <div className={dark ? "mt-1 text-xs font-normal text-slate-500 [overflow-wrap:anywhere]" : "mt-1 text-xs font-normal text-[#8b857c] [overflow-wrap:anywhere]"}>
                          {a.details}
                        </div>
                      )}
                    </td>
                    <td className={dark ? "px-5 py-4 text-xs text-slate-400" : "px-5 py-4 text-xs text-[#5d584f]"}>{a.actorEmail}</td>
                    <td className="px-5 py-4 text-right">
                      {a.href ? (
                        <Link href={a.href} className={dark ? "text-xs font-bold text-sky-400 hover:underline" : "text-xs font-bold text-blue-700 hover:underline"}>
                          {a.entityLabel}
                        </Link>
                      ) : (
                        <span className="text-xs opacity-40">{a.entityLabel}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}
        >
          <div className={dark
            ? "max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0f1923] shadow-2xl"
            : "max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#e7ded3] bg-white shadow-2xl"
          }>
            <div className="h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981)]" />
            <div className="p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>
                    Generate Report
                  </div>
                  <div className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-[#8b857c]"}>
                    Downloads a Word document (.docx) for the period you choose.
                  </div>
                </div>
                <button onClick={() => setShowReport(false)} aria-label="Close"
                  className={dark ? "text-slate-500 hover:text-slate-300" : "text-[#9c9890] hover:text-[#1a1814]"}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Report type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_TYPES.map((t) => (
                      <button key={t.value} type="button" onClick={() => setReportType(t.value)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          reportType === t.value
                            ? dark ? "border-emerald-500/50 bg-emerald-500/10" : "border-[#2a7d52] bg-emerald-50"
                            : dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-[#ddd5c9] bg-white hover:bg-[#faf7f2]"
                        }`}>
                        <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>{t.label}</div>
                        <div className={dark ? "mt-0.5 text-[11px] text-slate-500" : "mt-0.5 text-[11px] text-[#8b857c]"}>{t.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {reportType === "WAREHOUSES" && (
                  <div>
                    <label className={labelCls}>Warehouse</label>
                    <select value={reportWh} onChange={(e) => setReportWh(e.target.value)} title="Warehouse" className={inputCls}>
                      <option value="ALL">All warehouses</option>
                      {inventorySites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {reportType === "SITES" && (
                  <div>
                    <label className={labelCls}>Site</label>
                    <select value={reportSite} onChange={(e) => setReportSite(e.target.value)} title="Site" className={inputCls}>
                      <option value="ALL">All 42 sites + other places</option>
                      <option value="OTHER">Other places only</option>
                      {broadcastSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Period</label>
                  <select value={reportPeriod} onChange={(e) => { setReportPeriod(e.target.value); setReportError(null); }} title="Report period" className={inputCls}>
                    {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {reportPeriod === "CUSTOM" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className={dark ? "text-[11px] font-semibold text-slate-400" : "text-[11px] font-semibold text-[#6b655d]"}>
                        From
                        <input type="date" value={reportFrom} max={reportTo || undefined} onChange={(e) => setReportFrom(e.target.value)} className={`${inputCls} mt-1`} />
                      </label>
                      <label className={dark ? "text-[11px] font-semibold text-slate-400" : "text-[11px] font-semibold text-[#6b655d]"}>
                        To
                        <input type="date" value={reportTo} min={reportFrom || undefined} onChange={(e) => setReportTo(e.target.value)} className={`${inputCls} mt-1`} />
                      </label>
                    </div>
                  )}
                </div>

                <div className={dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400"
                  : "rounded-xl border border-[#e7dfd4] bg-[#fffdf9] px-4 py-3 text-xs text-[#6b655d]"
                }>
                  <div className={dark ? "mb-1 font-semibold text-slate-300" : "mb-1 font-semibold text-[#1a1814]"}>Report includes:</div>
                  <ul className="space-y-0.5 pl-3">
                    {reportIncludes.map((item) => (
                      <li key={item} className="list-disc">{item}</li>
                    ))}
                  </ul>
                </div>

                {reportError && (
                  <div className={dark
                    ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                    : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  }>
                    {reportError}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className={dark
                    ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2a7d52,#10b981)] py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
                    : "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2a7d52] py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
                  }
                >
                  {generating
                    ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                    : <><FileText size={16} /> Generate & Download</>
                  }
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className={dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
