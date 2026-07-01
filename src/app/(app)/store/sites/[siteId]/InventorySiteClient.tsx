"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import DeleteInventoryItemsDialog from "@/components/DeleteInventoryItemsDialog";

const ITEM_TYPE_LABEL: Record<string, string> = {
  EQUIPMENT:              "Equipment",
  ACCESSORIES:            "Accessories",
  TOOLS_AND_PARTS:        "Tools & Parts",
  GENERAL:                "General",
  COOLING_INFRASTRUCTURE: "Cooling",
  CABLES_AND_ELECTRONICS: "Cables & Electronics",
};

const ITEM_TYPE_COLOR_DARK: Record<string, string> = {
  EQUIPMENT:              "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACCESSORIES:            "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TOOLS_AND_PARTS:        "bg-amber-500/10 text-amber-400 border-amber-500/20",
  GENERAL:                "bg-slate-500/10 text-slate-400 border-slate-500/20",
  COOLING_INFRASTRUCTURE: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  CABLES_AND_ELECTRONICS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const ITEM_TYPE_COLOR_LIGHT: Record<string, string> = {
  EQUIPMENT:              "bg-blue-50 text-blue-700 border-blue-200",
  ACCESSORIES:            "bg-purple-50 text-purple-700 border-purple-200",
  TOOLS_AND_PARTS:        "bg-amber-50 text-amber-700 border-amber-200",
  GENERAL:                "bg-slate-50 text-slate-600 border-slate-200",
  COOLING_INFRASTRUCTURE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  CABLES_AND_ELECTRONICS: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CONDITIONS = ["NEW", "UNUSED", "USED", "FAULTY"] as const;

function conditionBadge(condition: string, dark: boolean) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold";
  if (condition === "NEW")    return `${base} ${dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`;
  if (condition === "UNUSED") return `${base} ${dark ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700"}`;
  if (condition === "USED")   return `${base} ${dark ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`;
  if (condition === "FAULTY") return `${base} ${dark ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`;
  return `${base} ${dark ? "border-slate-500/30 bg-slate-500/10 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`;
}

// Same header select style as SitesClient
function headerSelectCls(dark: boolean) {
  return dark
    ? "w-full rounded-md border border-white/10 bg-[#101720] px-2 py-1 text-[11px] font-semibold text-slate-300 outline-none transition hover:bg-white/5 focus:border-sky-400"
    : "w-full rounded-md border border-[#ddd5c9] bg-white px-2 py-1 text-[11px] font-semibold text-[#5b564d] outline-none transition hover:bg-[#f7f3ed] focus:border-[#1a1814]";
}

function SummaryCard({ dark, label, value, sub, accent }: {
  dark: boolean; label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className={dark
      ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
      : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)]"
    }>
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
        <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>{label}</div>
        <div className={dark ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100" : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"}>{value}</div>
        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>{sub}</div>
      </div>
    </div>
  );
}

