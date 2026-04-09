"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import DeleteInventoryItemsDialog from "@/components/DeleteInventoryItemsDialog";

// --- RESTORED ORIGINAL UI COMPONENTS ---

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
        <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>
          {label}
        </div>
        <div className={dark ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100" : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"}>
          {value}
        </div>
        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function conditionBadge(condition: string, dark: boolean) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold border";
  const val = condition || "GOOD";
  if (val === "NEW" || val === "GOOD") 
    return dark ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300` : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  if (val === "FAULTY" || val === "DAMAGED")
    return dark ? `${base} border-red-500/30 bg-red-500/10 text-red-300` : `${base} border-red-200 bg-red-50 text-red-700`;
  return dark ? `${base} border-orange-500/30 bg-orange-500/10 text-orange-300` : `${base} border-orange-200 bg-orange-50 text-orange-700`;
}

export default function InventorySiteClient({ role, canEdit, site, summary, items }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  
  const [q, setQ] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(q.toLowerCase()) || 
      (item.stockNumber?.toLowerCase().includes(q.toLowerCase()))
    );
  }, [items, q]);

  const selectedItemsData = useMemo(() => 
    items.filter((item: any) => selectedItemIds.includes(item.id))
    .map((item: any) => ({ id: item.id, name: item.name }))
  , [items, selectedItemIds]);

  const exportRows = filteredItems.map((item: any, index: number) => ({
    No: index + 1, Item: item.name, Type: item.itemType, "Stock No": item.stockNumber ?? "", Qty: item.quantity, Condition: item.condition ?? "GOOD"
  }));

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/store/items/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedItemIds, reason: deleteReason }),
      });
      if (res.ok) {
        setSelectedItemIds([]);
        setIsDeleteDialogOpen(false);
        setDeleteReason("");
        router.refresh();
      }
    } catch (e) { console.error(e); } finally { setIsDeleting(false); }
  };

  return (
    <div className={dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        
        {/* HEADER SECTION */}
        <section className={dark ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl" : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"}>
          <div className={dark ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]" : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"} />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/store" className={dark ? "mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline" : "mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"}>
                ← Back to Store Dashboard
              </Link>
              <h1 className={dark ? "text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl" : "text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"}>
                {site.name} Inventory
              </h1>
              <p className={dark ? "mt-3 max-w-2xl text-sm font-medium text-slate-400" : "mt-3 max-w-2xl text-sm font-medium text-[#857f76]"}>
                {site.location || "No location set"} • Manage stock levels, condition, and asset tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <Link href={`/store/sites/${site.id}/issue`} className={dark ? "rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-600/20" : "rounded-xl bg-[#c8611a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-600/10"}>Issue Item</Link>
                  <Link href={`/store/sites/${site.id}/restock`} className={dark ? "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20" : "rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white"}>Restock</Link>
                  <Link href={`/store/sites/${site.id}/new`} className={dark ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white"}>Add Item</Link>
                  <Link href={`/store/sites/${site.id}/upload`} className={dark ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300" : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#5b564d]"}>Upload</Link>
                </>
              )}
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard dark={dark} label="Total Items" value={summary.totalItems} sub="in inventory" accent="bg-[#1d5fa8]" />
            <SummaryCard dark={dark} label="Materials" value={summary.materialCount} sub="consumables" accent="bg-[#2a7d52]" />
            <SummaryCard dark={dark} label="Equipment" value={summary.equipmentCount} sub="tracked units" accent="bg-[#b08b2c]" />
            <SummaryCard dark={dark} label="Low Stock" value={summary.lowStockCount} sub="needs attention" accent="bg-[#c8611a]" />
            <SummaryCard dark={dark} label="Checked Out" value={summary.checkedOutCount} sub="in the field" accent="bg-[#1d5fa8]" />
          </div>

          {/* CONTROLS (SEARCH & DELETE) */}
          <div className="relative mt-6 flex gap-3">
             <div className={dark ? "flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2" : "flex-1 flex items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-3 py-2"}>
                <span className={dark ? "text-slate-600" : "text-[#b0a79b]"}>🔎</span>
                <input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                  placeholder="Search by name or stock number..." 
                  title="Search Inventory"
                  className="w-full bg-transparent text-sm outline-none" 
                />
              </div>
              {canEdit && selectedItemIds.length > 0 && (
                <button 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="rounded-xl bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                >
                  Delete Selected ({selectedItemIds.length})
                </button>
              )}
              <PrintExportButton title={site.name} rows={exportRows} columns={[]} />
          </div>
        </section>

        {/* MAIN TABLE */}
        <div className={dark ? "mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-white/5 backdrop-blur-xl" : "mt-6 overflow-hidden rounded-[26px] border border-[#e0dbd2] bg-white shadow-sm"}>
          <div className={dark ? "h-1 w-full bg-[#1d5fa8] opacity-50" : "h-1 w-full bg-[#1d5fa8]"} />
          
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full table-auto text-[13px]">
              <thead className={dark ? "sticky top-0 z-20 bg-[#101720] text-left text-slate-400" : "sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d]"}>
                <tr className="font-semibold">
                  <th className="w-12 px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      title="Select All"
                      onChange={(e) => setSelectedItemIds(e.target.checked ? filteredItems.map((i: any) => i.id) : [])}
                      checked={selectedItemIds.length === filteredItems.length && filteredItems.length > 0}
                    />
                  </th>
                  <th className="w-12 px-2 py-3">No</th>
                  <th className="px-4 py-3 text-left">Item & Description</th>
                  <th className="px-4 py-3 text-left">Stock Number</th>
                  <th className="px-4 py-3 text-center">Quantity</th>
                  <th className="px-4 py-3 text-right">Condition</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {filteredItems.map((item: any, index: number) => (
                  <tr 
                    key={item.id} 
                    className={dark ? "hover:bg-white/5 group cursor-pointer" : "hover:bg-[#fcfaf7] group cursor-pointer"}
                    onClick={() => router.push(`/store/sites/${site.id}/items/${item.id}/devices`)}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => toggleSelect(item.id, e)}>
                      <input type="checkbox" title="Select Item" checked={selectedItemIds.includes(item.id)} readOnly />
                    </td>
                    <td className={dark ? "px-2 py-3 font-medium text-slate-500" : "px-2 py-3 font-medium text-[#6b655d]"}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/store/sites/${site.id}/items/${item.id}/edit`}
                        className={dark ? "font-bold text-slate-100 hover:text-sky-400 hover:underline" : "font-bold text-[#1a1814] hover:text-blue-700 hover:underline"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.name}
                      </Link>
                      {/* ✅ Logic: Description darker, only shows if it exists */}
                      {item.description && (
                        <div className={dark ? "text-[11px] text-slate-300 mt-1" : "text-[11px] text-[#423f3a] mt-1"}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className={dark ? "px-4 py-3 font-mono text-xs text-slate-400" : "px-4 py-3 font-mono text-xs text-[#5d584f]"}>
                      {item.stockNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={dark ? "font-bold text-slate-200" : "font-bold text-[#1a1814]"}>{item.quantity}</span>
                      {/* ✅ Logic: Unit text darker */}
                      <span className={dark ? "ml-1 text-[10px] font-black text-slate-400 uppercase" : "ml-1 text-[10px] font-black text-[#5d584f] uppercase"}>
                        {item.unit || "pcs"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={conditionBadge(item.condition, dark)}>
                        {item.condition || "GOOD"}
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