"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";
import StoreStatusSelect from "@/components/StoreStatusSelect";
import DeleteStoreItemDialog from "@/components/DeleteStoreItemDialog";

type StoreItemRow = {
  id: string;
  itemNo: number;
  description: string;
  quantity: number;
  status: "RECEIVED" | "NOT_RECEIVED";
};

type Props = {
  role: string;
  canEdit: boolean;
  q: string;
  status: "ALL" | "RECEIVED" | "NOT_RECEIVED";
  printTitle: string;
  items: StoreItemRow[];
  receivedCount: number;
  notReceivedCount: number;
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
  itemMini: Array<{ id: string; itemNo: number }>;
};

export default function StoreClient({
  role,
  canEdit,
  q,
  status,
  printTitle,
  items,
  receivedCount,
  notReceivedCount,
  exportRows,
  exportCols,
  itemMini,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

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

          {!dark ? (
            <>
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#1d5fa8]/8 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#c8611a]/8 blur-3xl" />
            </>
          ) : null}

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-col items-start gap-3">
                <Link
                    href="/store"
                    className={
                    dark
                        ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                        : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                    }
                >
                    ← Back to Store Dashboard
                </Link>

                <div
                    className={
                    dark
                        ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                        : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                    }
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Central Stock
                </div>
                </div>

              <h1
                className={
                    dark
                    ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
                >
                Central Stock Register
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                This is your original stock register. Search, filter, print, export,
                and keep legacy stock records safely separated from the new site inventory module.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                      : "inline-flex items-center rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                  }
                >
                  Total:
                  <span className="ml-1 font-semibold">
                    {receivedCount + notReceivedCount}
                  </span>
                </span>

                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300"
                      : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                  }
                >
                  Received:
                  <span className="ml-1 font-semibold">{receivedCount}</span>
                </span>

                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300"
                      : "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
                  }
                >
                  Not received:
                  <span className="ml-1 font-semibold">{notReceivedCount}</span>
                </span>

                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                      : "inline-flex items-center rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                  }
                >
                  Role:
                  <span className="ml-1 font-semibold">{role}</span>
                  {!canEdit ? " (view only)" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={printTitle}
                rows={exportRows}
                columns={exportCols}
              />

              <div className="print:hidden">
                <DeleteStoreItemDialog items={itemMini} canEdit={canEdit} />
              </div>

              {canEdit ? (
                <Link
                  href="/store/central-stock/new"
                  className={
                    dark
                      ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                      : "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  }
                >
                  + Add Item
                </Link>
              ) : (
                <div
                  className={
                    dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-500"
                      : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-500"
                  }
                >
                  View only
                </div>
              )}
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
              <div
                className={
                  dark
                    ? "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    : "flex w-full items-center gap-2 rounded-xl border border-[#ddd5c9] bg-white px-3 py-2"
                }
              >
                <span className={dark ? "text-slate-600" : "text-gray-400"}>🔎</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by item number or description…"
                  className={
                    dark
                      ? "w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      : "w-full bg-transparent text-sm outline-none"
                  }
                  aria-label="Search central stock items"
                />
              </div>

              <select
                name="status"
                defaultValue={status}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                }
                aria-label="Filter by status"
                title="Filter by status"
              >
                <option value="ALL">All</option>
                <option value="RECEIVED">Received</option>
                <option value="NOT_RECEIVED">Not received</option>
              </select>

              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                    : "rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                }
              >
                Search
              </button>

              {(q || status !== "ALL") ? (
                <Link
                  href="/store/central-stock"
                  className={
                    dark
                      ? "text-sm font-medium text-slate-400 hover:underline"
                      : "text-sm font-medium text-gray-700 hover:underline"
                  }
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </section>

        <div
          className={
            dark
              ? "print-area mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
              : "print-area mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
          }
        >
          <div className="print-only px-5 py-4">
            <div id="print-title" className="text-lg font-semibold text-gray-900">
              {printTitle}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Printed on {new Date().toLocaleString()}
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
              Central Stock Items
            </div>
            <div
              className={
                dark
                  ? "text-xs text-slate-500"
                  : "text-xs text-[#8b857c]"
              }
            >
              {items.length} shown
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
                  <th className="w-20 px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="w-28 px-5 py-3 font-medium">Qty</th>
                  <th className="w-56 px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {items.length === 0 ? (
                  <tr>
                    <td
                      className={
                        dark
                          ? "px-5 py-10 text-center text-slate-500"
                          : "px-5 py-10 text-center text-gray-600"
                      }
                      colSpan={4}
                    >
                      <div className="mx-auto max-w-md">
                        <div
                          className={
                            dark
                              ? "text-base font-semibold text-slate-100"
                              : "text-base font-semibold text-gray-900"
                          }
                        >
                          No items found
                        </div>
                        <p
                          className={
                            dark
                              ? "mt-1 text-sm text-slate-500"
                              : "mt-1 text-sm text-gray-600"
                          }
                        >
                          Try a different keyword, or clear filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr
                      key={it.id}
                      className={dark ? "align-top hover:bg-white/5" : "align-top hover:bg-[#fcfaf7]"}
                    >
                      <td
                        className={
                          dark
                            ? "px-5 py-3 font-semibold text-slate-100"
                            : "px-5 py-3 font-semibold text-gray-900"
                        }
                      >
                        {it.itemNo}
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-300"
                            : "px-5 py-3 text-gray-700"
                        }
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
                          {it.description}
                        </pre>
                      </td>

                      <td
                        className={
                          dark
                            ? "px-5 py-3 text-slate-100"
                            : "px-5 py-3 text-gray-900"
                        }
                      >
                        {it.quantity}
                      </td>

                      <td className="px-5 py-3">
                        <StoreStatusSelect
                          itemId={it.id}
                          initialStatus={it.status}
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

        <p
          className={
            dark
              ? "no-print mt-3 text-xs text-slate-500"
              : "no-print mt-3 text-xs text-gray-500"
          }
        >
          Tip: Print/Export only what you searched or filtered.
        </p>
      </div>
    </div>
  );
}