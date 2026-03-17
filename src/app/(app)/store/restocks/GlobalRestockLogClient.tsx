"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";

type RestockRow = {
  id: string;
  quantityAdded: number;
  dateBought: Date | null;
  dateReceived: Date;
  supplier: string | null;
  receivedBy: string | null;
  note: string | null;
  inventoryItem: {
    name: string;
    itemType: "MATERIAL" | "EQUIPMENT";
    stockNumber: string | null;
    serialNumber: string | null;
    unit: string | null;
  };
  inventorySite: {
    id: string;
    name: string;
  };
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
        <div
          className={
            dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"
          }
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

export default function GlobalRestockLogClient({
  role,
  canEdit,
  q,
  totalRestocks,
  totalQuantityAdded,
  restocks,
  exportRows,
  exportCols,
}: {
  role: string;
  canEdit: boolean;
  q: string;
  totalRestocks: number;
  totalQuantityAdded: number;
  restocks: RestockRow[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const printTitle = "Global Restock Log";

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
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#3b82f6)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981,#1d5fa8)]"
            }
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
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
                    ? "mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#10b981]"
                    : "mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#dcecdf] bg-[#f7fcf8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2a7d52]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Global Restock Log
              </div>

              <h1
                className={
                  dark
                    ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                All Restock Records
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                View all restock activity across all inventory sites in one place.
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

            <PrintExportButton
              title={printTitle}
              rows={exportRows}
              columns={exportCols}
            />
          </div>

          {success ? (
            <div
              className={
                dark
                  ? "mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                  : "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              }
            >
              {success}
            </div>
          ) : null}

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
                placeholder="Search site, item, supplier, receiver..."
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
                    ? "rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                }
              >
                Search
              </button>
              {q ? (
                <Link
                  href="/store/restocks"
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SummaryCard
            dark={dark}
            label="Restock Records"
            value={String(totalRestocks)}
            sub="all logged restocks"
            accent={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
          />
          <SummaryCard
            dark={dark}
            label="Visible Quantity Added"
            value={String(totalQuantityAdded)}
            sub="sum of current search result"
            accent={dark ? "bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" : "bg-[#1d5fa8]"}
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
            <div className="mt-1 text-xs text-gray-500">{restocks.length} shown</div>
          </div>
          <div className="print-only h-px bg-gray-200" />

          <div className="flex items-center justify-between px-5 py-4">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Restock Records
            </div>
            <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
              {restocks.length} shown
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
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Qty Added</th>
                  <th className="px-5 py-3 font-medium">Date Received</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Received By</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {restocks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={
                        dark
                          ? "px-5 py-10 text-center text-slate-500"
                          : "px-5 py-10 text-center text-gray-600"
                      }
                    >
                      No restock records found.
                    </td>
                  </tr>
                ) : (
                  restocks.map((row, index) => (
                    <tr
                      key={row.id}
                      className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}
                    >
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {index + 1}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/store/sites/${row.inventorySite.id}`}
                          className={dark ? "text-slate-100 hover:underline" : "text-[#1a1814] hover:underline"}
                        >
                          {row.inventorySite.name}
                        </Link>
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-100" : "px-5 py-3 text-[#1a1814]"}>
                        <div className="font-medium">{row.inventoryItem.name}</div>
                        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                          {row.inventoryItem.stockNumber ?? "-"}
                        </div>
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {row.inventoryItem.itemType}
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {row.quantityAdded}
                        {row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {new Date(row.dateReceived).toLocaleString()}
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {row.supplier ?? "-"}
                      </td>
                      <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                        {row.receivedBy ?? "-"}
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