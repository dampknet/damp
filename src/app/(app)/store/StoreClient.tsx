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
          : "min-h-screen bg-gray-50"
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div
          className={
            dark
              ? "no-print rounded-2xl border border-white/10 bg-white/5 p-6 shadow-none backdrop-blur-xl"
              : "no-print rounded-2xl border bg-white p-6 shadow-sm"
          }
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className={
                  dark
                    ? "text-2xl font-semibold text-slate-100"
                    : "text-2xl font-semibold text-gray-900"
                }
              >
                Store
              </h1>
              <p
                className={
                  dark
                    ? "mt-1 text-sm text-slate-500"
                    : "mt-1 text-sm text-gray-600"
                }
              >
                Inventory list (search, filter, print, export).
              </p>

              <div
                className={
                  dark
                    ? "mt-2 text-xs text-slate-500"
                    : "mt-2 text-xs text-gray-500"
                }
              >
                Role: <span className="font-semibold">{role}</span>
                {!canEdit ? " (view only)" : ""}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300"
                      : "inline-flex items-center rounded-full border bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
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
                      ? "inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                      : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  }
                >
                  Received: <span className="ml-1 font-semibold">{receivedCount}</span>
                </span>

                <span
                  className={
                    dark
                      ? "inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                      : "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                  }
                >
                  Not received:
                  <span className="ml-1 font-semibold">{notReceivedCount}</span>
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
                  href="/store/new"
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

          <div className="mt-6">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className={
                  dark
                    ? "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    : "flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2"
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
                  aria-label="Search store items"
                />
              </div>

              <select
                name="status"
                defaultValue={status}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border bg-white px-3 py-2 text-sm"
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

              {(q || (status && status !== "ALL")) ? (
                <Link
                  href="/store"
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
        </div>

        <div
          className={
            dark
              ? "print-area mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
              : "print-area mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"
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
                  : "text-sm font-semibold text-gray-900"
              }
            >
              Store Items
            </div>
            <div
              className={
                dark
                  ? "text-xs text-slate-500"
                  : "text-xs text-gray-500"
              }
            >
              {items.length} shown
            </div>
          </div>

          <div className={dark ? "h-px bg-white/8" : "h-px bg-gray-100"} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className={
                  dark
                    ? "bg-[#101720] text-left text-slate-400"
                    : "bg-gray-50 text-left text-gray-600"
                }
              >
                <tr>
                  <th className="w-20 px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="w-28 px-5 py-3 font-medium">Qty</th>
                  <th className="w-56 px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y"}>
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
                      className={dark ? "align-top hover:bg-white/5" : "align-top hover:bg-gray-50"}
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
          Tip: Print/Export only what you searched/filtered — the table only.
        </p>
      </div>
    </div>
  );
}