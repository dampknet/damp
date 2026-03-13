"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";
import AssetSerialInlineEdit from "@/components/AssetSerialInlineEdit";
import AssetStatusInlineEdit from "@/components/AssetStatusInlineEdit";

type AssetRow = {
  id: string;
  categoryName: string;
  subcategoryName: string;
  assetName: string;
  serialNumber: string | null;
  status: "ACTIVE" | "FAULTY" | "DECOMMISSIONED";
};

type Props = {
  siteId: string;
  siteName: string;
  role: string;
  canEdit: boolean;
  q: string;
  status: "" | "ACTIVE" | "FAULTY" | "DECOMMISSIONED";
  pageTitle: string;
  assets: AssetRow[];
  csvRows: Array<Record<string, string>>;
  exportCols: Array<{ key: string; label: string }>;
};

export default function SiteAssetsClient({
  siteId,
  siteName,
  role,
  canEdit,
  q,
  status,
  pageTitle,
  assets,
  csvRows,
  exportCols,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] print:bg-white text-slate-200"
          : "min-h-screen bg-gray-50 print:bg-white"
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10 print:py-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/sites/${siteId}`}
              className={
                dark
                  ? "text-sm text-slate-400 hover:underline print:hidden"
                  : "text-sm text-gray-600 hover:underline print:hidden"
              }
            >
              ← Back to Site
            </Link>

            <h1
              className={
                dark
                  ? "mt-2 text-2xl font-semibold text-slate-100"
                  : "mt-2 text-2xl font-semibold text-gray-900"
              }
            >
              {siteName} — All Devices
            </h1>

            <p
              className={
                dark
                  ? "mt-1 text-sm text-slate-500"
                  : "mt-1 text-sm text-gray-600"
              }
            >
              Search, filter, print or export.
            </p>

            <div
              className={
                dark
                  ? "mt-2 text-xs text-slate-500 print:hidden"
                  : "mt-2 text-xs text-gray-500 print:hidden"
              }
            >
              Role: <span className="font-semibold">{role}</span>
              {!canEdit ? " (view only)" : ""}
            </div>
          </div>

          <div className="print:hidden">
            <PrintExportButton
              title={pageTitle}
              filename={`${siteName}-devices.csv`}
              rows={csvRows}
              columns={exportCols}
            />
          </div>
        </div>

        <div
          className={
            dark
              ? "mt-6 rounded-xl border border-white/10 bg-white/5 p-4 print:hidden"
              : "mt-6 rounded-xl border bg-white p-4 print:hidden"
          }
        >
          <form className="grid gap-3 sm:grid-cols-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, serial, model, manufacturer…"
              className={
                dark
                  ? "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            />

            <select
              name="status"
              aria-label="Filter by status"
              defaultValue={status}
              className={
                dark
                  ? "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  : "rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
              title="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FAULTY">Faulty</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className={
                  dark
                    ? "w-full rounded-lg bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                    : "w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                }
              >
                Apply
              </button>

              <Link
                href={`/sites/${siteId}/assets`}
                className={
                  dark
                    ? "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium text-slate-100 hover:bg-white/10"
                    : "w-full rounded-lg border bg-white px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
                }
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

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
              ? "print-area mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/5"
              : "print-area mt-4 overflow-hidden rounded-xl border bg-white"
          }
        >
          <table className="w-full text-sm">
            <thead
              className={
                dark
                  ? "bg-[#101720] text-left text-slate-400"
                  : "bg-gray-100 text-left text-gray-700"
              }
            >
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sub</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className={dark ? "divide-y divide-white/8" : ""}>
              {assets.length === 0 ? (
                <tr>
                  <td
                    className={
                      dark
                        ? "px-4 py-10 text-center text-slate-500"
                        : "px-4 py-10 text-center text-gray-600"
                    }
                    colSpan={5}
                  >
                    No devices yet for this site.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id} className={dark ? "hover:bg-white/5" : "border-t"}>
                    <td
                      className={
                        dark
                          ? "px-4 py-3 text-slate-400"
                          : "px-4 py-3"
                      }
                    >
                      {a.categoryName}
                    </td>

                    <td
                      className={
                        dark
                          ? "px-4 py-3 text-slate-400"
                          : "px-4 py-3"
                      }
                    >
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

                    <td className="px-4 py-3">
                      <AssetSerialInlineEdit
                        assetId={a.id}
                        initialSerial={a.serialNumber}
                        canEdit={canEdit}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <AssetStatusInlineEdit
                        assetId={a.id}
                        initialStatus={a.status}
                        canEdit={canEdit}
                      />
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