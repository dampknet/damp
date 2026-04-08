"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import DeleteInventoryItemsDialog from "@/components/DeleteInventoryItemsDialog";

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
  status: string;
};

function SummaryCard({ dark, label, value, sub, accent }: { dark: boolean; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-4" : "rounded-2xl border border-[#e6ddd1] bg-white p-4 shadow-sm"}>
      <div className={`h-1 w-8 mb-3 rounded-full ${accent}`} />
      <div className={dark ? "text-[10px] font-bold uppercase text-slate-500" : "text-[10px] font-bold uppercase text-[#9c9890]"}>{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60">{sub}</div>
    </div>
  );
}

function statusBadge(status: string, dark: boolean) {
  const base = "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border";
  if (status === "AVAILABLE") return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-500`;
  if (status === "LOW_STOCK") return `${base} border-orange-500/20 bg-orange-500/10 text-orange-500`;
  if (status === "OUT_OF_STOCK") return `${base} border-red-500/20 bg-red-500/10 text-red-500`;
  return `${base} border-slate-500/20 bg-slate-500/10 text-slate-500`;
}

export default function InventorySiteClient({ role, canEdit, site, summary, items }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(q.toLowerCase()) || 
      (item.stockNumber?.toLowerCase().includes(q.toLowerCase()))
    );
  }, [items, q]);

  const exportRows = filteredItems.map((item: any, index: number) => ({
    No: index + 1, Item: item.name, Type: item.itemType, "Stock No": item.stockNumber ?? "", Qty: item.quantity, Status: item.status
  }));

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#fbf8f3]"}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <Link href="/store" className="text-sm text-slate-500 hover:underline">← Store Dashboard</Link>
            <h1 className="text-4xl font-black mt-2 tracking-tight">{site.name}</h1>
            <p className="text-sm opacity-60 mt-1">{site.location || "No location set"}</p>
          </div>
          <div className="flex gap-2">
            {canEdit && <Link href={`/store/sites/${site.id}/new`} className="bg-sky-600 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-sky-600/20">+ New Item</Link>}
            <PrintExportButton title={site.name} rows={exportRows} columns={[]} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-8">
          <SummaryCard dark={dark} label="Total Items" value={summary.totalItems} sub="Records" accent="bg-sky-500" />
          <SummaryCard dark={dark} label="Materials" value={summary.materialCount} sub="Consumables" accent="bg-emerald-500" />
          <SummaryCard dark={dark} label="Equipment" value={summary.equipmentCount} sub="Units" accent="bg-amber-500" />
          <SummaryCard dark={dark} label="Low Stock" value={summary.lowStockCount} sub="Alerts" accent="bg-red-500" />
          <SummaryCard dark={dark} label="Checked Out" value={summary.checkedOutCount} sub="In Field" accent="bg-indigo-500" />
        </div>

        {/* Table Controls */}
        <div className="flex gap-4 mb-6">
          <input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search items..." 
            className={dark ? "flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-sky-500" : "flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500"} 
          />
        </div>

        {/* The Main Table */}
        <div className={dark ? "rounded-3xl border border-white/10 bg-white/5 overflow-hidden" : "rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm"}>
          <table className="w-full text-left text-sm">
            <thead className={dark ? "bg-white/5" : "bg-slate-50 text-slate-500"}>
              <tr className="text-[11px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Item & Description</th>
                <th className="px-6 py-4">Stock Number</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-500/10">
              {filteredItems.map((item: any, index: number) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-sky-500/5 cursor-pointer group transition-colors"
                  onClick={() => router.push(`/store/sites/${site.id}/items/${item.id}/devices`)}
                >
                  <td className="px-6 py-5 opacity-40">{index + 1}</td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-base group-hover:text-sky-500 transition-colors">{item.name}</div>
                    <div className="text-xs opacity-50 truncate max-w-xs">{item.description || "No description"}</div>
                  </td>
                  <td className="px-6 py-5 font-mono text-xs font-bold text-slate-500">{item.stockNumber || "—"}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="font-black text-sky-500">{item.quantity}</div>
                    <div className="text-[10px] opacity-40 uppercase">{item.unit || "units"}</div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className={statusBadge(item.status, dark)}>{item.status}</span>
                    <div className="text-[9px] mt-1 font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">View Devices →</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}