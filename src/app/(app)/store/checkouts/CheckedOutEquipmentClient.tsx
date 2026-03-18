"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";

type Row = {
  id: string;
  requesterName: string;
  requesterContact: string | null;
  purpose: string;
  authorizedBy: string;
  issuedAt: Date;
  expectedReturnDate: Date | null;
  inventoryItem: {
    name: string;
    serialNumber: string | null;
    stockNumber: string | null;
  };
  inventorySite: {
    id: string;
    name: string;
  };
};

export default function CheckedOutEquipmentClient({
  role,
  q,
  items,
  exportRows,
  exportCols,
}: {
  role: string;
  q: string;
  items: Row[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const printTitle = "Checked Out Equipment";

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
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ef4444,#f87171,#3b82f6)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c0392b,#ef4444,#1d5fa8)]"
            }
          />

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
                      ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ef4444]"
                      : "inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c0392b]"
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Checked Out Equipment
                </div>
              </div>
              <h1
                className={
                  dark
                    ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                Equipment Currently Out
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Track all equipment currently outside the warehouse across all sites.
              </p>

              <div
                className={
                  dark
                    ? "mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                    : "mt-5 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Role: {role}
              </div>
            </div>

            <PrintExportButton
              title={printTitle}
              rows={exportRows}
              columns={exportCols}
            />
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
                placeholder="Search site, item, requester..."
                className={
                  dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm outline-none"
                }
              />
              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#ef4444,#f87171)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#c0392b] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                }
              >
                Search
              </button>
              {q ? (
                <Link
                  href="/store/checkouts"
                  className={
                    dark
                      ? "text-sm font-medium text-slate-400 hover:underline"
                      : "text-sm font-medium text-[#6f6a62] hover:underline"
                  }
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </section>

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
            <div className="mt-1 text-xs text-gray-500">{items.length} shown</div>
          </div>
          <div className="print-only h-px bg-gray-200" />

          <div className="flex items-center justify-between px-5 py-4">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Checked Out Equipment
            </div>
            <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
              {items.length} shown
            </div>
          </div>

          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? "bg-[#101720] text-left text-slate-400" : "bg-[#f8f4ee] text-left text-[#5b564d]"}>
                <tr>
                  <th className="px-5 py-3 font-medium">No</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Requester</th>
                  <th className="px-5 py-3 font-medium">Authorized By</th>
                  <th className="px-5 py-3 font-medium">Issued At</th>
                  <th className="px-5 py-3 font-medium">Expected Return</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dark ? "px-5 py-10 text-center text-slate-500" : "px-5 py-10 text-center text-gray-600"}>
                      No equipment is currently checked out.
                    </td>
                  </tr>
                ) : (
                  items.map((row, index) => (
                    <tr key={row.id} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>{index + 1}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/store/sites/${row.inventorySite.id}/issues`}
                          className={dark ? "text-slate-100 hover:underline" : "text-[#1a1814] hover:underline"}
                        >
                          {row.inventorySite.name}
                        </Link>
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-100" : "px-5 py-3 text-[#1a1814]"}>
                        <div className="font-medium">{row.inventoryItem.name}</div>
                        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                          {row.inventoryItem.stockNumber ?? "-"}
                          {row.inventoryItem.serialNumber ? ` • ${row.inventoryItem.serialNumber}` : ""}
                        </div>
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        <div>{row.requesterName}</div>
                        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                          {row.requesterContact ?? "-"}
                        </div>
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>{row.authorizedBy}</td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>{new Date(row.issuedAt).toLocaleString()}</td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {row.expectedReturnDate ? new Date(row.expectedReturnDate).toLocaleString() : "-"}
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