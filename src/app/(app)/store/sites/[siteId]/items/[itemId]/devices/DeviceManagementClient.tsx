"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

export default function DeviceManagementClient({ item, canEdit, role }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateUnit(instanceId: string, updates: any) {
    setLoadingId(instanceId);
    try {
      const res = await fetch(`/api/store/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      alert("Failed to update device");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#fbf8f3]"}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <Link href={`/store/sites/${item.inventorySiteId}`} className="text-sm opacity-50 hover:underline">
            ← Back to {item.inventorySite?.name || "Inventory"}
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <h1 className="text-3xl font-black">{item.name}</h1>
            <span className={dark ? "bg-white/10 px-3 py-1 rounded-lg text-xs font-bold" : "bg-slate-200 px-3 py-1 rounded-lg text-xs font-bold"}>
              {item.quantity} {item.unit || "Units"}
            </span>
          </div>
          <p className="text-sm opacity-60 mt-2">Manage individual serial numbers and status for this item.</p>
        </div>

        <div className="grid gap-4">
          {item.instances.map((unit: any, index: number) => (
            <div 
              key={unit.id}
              className={dark 
                ? "bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" 
                : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              }
            >
              <div className="flex items-center gap-4">
                <div className={dark ? "h-10 w-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-black" : "h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black"}>
                  {index + 1}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Serial Number</div>
                  <input 
                    defaultValue={unit.serialNumber.startsWith("PENDING") || unit.serialNumber.startsWith("IMPORT") || unit.serialNumber.startsWith("RESTOCK") ? "" : unit.serialNumber}
                    placeholder="Scan Barcode..."
                    disabled={!canEdit || loadingId === unit.id}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== unit.serialNumber) {
                        updateUnit(unit.id, { serialNumber: e.target.value });
                      }
                    }}
                    className={dark 
                      ? "bg-transparent border-b border-white/10 focus:border-sky-500 outline-none font-mono text-lg w-full md:w-64" 
                      : "bg-transparent border-b border-slate-300 focus:border-sky-600 outline-none font-mono text-lg w-full md:w-64"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Condition</div>
                  <select 
                    title="Select Condition"
                    value={unit.condition}
                    disabled={!canEdit}
                    onChange={(e) => updateUnit(unit.id, { condition: e.target.value })}
                    className={dark ? "bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs" : "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"}
                  >
                    <option value="NEW">NEW</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAULTY">FAULTY</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="UNDER_REPAIR">UNDER REPAIR</option>
                    <option value="OLD">OLD</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Status</div>
                  <select 
                    title="Select Status"
                    value={unit.status}
                    disabled={!canEdit}
                    onChange={(e) => updateUnit(unit.id, { status: e.target.value })}
                    className={dark ? "bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs" : "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="CHECKED_OUT">CHECKED OUT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}