"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

const ITEM_TYPES = [
  { value: "EQUIPMENT",              label: "Equipment" },
  { value: "ACCESSORIES",            label: "Accessories" },
  { value: "TOOLS_AND_PARTS",        label: "Tools & Parts" },
  { value: "GENERAL",                label: "General" },
  { value: "COOLING_INFRASTRUCTURE", label: "Cooling Infrastructure" },
  { value: "CABLES_AND_ELECTRONICS", label: "Cables & Electronics" },
];

type ItemType =
  | "EQUIPMENT" | "ACCESSORIES" | "TOOLS_AND_PARTS"
  | "GENERAL"   | "COOLING_INFRASTRUCTURE" | "CABLES_AND_ELECTRONICS";

export default function EditInventoryItemClient({
  site,
  item,
  action,
}: {
  site: { id: string; name: string; location: string | null };
  item: {
    id:              string;
    itemType:        ItemType;
    name:            string;
    description:     string | null;
    itemCode:        string | null;
    manufacturer:    string | null;
    model:           string | null;
    quantity:        number;
    uncountable:     boolean;
    unit:            string | null;
    reorderLevel:    number;
    targetStockLevel: number | null;
    status:          "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
    condition:       "NEW" | "UNUSED" | "USED" | "FAULTY";
  };
  action: (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");
  const [itemType, setItemType] = useState<ItemType>(item.itemType);

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
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
          } />

          <div className="flex flex-col gap-3">
            <Link href={`/store/sites/${site.id}`} className={dark
              ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
              : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
            }>
              ← Back to {site.name} Inventory
            </Link>
            <div className={dark
              ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
              : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
            }>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Edit Inventory Item
            </div>
          </div>

          <h1 className={dark
            ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
            : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
          }>
            Edit {item.name}
          </h1>

          {error && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{error}</div>
          )}

          <form action={action} className="mt-6 space-y-5">

            {/* Row 1 — Category + Name */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Item Category" dark={dark}>
                <select name="itemType" value={itemType}
                  onChange={(e) => setItemType(e.target.value as ItemType)}
                  title="Item Category" className={inputCls}
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Item Name" dark={dark}>
                <input name="name" defaultValue={item.name} required
                  title="Item Name" className={inputCls} />
              </Field>
            </div>

            {/* Description */}
            <Field label="Description" dark={dark}>
              <textarea name="description" rows={3}
                defaultValue={item.description ?? ""}
                placeholder="Optional description"
                title="Description" className={inputCls} />
            </Field>

            {/* Row 2 — Item Code + Manufacturer + Model */}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Item Code" dark={dark}>
                <input name="itemCode" defaultValue={item.itemCode ?? ""}
                  placeholder="e.g. KNET-EQUIP-001"
                  title="Item Code" className={inputCls} />
              </Field>
              <Field label="Manufacturer" dark={dark}>
                <input name="manufacturer" defaultValue={item.manufacturer ?? ""}
                  placeholder="optional" title="Manufacturer" className={inputCls} />
              </Field>
              <Field label="Model" dark={dark}>
                <input name="model" defaultValue={item.model ?? ""}
                  placeholder="optional" title="Model" className={inputCls} />
              </Field>
            </div>

            {/* Row 3 — Quantity + Unit */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Quantity" dark={dark}>
                <input name="quantity" type="number" min="0"
                  defaultValue={item.quantity} required
                  title="Quantity" className={inputCls} />
              </Field>
              <Field label="Unit" dark={dark}>
                <input name="unit" defaultValue={item.unit ?? ""}
                  placeholder="e.g. pcs, rolls" title="Unit" className={inputCls} />
              </Field>
            </div>

            {/* Row 4 — Reorder + Target + Status */}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Reorder Level" dark={dark}>
                <input name="reorderLevel" type="number" min="0"
                  defaultValue={item.reorderLevel}
                  title="Reorder Level" className={inputCls} />
              </Field>
              <Field label="Target Stock Level" dark={dark}>
                <input name="targetStockLevel" type="number" min="0"
                  defaultValue={item.targetStockLevel ?? ""}
                  placeholder="optional" title="Target Stock Level" className={inputCls} />
              </Field>
              <Field label="Status" dark={dark}>
                <select name="status" defaultValue={item.status}
                  title="Status" className={inputCls}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="LOW_STOCK">LOW STOCK</option>
                  <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  <option value="CHECKED_OUT">CHECKED OUT</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </Field>
            </div>

            {/* Condition */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Condition (applies to all units)" dark={dark}>
                <select name="condition" defaultValue={item.condition ?? "NEW"}
                  title="Condition" className={inputCls}>
                  <option value="NEW">NEW</option>
                  <option value="UNUSED">UNUSED</option>
                  <option value="USED">USED</option>
                  <option value="FAULTY">FAULTY</option>
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit" className={dark
                ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                : "rounded-xl bg-[#1a1814] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2d2924]"
              }>
                Save Changes
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

function Field({ label, children, dark }: {
  label: string; children: React.ReactNode; dark: boolean;
}) {
  return (
    <label className="block">
      <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>
        {label}
      </div>
      {children}
    </label>
  );
}
