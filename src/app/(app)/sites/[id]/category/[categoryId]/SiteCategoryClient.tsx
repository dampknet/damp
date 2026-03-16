"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";

type Row = {
  id: string;
  subcategoryName: string;
  assetName: string;
  serialNumber: string;
  status: string;
};

function SummaryCard({
  dark,
  label,
  value,
  accent,
}: {
  dark: boolean;
  label: string;
  value: string;
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
      </div>
    </div>
  );
}

function Chip({
  dark,
  label,
  value,
}: {
  dark: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={
        dark
          ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
          : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
      }
    >
      {label}:{" "}
      <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
        {value}
      </span>
    </span>
  );
}

export default function SiteCategoryClient({
  siteId,
  siteName,
  categoryId,
  categoryName,
  q,
  pageTitle,
  csvRows,
  exportCols,
  rows,
}: {
  siteId: string;
  siteName: string;
  categoryId: string;
  categoryName: string;
  q: string;
  pageTitle: string;
  csvRows: Array<Record<string, string>>;
  exportCols: Array<{ key: string; label: string }>;
  rows: Row[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const uniqueSubs = new Set(rows.map((r) => r.subcategoryName).filter((x) => x !== "-"));

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] print:bg-white text-slate-200"
          : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)] print:bg-white"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 print:py-0">
        <section
          className={
            dark
              ? "no-print relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl print:hidden"
              : "no-print relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)] print:hidden"
          }
        >
          <div
            className={
              dark
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
            }
          />

          {!dark ? (
            <>
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#1d5fa8]/8 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#c8611a]/8 blur-3xl" />
            </>
          ) : null}

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/sites/${siteId}`}
                className={
                  dark
                    ? "inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                    : "inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                }
              >
                ← Back to Site
              </Link>

              <div
                className={
                  dark
                    ? "mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                    : "mt-3 inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Category View
              </div>

              <h1
                className={
                  dark
                    ? "mt-3 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-3 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                {pageTitle}
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Review all devices under this category, search quickly, and print or
                export the exact records you need.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip dark={dark} label="Site" value={siteName} />
                <Chip dark={dark} label="Category" value={categoryName} />
                <Chip dark={dark} label="Devices" value={String(rows.length)} />
                <Chip dark={dark} label="Subcategories" value={String(uniqueSubs.size)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PrintExportButton
                title={pageTitle}
                filename={`${siteName}-${categoryName}.csv`}
                rows={csvRows}
                columns={exportCols}
              />
            </div>
          </div>

          <div
            className={
              dark
                ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
                : "mt-6 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-4"
            }
          >
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name, serial, model, manufacturer…"
                className={
                  dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                }
              />

              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-95"
                    : "rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900"
                }
              >
                Search
              </button>

              <Link
                href={`/sites/${siteId}/category/${categoryId}`}
                className={
                  dark
                    ? "text-sm font-medium text-slate-400 hover:underline"
                    : "text-sm font-medium text-gray-700 hover:underline"
                }
              >
                Clear
              </Link>
            </form>
          </div>
        </section>
        <div className="print-only mt-6">
          <div id="print-title" className="text-lg font-semibold text-gray-900">
            {pageTitle}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Printed on {new Date().toLocaleString()}
          </div>
        </div>
        <div className="print-only h-px bg-gray-200" />

        <div
          className={
            dark
              ? "print-area mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              : "print-area mt-4 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
          }
        >
          <div
            className={
              dark
                ? "h-1 w-full bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)] opacity-80"
                : "h-1 w-full bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
            }
          />

          <div className="flex items-center justify-between px-5 py-4">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Devices
            </div>
            <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
              {rows.length} shown
            </div>
          </div>

          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <table className="w-full text-sm">
            <thead
              className={
                dark
                  ? "bg-[#101720] text-left text-slate-400"
                  : "bg-[#f8f4ee] text-left text-[#5b564d]"
              }
            >
              <tr>
                <th className="px-4 py-3">Sub</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className={
                      dark
                        ? "px-4 py-10 text-center text-slate-500"
                        : "px-4 py-10 text-center text-gray-600"
                    }
                    colSpan={4}
                  >
                    No devices yet under this category.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                    <td className={dark ? "px-4 py-3 text-slate-400" : "px-4 py-3 text-[#5d584f]"}>
                      {a.subcategoryName}
                    </td>
                    <td
                      className={
                        dark
                          ? "px-4 py-3 font-medium text-slate-100"
                          : "px-4 py-3 font-medium text-gray-900"
                      }
                    >
                      {a.assetName}
                    </td>
                    <td className={dark ? "px-4 py-3 text-slate-400" : "px-4 py-3 text-[#5d584f]"}>
                      {a.serialNumber}
                    </td>
                    <td className={dark ? "px-4 py-3 text-slate-400" : "px-4 py-3 text-[#5d584f]"}>
                      {a.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}