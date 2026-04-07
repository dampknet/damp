"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import DeleteInventoryItemsDialog from "@/components/DeleteInventoryItemsDialog";

// Types for individual unit tracking
type AssetInstance = {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  status: string;
  condition: string;
};

type InventoryItemRow = {
  id: string;
  name: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  description: string | null;
  stockNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unit: string | null;
  reorderLevel: number;
  targetStockLevel: number | null;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  instances: AssetInstance[]; // New deep tracking field
};

type Summary = {
  totalItems: number;
  materialCount: number;
  equipmentCount: number;
  lowStockCount: number;
  checkedOutCount: number;
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

function Chip({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <span className={dark ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300" : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"}>
      {label}:{" "}
      <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
        {value}
      </span>
    </span>
  );
}

function statusBadge(status: string, dark: boolean) {
  const base = "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold";
  if (status === "AVAILABLE") return dark ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300` : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  if (status === "LOW_STOCK") return dark ? `${base} border-amber-500/30 bg-amber-500/10 text-amber-300` : `${base} border-amber-200 bg-amber-50 text-amber-700`;
  if (status === "OUT_OF_STOCK") return dark ? `${base} border-red-500/30 bg-red-500/10 text-red-300` : `${base} border-red-200 bg-red-50 text-red-700`;
  if (status === "CHECKED_OUT") return dark ? `${base} border-sky-500/30 bg-sky-500/10 text-sky-300` : `${base} border-sky-200 bg-sky-50 text-sky-700`;
  return dark ? `${base} border-white/10 bg-white/5 text-slate-300` : `${base} border-[#ddd5c9] bg-[#f5f2ed] text-[#5b564d]`;
}

export default function InventorySiteClient({
  role,
  canEdit,
  site,
  summary,
  items,
}: {
  role: string;
  canEdit: boolean;
  site: { id: string; name: string; location: string | null; description: string | null };
  summary: Summary;
  items: InventoryItemRow[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState<"ALL" | "MATERIAL" | "EQUIPMENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<any>("ALL");
  const [q, setQ] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const search = q.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "ALL" && item.itemType !== typeFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = [item.name, item.description, item.stockNumber, item.manufacturer, item.model].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [items, q, typeFilter, statusFilter]);

  const selectedItems = filteredItems.filter((item) => selectedItemIds.includes(item.id));
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedItemIds.includes(item.id));

  const exportRows = filteredItems.map((item, index) => ({
    No: index + 1,
    Item: item.name,
    Type: item.itemType,
    "Stock No": item.stockNumber ?? "",
    Quantity: `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`,
    Status: item.status,
  }));

  const exportCols = [
    { key: "No", label: "No" }, { key: "Item", label: "Item" }, { key: "Type", label: "Type" },
    { key: "Stock No", label: "Stock No" }, { key: "Quantity", label: "Quantity" }, { key: "Status", label: "Status" },
  ];

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]);
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !filteredItems.some((item) => item.id === id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...filteredItems.map((item) => item.id)])));
    }
  }

  async function handleDeleteSelected() {
    if (selectedItems.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(selectedItems.map((item) => fetch("/store/api/inventory-item-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, reason: deleteReason.trim() || null }),
      })));
      setSelectedItemIds([]);
      setShowDeleteDialog(false);
      router.refresh();
    } catch { alert("Failed to delete items"); } finally { setDeleting(false); }
  }

  return (
    <>
      <DeleteInventoryItemsDialog
        open={showDeleteDialog}
        dark={dark}
        items={selectedItems.map((item) => ({ id: item.id, name: item.name, stockNumber: item.stockNumber, itemType: item.itemType }))}
        deleting={deleting}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onClose={() => { if (!deleting) setShowDeleteDialog(false); }}
        onConfirm={handleDeleteSelected}
      />

      <div className={dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <section className={dark ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl" : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-sm"}>
            <div className={dark ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]" : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"} />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Link href="/store" className={dark ? "inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline mb-3" : "inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline mb-3"}>← Back to Store</Link>
                <h1 className={dark ? "text-3xl font-semibold text-slate-100" : "text-3xl font-semibold text-[#1a1814]"}>{site.name} Inventory</h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Chip dark={dark} label="Site" value={site.name} />
                  <Chip dark={dark} label="Role" value={role} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && <Link href={`/store/sites/${site.id}/new`} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500">+ Add Item</Link>}
                <PrintExportButton title={`${site.name} Inventory`} rows={exportRows} columns={exportCols} />
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard dark={dark} label="Total Items" value={String(summary.totalItems)} sub="tracked records" accent="bg-sky-500" />
            <SummaryCard dark={dark} label="Materials" value={String(summary.materialCount)} sub="consumables" accent="bg-emerald-500" />
            <SummaryCard dark={dark} label="Equipment" value={String(summary.equipmentCount)} sub="units" accent="bg-amber-500" />
            <SummaryCard dark={dark} label="Low Stock" value={String(summary.lowStockCount)} sub="needs restock" accent="bg-orange-500" />
            <SummaryCard dark={dark} label="Checked Out" value={String(summary.checkedOutCount)} sub="unavailable" accent="bg-red-500" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 no-print">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, serial, model..." className={dark ? "flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none" : "flex-1 rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm outline-none"} title="Search inventory" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={dark ? "rounded-xl border border-white/10 bg-[#101720] px-4 py-2 text-sm" : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm"} title="Filter by type">
              <option value="ALL">All Types</option>
              <option value="MATERIAL">Material</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={dark ? "rounded-xl border border-white/10 bg-[#101720] px-4 py-2 text-sm" : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm"} title="Filter by status">
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>

          <div className={dark ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5" : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white"}>
            <table className="w-full text-left text-sm">
              <thead className={dark ? "bg-white/5 text-slate-400" : "bg-gray-50 text-[#5b564d]"}>
                <tr>
                  <th className="w-16 px-5 py-4 font-medium">No</th>
                  <th className="w-10 px-2 py-4 no-print">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} title="Select all visible items" aria-label="Select all visible items" />
                  </th>
                  <th className="px-5 py-4 font-bold uppercase text-[11px] tracking-wider">Item</th>
                  <th className="px-5 py-4 font-bold uppercase text-[11px] tracking-wider">Type</th>
                  <th className="px-5 py-4 font-bold uppercase text-[11px] tracking-wider text-center">In Stock</th>
                  <th className="px-5 py-4 font-bold uppercase text-[11px] tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {filteredItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr className={`group cursor-pointer transition-colors ${expandedId === item.id ? (dark ? 'bg-sky-500/10' : 'bg-sky-50') : (dark ? 'hover:bg-white/5' : 'hover:bg-[#fcfaf7]')}`} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <td className="px-5 py-4 font-medium opacity-50">{index + 1}</td>
                      <td className="px-2 py-4 no-print" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleItemSelection(item.id)} title={`Select ${item.name}`} aria-label={`Select ${item.name}`} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-base">{item.name}</div>
                        {item.stockNumber && <div className="text-[10px] opacity-60 font-mono">SN: {item.stockNumber}</div>}
                      </td>
                      <td className="px-5 py-4 text-[10px] font-black uppercase opacity-40">{item.itemType}</td>
                      <td className="px-5 py-4 text-center font-bold text-sky-500">{item.quantity} {item.unit || "pcs"}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={statusBadge(item.status, dark)}>{item.status}</span>
                        <div className="text-[9px] mt-1 font-bold text-sky-600 uppercase group-hover:underline">{expandedId === item.id ? "▲ Close" : "▼ Details"}</div>
                      </td>
                    </tr>

                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={6} className={dark ? "bg-black/40 px-10 py-6" : "bg-[#f9f7f4] px-10 py-6"}>
                          <div className="flex flex-col gap-4 border-l-4 border-sky-500 pl-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black uppercase tracking-widest text-sky-600">Unit Serial Tracking ({item.instances?.length || 0})</h3>
                              <Link href={`/store/sites/${site.id}/items/${item.id}/edit`} className="text-[10px] font-bold text-slate-500 hover:text-sky-500 bg-white dark:bg-white/5 border px-2 py-1 rounded">Edit Metadata</Link>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0d1117] shadow-xl">
                              <table className="w-full text-xs">
                                <thead className={dark ? "bg-white/5" : "bg-gray-100"}>
                                  <tr className="text-left font-black opacity-60"><th className="px-4 py-3">No</th><th className="px-4 py-3">Serial Number</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                  {item.instances && item.instances.length > 0 ? item.instances.map((ins, insIdx) => (
                                    <tr key={ins.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                      <td className="px-4 py-3 opacity-40">{insIdx + 1}</td>
                                      <td className="px-4 py-3 font-mono font-bold text-sky-500">{ins.serialNumber}</td>
                                      <td className="px-4 py-3 font-bold text-orange-500">{ins.condition}</td>
                                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ins.status === 'AVAILABLE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>{ins.status}</span></td>
                                    </tr>
                                  )) : <tr><td colSpan={4} className="py-8 text-center italic opacity-40">No individual serials found. Use "Restock" to add units.</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}