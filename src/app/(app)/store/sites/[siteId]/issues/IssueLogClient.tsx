"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";

type IssueRow = {
  id: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  quantity: number;
  requesterName: string;
  requesterContact: string | null;
  department: string | null;
  purpose: string;
  authorizedBy: string;
  issuedAt: Date;
  expectedReturnDate: Date | null;
  conditionAtIssue: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
  returnedBy: string | null;
  returnContact: string | null;
  returnedAt: Date | null;
  returnCondition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
  returnNote: string | null;
  status: "ISSUED" | "RETURNED";
  inventoryItem: {
    id: string;
    name: string;
    stockNumber: string | null;
    serialNumber: string | null;
    unit: string | null;
  };
};

type Summary = {
  issuedCount: number;
  returnedCount: number;
  materialCount: number;
  equipmentCount: number;
};

function SummaryCard({
  dark,
  label,
  value,
  sub,
  accent,
}: {
  dark: boolean;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)]"
      }
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
        <div
          className={
            dark
              ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
              : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"
          }
        >
          {label}
        </div>
        <div
          className={
            dark
              ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100"
              : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"
          }
        >
          {value}
        </div>
        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function badgeStatus(status: "ISSUED" | "RETURNED", dark: boolean) {
  const base = "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold";

  if (status === "RETURNED") {
    return dark
      ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
      : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  return dark
    ? `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`
    : `${base} border-amber-200 bg-amber-50 text-amber-700`;
}

export default function IssueLogClient({
  role,
  canEdit,
  site,
  q,
  status,
  type,
  summary,
  issues,
  exportRows,
  exportCols,
}: {
  role: string;
  canEdit: boolean;
  site: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
  };
  q: string;
  status: "ALL" | "ISSUED" | "RETURNED";
  type: "ALL" | "MATERIAL" | "EQUIPMENT";
  summary: Summary;
  issues: IssueRow[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const printTitle = `${site.name} Issue Log`;

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section
          className={
            dark
              ? "no-print relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
              : "no-print relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
          }
        >
          <div
            className={
              dark
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
            }
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-col items-start gap-3">
                <Link
                  href={`/store/sites/${site.id}`}
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                      : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                  }
                >
                  ← Back to {site.name} Inventory
                </Link>

                <div
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                      : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Issue Log
                </div>
              </div>

              <h1
                className={
                  dark
                    ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                {site.name} Issue Records
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Review all issued materials and checked-out equipment, including requester, authorization, issue time, and return status.
              </p>

              <div
                className={
                  dark
                    ? "mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                    : "mt-5 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {!canEdit ? " • view only" : ""}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={printTitle}
                rows={exportRows}
                columns={exportCols}
              />

              <Link
                href={`/store/sites/${site.id}/issue`}
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d2924]"
                }
              >
                + Issue Item
              </Link>
            </div>
          </div>

          <div
            className={
              dark
                ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
                : "mt-6 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-4"
            }
          >
            <form className="grid gap-3 md:grid-cols-4">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search requester, item, purpose..."
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 md:col-span-2"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm outline-none md:col-span-2"
                }
              />

              <select
                name="type"
                defaultValue={type}
                aria-label="Filter by issue type"
                title="Filter by issue type"
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="ALL">All Types</option>
                <option value="MATERIAL">Material</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>

              <select
                name="status"
                defaultValue={status}
                aria-label="Filter by issue status"
                title="Filter by issue status"
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="ALL">All Statuses</option>
                <option value="ISSUED">Issued</option>
                <option value="RETURNED">Returned</option>
              </select>

              <div className="flex items-center gap-2 md:col-span-4">
                <button
                  type="submit"
                  className={
                    dark
                      ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d2924]"
                  }
                >
                  Search
                </button>

                {(q || status !== "ALL" || type !== "ALL") ? (
                  <Link
                    href={`/store/sites/${site.id}/issues`}
                    className={
                      dark
                        ? "text-sm font-medium text-slate-400 hover:underline"
                        : "text-sm font-medium text-[#6f6a62] hover:underline"
                    }
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            dark={dark}
            label="Issued"
            value={String(summary.issuedCount)}
            sub="currently out / consumed"
            accent={dark ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]" : "bg-[#b08b2c]"}
          />
          <SummaryCard
            dark={dark}
            label="Returned"
            value={String(summary.returnedCount)}
            sub="equipment brought back"
            accent={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
          />
          <SummaryCard
            dark={dark}
            label="Materials"
            value={String(summary.materialCount)}
            sub="consumables issued"
            accent={dark ? "bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" : "bg-[#1d5fa8]"}
          />
          <SummaryCard
            dark={dark}
            label="Equipment"
            value={String(summary.equipmentCount)}
            sub="tracked equipment movement"
            accent={dark ? "bg-[linear-gradient(90deg,#f97316,#fb923c)]" : "bg-[#c8611a]"}
          />
        </div>

        <section
          className={
            dark
              ? "print-area mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
              : "print-area mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
          }
        >
          <div className="print-only px-5 py-4">
            <div id="print-title" className="text-lg font-semibold text-gray-900">
              {printTitle}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {issues.length} shown
            </div>
          </div>
          <div className="print-only h-px bg-gray-200" />

          <div className="flex items-center justify-between px-5 py-4">
            <div
              className={
                dark
                  ? "text-sm font-semibold text-slate-100"
                  : "text-sm font-semibold text-[#1a1814]"
              }
            >
              Issue Records
            </div>
            <div
              className={
                dark
                  ? "text-xs text-slate-500"
                  : "text-xs text-[#8b857c]"
              }
            >
              {issues.length} shown
            </div>
          </div>

          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className={
                  dark
                    ? "bg-[#101720] text-left text-slate-400"
                    : "bg-[#f8f4ee] text-left text-[#5b564d]"
                }
              >
                <tr>
                  <th className="px-5 py-3 font-medium">No</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Requester</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Authorized</th>
                  <th className="px-5 py-3 font-medium">Issued At</th>
                  <th className="px-5 py-3 font-medium">Expected Return</th>
                  <th className="px-5 py-3 font-medium">Returned At</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium no-print">Action</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {issues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className={
                        dark
                          ? "px-5 py-10 text-center text-slate-500"
                          : "px-5 py-10 text-center text-gray-600"
                      }
                    >
                      No issue records found.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue, index) => (
                    <tr
                      key={issue.id}
                      className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}
                    >
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {index + 1}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-100" : "px-5 py-3 text-[#1a1814]"}>
                        <div className="font-medium">{issue.inventoryItem.name}</div>
                        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                          {issue.inventoryItem.stockNumber ?? "-"}
                          {issue.inventoryItem.serialNumber ? ` • ${issue.inventoryItem.serialNumber}` : ""}
                        </div>
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        <div>{issue.requesterName}</div>
                        {issue.requesterContact ? (
                          <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                            {issue.requesterContact}
                          </div>
                        ) : null}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {issue.itemType}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {issue.quantity}
                        {issue.inventoryItem.unit ? ` ${issue.inventoryItem.unit}` : ""}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {issue.authorizedBy}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {new Date(issue.issuedAt).toLocaleString()}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {issue.expectedReturnDate
                          ? new Date(issue.expectedReturnDate).toLocaleString()
                          : "-"}
                      </td>

                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {issue.returnedAt
                          ? new Date(issue.returnedAt).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-5 py-3">
                        <span className={badgeStatus(issue.status, dark)}>
                          {issue.status}
                        </span>
                      </td>

                      <td className="px-5 py-3 no-print">
                        {issue.itemType === "EQUIPMENT" && issue.status === "ISSUED" ? (
                          <Link
                            href={`/store/sites/${site.id}/issues/${issue.id}/return`}
                            className={
                              dark
                                ? "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10"
                                : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                            }
                          >
                            Return
                          </Link>
                        ) : (
                          <span className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}