"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";
import AssetSerialInlineEdit from "@/components/AssetSerialInlineEdit";
import AssetStatusInlineEdit from "@/components/AssetStatusInlineEdit";

type AssetRow = {
  id: string;
  no: number;
  siteName: string;
  categoryName: string;
  subcategoryName: string;
  assetName: string;
  serialNumber: string | null;
  manufacturer: string;
  model: string;
  status: "ACTIVE" | "FAULTY" | "DECOMMISSIONED";
};

type Props = {
  role: string;
  email: string | null;
  canEdit: boolean;
  q: string;
  status: "ACTIVE" | "FAULTY" | "DECOMMISSIONED" | "";
  pageTitle: string;
  assets: AssetRow[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
};

export default function AssetsClient({
  role,
  email,
  canEdit,
  q,
  status,
  pageTitle,
  assets,
  exportRows,
  exportCols,
}: Props) {
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
                Asset Registry
              </div>

              <h1
                className={
                  dark
                    ? "text-3xl font-semibold tracking-tight text-slate-100"
                    : "text-3xl font-semibold tracking-tight text-[#1a1814]"
                }
              >
                All Assets
              </h1>

              <p
                className={
                  dark
                    ? "mt-2 text-sm font-medium text-slate-500"
                    : "mt-2 text-sm font-medium text-[#8b857c]"
                }
              >
                View all assets across all sites, search them, and print or export.
              </p>

              <div
                className={
                  dark
                    ? "mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                    : "mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {email ? (
                  <>
                    <span className={dark ? "text-slate-600" : "text-[#b5aea4]"}>•</span>
                    <span className={dark ? "text-slate-500" : "text-[#7a746a]"}>{email}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={pageTitle}
                filename="all-assets.csv"
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
            <form className="grid gap-3 md:grid-cols-3">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search asset, serial, model, manufacturer, site..."
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
                }
              />

              <select
                name="status"
                defaultValue={status ?? ""}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
                aria-label="Filter by asset status"
                title="Filter by asset status"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FAULTY">FAULTY</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED</option>
              </select>

              <div className="flex items-center gap-2">
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
                  href="/assets"
                  className={
                    dark
                      ? "text-sm font-semibold text-slate-400 hover:underline"
                      : "text-sm font-semibold text-[#5b564d] hover:underline"
                  }
                >
                  Clear
                </Link>
              </div>
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
              Assets
            </div>

            <div
              className={
                dark
                  ? "text-xs font-medium text-slate-500"
                  : "text-xs font-medium text-[#8b857c]"
              }
            >
              {assets.length} shown
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
                  <th className="px-5 py-3 font-semibold">Site</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Sub</th>
                  <th className="px-5 py-3 font-semibold">Device</th>
                  <th className="px-5 py-3 font-semibold">Serial</th>
                  <th className="px-5 py-3 font-semibold">Manufacturer</th>
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {assets.length === 0 ? (
                  <tr>
                    <td
                      className={
                        dark
                          ? "px-5 py-12 text-center text-slate-500"
                          : "px-5 py-12 text-center text-[#8b857c]"
                      }
                      colSpan={9}
                    >
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr
                      key={a.id}
                      className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}
                    >
                      <td
                        className={
                          dark
                            ? "px-5 py-3 font-medium text-slate-500"
                            : "px-5 py-3 font-medium text-[#6b655d]"
                        }
                      >
                        {a.no}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-400"
                            : "px-5 py-3 text-[#5d584f]"
                        }
                      >
                        {a.siteName}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-400"
                            : "px-5 py-3 text-[#5d584f]"
                        }
                      >
                        {a.categoryName}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-400"
                            : "px-5 py-3 text-[#5d584f]"
                        }
                      >
                        {a.subcategoryName}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 font-semibold text-slate-100"
                            : "px-5 py-3 font-semibold text-[#1a1814]"
                        }
                      >
                        {a.assetName}
                      </td>

                      <td className="px-5 py-3">
                        <AssetSerialInlineEdit
                          assetId={a.id}
                          initialSerial={a.serialNumber}
                          canEdit={canEdit}
                        />
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-400"
                            : "px-5 py-3 text-[#5d584f]"
                        }
                      >
                        {a.manufacturer}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-400"
                            : "px-5 py-3 text-[#5d584f]"
                        }
                      >
                        {a.model}
                      </td>

                      <td className="px-5 py-3">
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
    </div>
  );
}