export default function InventorySiteClient({ role, canEdit, site, summary, items }: any) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();

  // ── search ────────────────────────────────────────────────────────────────
  const [q, setQ] = useState("");

  // ── column header filters (same pattern as SitesClient) ──────────────────
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [statusFilter,    setStatusFilter]    = useState("");

  // ── selection + delete ────────────────────────────────────────────────────
  const [selectedItemIds,    setSelectedItemIds]    = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason,       setDeleteReason]       = useState("");
  const [isDeleting,         setIsDeleting]         = useState(false);

  // ── filtering ─────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const qLow = q.toLowerCase().trim();
    return items.filter((item: any) => {
      const matchesQ = !qLow || [
        item.name,
        item.description,
        item.itemCode,
        ITEM_TYPE_LABEL[item.itemType],
        item.itemType,
        item.manufacturer,
        item.model,
        item.unit,
        item.condition,
        ...(item.instances ?? []).map((inst: any) => inst.entityCode),
      ].some((val: string | null | undefined) => val?.toLowerCase().includes(qLow));

      const matchesCategory  = !categoryFilter  || item.itemType  === categoryFilter;
      const matchesCondition = !conditionFilter  || item.condition === conditionFilter;
      const matchesStatus    = !statusFilter     || item.status    === statusFilter;

      return matchesQ && matchesCategory && matchesCondition && matchesStatus;
    });
  }, [items, q, categoryFilter, conditionFilter, statusFilter]);

  const filteringActive = categoryFilter || conditionFilter || statusFilter || q.trim();

  const selectedItemsData = useMemo(() =>
    items
      .filter((item: any) => selectedItemIds.includes(item.id))
      .map((item: any) => ({ id: item.id, name: item.name })),
  [items, selectedItemIds]);

  const exportRows = filteredItems.map((item: any, index: number) => ({
    No:           index + 1,
    Item:         item.name,
    Description:  item.description ?? "",
    Category:     ITEM_TYPE_LABEL[item.itemType] ?? item.itemType,
    "Item Code":  item.itemCode ?? "",
    Manufacturer: item.manufacturer ?? "",
    Model:        item.model ?? "",
    Qty:          item.uncountable ? "N/A" : item.quantity,
    Unit:         item.unit ?? "",
    Condition:    item.condition ?? "NEW",
    Status:       item.status,
  }));

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/store/items/bulk-delete`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemIds: selectedItemIds, reason: deleteReason }),
      });
      if (res.ok) {
        setSelectedItemIds([]);
        setIsDeleteDialogOpen(false);
        setDeleteReason("");
        router.refresh();
      }
    } catch (e) { console.error(e); }
    finally     { setIsDeleting(false); }
  };

  const clearAllFilters = () => {
    setQ("");
    setCategoryFilter("");
    setConditionFilter("");
    setStatusFilter("");
  };

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {/* ── HEADER ── */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
          } />

          {/* title + action buttons */}
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/store" className={dark
                ? "mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                : "mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
              }>
                ← Back to Store Dashboard
              </Link>
              <h1 className={dark
                ? "text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
              }>
                {site.name} Inventory
              </h1>
              <p className={dark ? "mt-3 max-w-2xl text-sm font-medium text-slate-400" : "mt-3 max-w-2xl text-sm font-medium text-[#857f76]"}>
                {site.location || "No location set"} • Manage stock levels, condition, and asset tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <Link href={`/store/sites/${site.id}/issue`}
                    className={dark ? "rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-xl bg-[#c8611a] px-4 py-2 text-sm font-semibold text-white"}>
                    Issue Item
                  </Link>
                  <Link href={`/store/sites/${site.id}/restock`}
                    className={dark ? "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white"}>
                    Restock
                  </Link>
                  <Link href={`/store/sites/${site.id}/new`}
                    className={dark ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white"}>
                    Add Item
                  </Link>
                  <Link href={`/store/sites/${site.id}/upload`}
                    className={dark ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300" : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#5b564d]"}>
                    Upload
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard dark={dark} label="Total Items"   value={summary.totalItems}      sub="in inventory"    accent="bg-[#1d5fa8]" />
            <SummaryCard dark={dark} label="Equipment"     value={summary.equipmentCount}  sub="tracked units"   accent="bg-[#b08b2c]" />
            <SummaryCard dark={dark} label="Other Items"   value={summary.materialCount}   sub="accessories etc" accent="bg-[#2a7d52]" />
            <SummaryCard dark={dark} label="Low Stock"     value={summary.lowStockCount}   sub="needs attention" accent="bg-[#c8611a]" />
            <SummaryCard dark={dark} label="Checked Out"   value={summary.checkedOutCount} sub="in the field"    accent="bg-[#1d5fa8]" />
          </div>

          {/* ── SEARCH BAR ── */}
          <div className="relative mt-6 flex gap-3">
            <div className={dark
              ? "flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              : "flex flex-1 items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-3 py-2.5"
            }>
              <svg className={dark ? "h-4 w-4 shrink-0 text-slate-500" : "h-4 w-4 shrink-0 text-[#b0a79b]"}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, code, manufacturer, model, entity code…"
                title="Search inventory"
                className={dark
                  ? "w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  : "w-full bg-transparent text-sm text-[#1a1814] outline-none placeholder:text-[#b0a79b]"
                }
              />
              {q && (
                <button onClick={() => setQ("")}
                  className={dark ? "shrink-0 text-slate-500 hover:text-slate-300" : "shrink-0 text-[#b0a79b] hover:text-[#5b564d]"}>
                  ✕
                </button>
              )}
            </div>

            {/* active filter chips */}
            {filteringActive ? (
              <button onClick={clearAllFilters}
                className={dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
                  : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm font-semibold text-[#5b564d] hover:bg-[#f5f2ed]"
                }>
                Clear filters
              </button>
            ) : null}

            {canEdit && selectedItemIds.length > 0 && (
              <button onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Delete ({selectedItemIds.length})
              </button>
            )}

            <PrintExportButton title={site.name} rows={exportRows} columns={[
              { key: "No",          label: "No"          },
              { key: "Item",        label: "Item"        },
              { key: "Description", label: "Description" },
              { key: "Category",    label: "Category"    },
              { key: "Item Code",   label: "Item Code"   },
              { key: "Manufacturer",label: "Manufacturer"},
              { key: "Model",       label: "Model"       },
              { key: "Qty",         label: "Qty"         },
              { key: "Unit",        label: "Unit"        },
              { key: "Condition",   label: "Condition"   },
              { key: "Status",      label: "Status"      },
            ]} />
          </div>
        </section>

        {/* ── MAIN TABLE ── */}
        <div className={dark
          ? "mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-white/5 backdrop-blur-xl"
          : "mt-6 overflow-hidden rounded-[26px] border border-[#e0dbd2] bg-white shadow-sm"
        }>
          <div className={dark ? "h-1 w-full bg-[#1d5fa8] opacity-50" : "h-1 w-full bg-[#1d5fa8]"} />

          {/* table header row with count */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Inventory Items
            </div>
            <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
              {filteredItems.length} of {items.length} shown
            </div>
          </div>
          <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full table-auto text-[13px]">
              <thead className={dark
                ? "sticky top-0 z-20 bg-[#101720] text-left text-slate-400"
                : "sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d]"
              }>
                <tr className="font-semibold">

                  {/* Checkbox */}
                  <th className="w-12 px-4 py-3 text-center">
                    <input type="checkbox" title="Select All"
                      onChange={(e) =>
                        setSelectedItemIds(
                          e.target.checked ? filteredItems.map((i: any) => i.id) : []
                        )
                      }
                      checked={selectedItemIds.length === filteredItems.length && filteredItems.length > 0}
                    />
                  </th>

                  {/* No */}
                  <th className="w-10 px-2 py-3">No</th>

                  {/* Item name — plain label, search bar handles it */}
                  <th className="px-4 py-3">Item & Description</th>

                  {/* ── Category header with inline dropdown filter ── */}
                  <th className="px-4 py-3">
                    <span className="print-only">Category</span>
                    <div className="no-print">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        title="Filter by category"
                        className={headerSelectCls(dark)}
                      >
                        <option value="">Category ▼</option>
                        {Object.entries(ITEM_TYPE_LABEL).map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  </th>

                  {/* Item Code — plain label */}
                  <th className="px-4 py-3">Item Code</th>

                  {/* Quantity — plain label */}
                  <th className="px-4 py-3 text-center">Quantity</th>

                  {/* ── Condition header with inline dropdown filter ── */}
                  <th className="px-4 py-3 text-right">
                    <span className="print-only">Condition</span>
                    <div className="no-print flex justify-end">
                      <select
                        value={conditionFilter}
                        onChange={(e) => setConditionFilter(e.target.value)}
                        title="Filter by condition"
                        className={`${headerSelectCls(dark)} text-right`}
                      >
                        <option value="">Condition ▼</option>
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dark
                      ? "px-5 py-12 text-center text-slate-500"
                      : "px-5 py-12 text-center text-[#8b857c]"
                    }>
                      {filteringActive ? "No items match your filters." : "No items found."}
                    </td>
                  </tr>
                ) : filteredItems.map((item: any, index: number) => (
                  <tr key={item.id}
                    className={dark ? "cursor-pointer hover:bg-white/5" : "cursor-pointer hover:bg-[#fcfaf7]"}
                    onClick={() => router.push(`/store/sites/${site.id}/items/${item.id}/devices`)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center" onClick={(e) => toggleSelect(item.id, e)}>
                      <input type="checkbox" title="Select Item"
                        checked={selectedItemIds.includes(item.id)} readOnly />
                    </td>

                    {/* No */}
                    <td className={dark ? "px-2 py-3 font-medium text-slate-500" : "px-2 py-3 font-medium text-[#6b655d]"}>
                      {index + 1}
                    </td>

                    {/* Name + description + manufacturer/model */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/store/sites/${site.id}/items/${item.id}/edit`}
                        className={dark
                          ? "font-bold text-slate-100 hover:text-sky-400 hover:underline"
                          : "font-bold text-[#1a1814] hover:text-blue-700 hover:underline"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.name}
                      </Link>
                      {item.description && (
                        <div className={dark ? "mt-0.5 text-[11px] text-slate-400" : "mt-0.5 text-[11px] text-[#6b655d]"}>
                          {item.description}
                        </div>
                      )}
                      {(item.manufacturer || item.model) && (
                        <div className={dark ? "mt-0.5 text-[10px] text-slate-600" : "mt-0.5 text-[10px] text-[#9c9890]"}>
                          {[item.manufacturer, item.model].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>

                    {/* Category badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${dark ? (ITEM_TYPE_COLOR_DARK[item.itemType] ?? "") : (ITEM_TYPE_COLOR_LIGHT[item.itemType] ?? "")}`}>
                        {ITEM_TYPE_LABEL[item.itemType] ?? item.itemType}
                      </span>
                    </td>

                    {/* Item Code */}
                    <td className={dark ? "px-4 py-3 font-mono text-xs text-slate-400" : "px-4 py-3 font-mono text-xs text-[#5d584f]"}>
                      {item.itemCode || "—"}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-center">
                      {item.uncountable ? (
                        <span className={dark ? "text-xs italic text-slate-500" : "text-xs italic text-[#8b857c]"}>N/A</span>
                      ) : (
                        <>
                          <span className={dark ? "font-bold text-slate-200" : "font-bold text-[#1a1814]"}>{item.quantity}</span>
                          <span className={dark ? "ml-1 text-[10px] font-black uppercase text-slate-500" : "ml-1 text-[10px] font-black uppercase text-[#8b857c]"}>
                            {item.unit || "pcs"}
                          </span>
                        </>
                      )}
                    </td>

                    {/* Condition badge */}
                    <td className="px-4 py-3 text-right">
                      <span className={conditionBadge(item.condition, dark)}>
                        {item.condition || "NEW"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteInventoryItemsDialog
        open={isDeleteDialogOpen}
        dark={dark}
        items={selectedItemsData}
        deleting={isDeleting}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}