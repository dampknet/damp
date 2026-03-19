"use client";

import Link from "next/link";
import PrintExportButton from "@/components/PrintExportButton";
import { useThemeMode } from "@/context/ThemeContext";

type ActivityItem = {
  id: string;
  no: number;
  timeLabel: string;
  reason: string;
  details: string;
  actorEmail: string;
  type: string;
  indicator: {
    color: string;
    label:
      | "DOWN"
      | "UP"
      | "FAULT"
      | "UPDATED"
      | "SYSTEM"
      | "LOGIN"
      | "ISSUED"
      | "RETURNED"
      | "RESTOCK"
      | "LOW STOCK"
      | "OUT"
      | "DELETED"
      | "CREATED";
  };
  href: string | null;
  entityLabel: string;
  exportTime: string;
  entityType: string;
  entityId: string;
};

export default function ActivityClient({
  q,
  type,
  typeOptions,
  title,
  activities,
  exportRows,
  exportCols,
}: {
  q: string;
  type: string;
  typeOptions: string[];
  title: string;
  activities: ActivityItem[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[#f5f2ed]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div
          className={
            dark
              ? "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-none backdrop-blur-xl"
              : "rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm"
          }
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div
                className={
                  dark
                    ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                    : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                }
              >
                Audit Trail
              </div>

              <h1
                className={
                  dark
                    ? "text-3xl font-semibold tracking-tight text-slate-100"
                    : "text-3xl font-semibold tracking-tight text-[#1a1814]"
                }
              >
                Recent Activity
              </h1>

              <p
                className={
                  dark
                    ? "mt-2 text-sm font-medium text-slate-500"
                    : "mt-2 text-sm font-medium text-[#8b857c]"
                }
              >
                Full audit log of recent actions across the system.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={title}
                filename="recent-activity.csv"
                rows={exportRows}
                columns={exportCols}
              />

              <Link
                href="/dashboard"
                className={
                  dark
                    ? "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
                }
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <form className="grid gap-3 md:grid-cols-[1fr_260px_auto_auto]">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search reason, actor, entity..."
                className={
                  dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                    : "w-full rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
                }
              />

              <select
                name="type"
                defaultValue={type}
                aria-label="Filter by activity type"
                title="Filter by activity type"
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="">All Types</option>
                {typeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                }
              >
                Search
              </button>

              <Link
                href="/activity"
                className={
                  dark
                    ? "self-center text-sm font-semibold text-slate-400 hover:underline"
                    : "self-center text-sm font-semibold text-[#5b564d] hover:underline"
                }
              >
                Clear
              </Link>
            </form>
          </div>
        </div>

        <div
          className={
            dark
              ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
              : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
          }
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div
              className={
                dark
                  ? "text-sm font-semibold text-slate-100"
                  : "text-sm font-semibold text-[#1a1814]"
              }
            >
              Activity Log
            </div>

            <div
              className={
                dark
                  ? "text-xs font-medium text-slate-500"
                  : "text-xs font-medium text-[#8b857c]"
              }
            >
              {activities.length} shown
            </div>
          </div>

          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <div className="max-h-[75vh] overflow-auto">
            <table className="w-full text-sm">
              <thead
                className={
                  dark
                    ? "sticky top-0 z-20 bg-[#101720] text-left text-slate-400"
                    : "sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm"
                }
              >
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {activities.length === 0 ? (
                  <tr>
                    <td
                      className={
                        dark
                          ? "px-5 py-12 text-center text-slate-500"
                          : "px-5 py-12 text-center text-[#8b857c]"
                      }
                      colSpan={6}
                    >
                      No activity found
                    </td>
                  </tr>
                ) : (
                  activities.map((a) => (
                    <tr
                      key={a.id}
                      className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}
                    >
                      <td className={dark ? "px-5 py-3 font-medium text-slate-500" : "px-5 py-3 font-medium text-[#6b655d]"}>
                        {a.no}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                        {a.timeLabel}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={
                            dark
                              ? "inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
                              : "inline-flex rounded-full border border-[#e0dbd2] bg-[#f8f4ee] px-2.5 py-1 text-[11px] font-semibold text-[#5b564d]"
                          }
                        >
                          {a.type}
                        </span>
                      </td>

                      <td className={dark ? "px-5 py-3 font-semibold text-slate-100" : "px-5 py-3 font-semibold text-[#1a1814]"}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${a.indicator.color}`} />
                          <div>
                            <div>{a.reason}</div>
                            {a.details ? (
                              <div className={dark ? "mt-1 text-xs font-normal text-slate-500" : "mt-1 text-xs font-normal text-[#8b857c]"}>
                                {a.details}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                        {a.actorEmail}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                        {a.href ? (
                          <Link
                            href={a.href}
                            className={
                              dark
                                ? "font-medium text-[#60a5fa] hover:underline"
                                : "font-medium text-[#c8611a] hover:underline"
                            }
                          >
                            {a.entityLabel}
                          </Link>
                        ) : (
                          a.entityLabel
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}