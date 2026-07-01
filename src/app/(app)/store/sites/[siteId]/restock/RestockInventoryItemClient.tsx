"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

const ITEM_TYPE_LABEL: Record<string, string> = {
  EQUIPMENT:              "Equipment",
  ACCESSORIES:            "Accessories",
  TOOLS_AND_PARTS:        "Tools & Parts",
  GENERAL:                "General",
  COOLING_INFRASTRUCTURE: "Cooling",
  CABLES_AND_ELECTRONICS: "Cables & Electronics",
};

type ItemRow = {
  id:               string;
  name:             string;
  itemType:         string;
  itemCode:         string | null;
  quantity:         number;
  uncountable:      boolean;
  unit:             string | null;
  reorderLevel:     number;
  targetStockLevel: number | null;
  status:           string;
  entityCodePreview: string;
};

export default function RestockInventoryItemClient({
  site,
  items,
  action,
}: {
  site:   { id: string; name: string; location: string | null };
  items:  ItemRow[];
  action: (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");
  const [selectedId, setSelectedId] = useState("");

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  const nowValue = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  const restockNeeded = selected?.targetStockLevel != null
    ? Math.max(0, selected.targetStockLevel - selected.quantity)
    : null;

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#3b82f6)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981,#1d5fa8)]"
          } />

          <div className="flex flex-col gap-3">
            <Link href={`/store/sites/${site.id}`} className={dark
              ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
              : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
            }>
              ← Back to {site.name} Inventory
            </Link>
            <div className={dark
              ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#10b981]"
              : "inline-flex w-fit items-center gap-2 rounded-full border border-[#dcecdf] bg-[#f7fcf8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2a7d52]"
            }>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Restock Item
            </div>
          </div>

          <h1 className={dark
            ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
            : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
          }>
            Restock Inventory Item
          </h1>
          <p className={dark ? "mt-3 text-sm text-slate-400" : "mt-3 text-sm text-[#857f76]"}>
            Record received stock, update quantity, and keep a restock history for {site.name}.
          </p>

          {error && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{error}</div>
          )}

          <form action={action} className="mt-6 space-y-6">

            {/* ── Item selection ── */}
            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Item Details
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Select Item" dark={dark}>
                  <select
                    name="inventoryItemId"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    title="Select item" required className={inputCls}
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.itemCode ? ` · ${item.itemCode}` : ""}
                        {" — "}
                        {ITEM_TYPE_LABEL[item.itemType] ?? item.itemType}
                        {" — Qty: "}
                        {item.uncountable ? "N/A" : item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity to Add" dark={dark}>
                  <input
                    name="quantityAdded" type="number" min="1"
                    placeholder="Enter quantity" required title="Quantity Added"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Selected item info box */}
              {selected && (
                <div className={dark
                  ? "mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 space-y-1"
                  : "mt-4 rounded-xl border border-[#ebe3d8] bg-[#fcfaf7] p-4 text-sm text-[#5b564d] space-y-1"
                }>
                  <div><span className="font-semibold">Category:</span> {ITEM_TYPE_LABEL[selected.itemType] ?? selected.itemType}</div>
                  <div><span className="font-semibold">Item Code:</span> <span className="font-mono">{selected.itemCode ?? "—"}</span></div>
                  <div>
                    <span className="font-semibold">Current Qty:</span>{" "}
                    {selected.uncountable ? "N/A" : `${selected.quantity}${selected.unit ? ` ${selected.unit}` : ""}`}
                  </div>
                  <div><span className="font-semibold">Reorder Level:</span> {selected.reorderLevel}</div>
                  {selected.targetStockLevel != null && (
                    <div><span className="font-semibold">Target Level:</span> {selected.targetStockLevel}</div>
                  )}
                  <div><span className="font-semibold">Status:</span> {selected.status}</div>
                  {selected.entityCodePreview !== "-" && (
                    <div><span className="font-semibold">Entity Codes (sample):</span> <span className="font-mono text-xs">{selected.entityCodePreview}</span></div>
                  )}
                  {restockNeeded != null && (
                    <div className="font-semibold text-amber-500">
                      Suggested Restock: {restockNeeded}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Restock record ── */}
            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Restock Record
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Date Bought (optional)" dark={dark}>
                  <input name="dateBought" type="datetime-local" title="Date Bought" className={inputCls} />
                </Field>
                <Field label="Date Received" dark={dark}>
                  <input name="dateReceived" type="datetime-local" defaultValue={nowValue}
                    required title="Date Received" className={inputCls} />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Supplier (optional)" dark={dark}>
                  <input name="supplier" placeholder="Supplier name" title="Supplier" className={inputCls} />
                </Field>
                <Field label="Received By (optional)" dark={dark}>
                  <input name="receivedBy" placeholder="Receiver name" title="Received By" className={inputCls} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Note (optional)" dark={dark}>
                  <textarea name="note" rows={3} placeholder="Add restock notes..."
                    title="Note" className={inputCls} />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit" className={dark
                ? "rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                : "rounded-xl bg-[#2a7d52] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              }>
                Save Restock
              </button>
              <Link href={`/store/sites/${site.id}`} className={dark
                ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
                : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2]"
              }>
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children, dark }: { label: string; children: React.ReactNode; dark: boolean }) {
  return (
    <label className="block">
      <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>
        {label}
      </div>
      {children}
    </label>
  );
}
