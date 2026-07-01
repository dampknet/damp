"use client";

import Link from "next/link";
import PrintExportButton from "@/components/PrintExportButton";
import { useThemeMode } from "@/context/ThemeContext";

type IndicatorLabel =
  | "DOWN" | "UP" | "FAULT" | "UPDATED" | "SYSTEM" | "LOGIN"
  | "ISSUED" | "RETURNED" | "RESTOCK" | "IMPORT"
  | "LOW STOCK" | "OUT" | "DELETED" | "CREATED" | "UNIT";

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
};

type ActionOption = { value: string; label: string };

// Badge colour per label
const BADGE_COLOR: Record<IndicatorLabel, string> = {
  UP:        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  CREATED:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  RETURNED:  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  RESTOCK:   "border-green-500/30  bg-green-500/10  text-green-400",
  IMPORT:    "border-blue-500/30   bg-blue-500/10   text-blue-400",
  UPDATED:   "border-blue-500/30   bg-blue-500/10   text-blue-400",
  LOGIN:     "border-sky-500/30    bg-sky-500/10    text-sky-400",
  UNIT:      "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  ISSUED:    "border-amber-500/30  bg-amber-500/10  text-amber-400",
  "LOW STOCK":"border-orange-500/30 bg-orange-500/10 text-orange-400",
  FAULT:     "border-orange-500/30 bg-orange-500/10 text-orange-400",
  DOWN:      "border-red-500/30    bg-red-500/10    text-red-400",
  OUT:       "border-red-500/30    bg-red-500/10    text-red-400",
  DELETED:   "border-rose-500/30   bg-rose-500/10   text-rose-400",
  SYSTEM:    "border-slate-500/30  bg-slate-500/10  text-slate-400",
};

const BADGE_COLOR_LIGHT: Record<IndicatorLabel, string> = {
  UP:        "border-emerald-200 bg-emerald-50 text-emerald-700",
  CREATED:   "border-emerald-200 bg-emerald-50 text-emerald-700",
  RETURNED:  "border-emerald-200 bg-emerald-50 text-emerald-700",
  RESTOCK:   "border-green-200   bg-green-50   text-green-700",
  IMPORT:    "border-blue-200    bg-blue-50    text-blue-700",
  UPDATED:   "border-blue-200    bg-blue-50    text-blue-700",
  LOGIN:     "border-sky-200     bg-sky-50     text-sky-700",
  UNIT:      "border-indigo-200  bg-indigo-50  text-indigo-700",
  ISSUED:    "border-amber-200   bg-amber-50   text-amber-700",
  "LOW STOCK":"border-orange-200  bg-orange-50  text-orange-700",
  FAULT:     "border-orange-200  bg-orange-50  text-orange-700",
  DOWN:      "border-red-200     bg-red-50     text-red-700",
  OUT:       "border-red-200     bg-red-50     text-red-700",
  DELETED:   "border-rose-200    bg-rose-50    text-rose-700",
  SYSTEM:    "border-slate-200   bg-slate-50   text-slate-600",
};

export default function ActivityClient({
  q, type, period, actionOptions,
  title, activities, exportRows, exportCols,
}: {
  q:             string;
  type:          string;
  period:        "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR";
  actionOptions: ActionOption[];
  title:         string;
  activities:    ActivityItem[];
  exportRows:    Array<Record<string, string | number>>;
  exportCols:    Array<{ key: string; label: string }>;
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {/* ── HEADER ── */}
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
                Full audit trail — logins, site changes, inventory issues, restocks, warehouse borrowing, and more.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={title}
                filename="activity-log.csv"
                rows={exportRows}
                columns={exportCols}
              />
              <Link href="/dashboard" className={dark
                ? "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25"
                : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
              }>
                ← Dashboard
              </Link>
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="mt-6">
            <form className="grid gap-3 md:grid-cols-[1fr_280px_160px_auto_auto]">
              <input name="q" defaultValue={q}
                placeholder="Search title, details, actor, entity..."
                title="Search logs"
                className={dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  : "w-full rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
                }
              />

              <select name="type" defaultValue={type}
                aria-label="Filter by action" title="Filter by action"
                className={dark
                  ? "rounded-xl border border-white/10 bg-[#101720] px-3 py-2 text-sm text-slate-100"
                  : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="">All Actions</option>
                {actionOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <select name="period" defaultValue={period}
                aria-label="Filter by period" title="Filter by period"
                className={dark
                  ? "rounded-xl border border-white/10 bg-[#101720] px-3 py-2 text-sm text-slate-100"
                  : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
                <option value="YEAR">This Year</option>
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
            </form>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className={dark
          ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
        }>
          <div className="flex items-center justify-between px-5 py-4">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Activity Log
            </div>
            <div className={dark ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-[#8b857c]"}>
              {activities.length} shown
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
                  <th className="px-5 py-3 font-semibold text-right">Entity</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dark
                      ? "px-5 py-12 text-center text-slate-500"
                      : "px-5 py-12 text-center text-[#8b857c]"
                    }>
                      No activity found
                    </td>
                  </tr>
                ) : activities.map((a) => (
                  <tr key={a.id} className={dark
                    ? "hover:bg-white/5"
                    : "hover:bg-[#fcfaf7] transition-colors"
                  }>
                    {/* No */}
                    <td className={dark ? "px-5 py-4 font-medium text-slate-500" : "px-5 py-4 font-medium text-[#6b655d]"}>
                      {a.no}
                    </td>

                    {/* Time */}
                    <td className={dark ? "px-5 py-4 font-mono text-[12px] text-slate-400" : "px-5 py-4 font-mono text-[12px] text-[#5d584f]"}>
                      {a.timeLabel}
                    </td>

                    {/* Status dot + badge */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${dark ? BADGE_COLOR[a.indicator.label] : BADGE_COLOR_LIGHT[a.indicator.label]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${a.indicator.color}`} />
                        {a.indicator.label}
                      </span>
                    </td>

                    {/* Action type */}
                    <td className="px-5 py-4">
                      <span className={dark
                        ? "inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-300"
                        : "inline-flex rounded-full border border-[#e0dbd2] bg-[#f8f4ee] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[#5b564d]"
                      }>
                        {a.typeLabel}
                      </span>
                    </td>

                    {/* Title + details */}
                    <td className={dark ? "px-5 py-4 text-slate-100" : "px-5 py-4 text-[#1a1814]"}>
                      <div className="font-semibold text-sm">{a.reason}</div>
                      {a.details && (
                        <div className={dark ? "mt-1 text-xs font-normal text-slate-500" : "mt-1 text-xs font-normal text-[#8b857c]"}>
                          {a.details}
                        </div>
                      )}
                    </td>

                    {/* Actor */}
                    <td className={dark ? "px-5 py-4 text-xs text-slate-400" : "px-5 py-4 text-xs text-[#5d584f]"}>
                      {a.actorEmail}
                    </td>

                    {/* Entity */}
                    <td className="px-5 py-4 text-right">
                      {a.href ? (
                        <Link href={a.href} className={dark
                          ? "text-xs font-bold text-sky-400 hover:underline"
                          : "text-xs font-bold text-blue-700 hover:underline"
                        }>
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
    </div>
  );
}
