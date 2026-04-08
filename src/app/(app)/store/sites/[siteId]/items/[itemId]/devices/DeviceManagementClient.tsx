"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Loader2, CheckCircle2 } from "lucide-react";

export default function DeviceManagementClient({ item, canEdit }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // --- Scan Logic ---
  useEffect(() => {
    if (scanningId) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );

      scanner.render(
        (decodedText) => {
          updateUnit(scanningId, { serialNumber: decodedText });
          setScanningId(null);
          scanner.clear();
        },
        () => { /* ignore silent errors */ }
      );

      return () => {
        scanner.clear().catch(e => console.error("Scanner clear error", e));
      };
    }
  }, [scanningId]);

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
        
        {/* Camera Overlay Modal */}
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={dark ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative" : "bg-white w-full max-w-md rounded-3xl p-6 relative"}>
              <button 
                onClick={() => setScanningId(null)}
                aria-label="Close Scanner"
                title="Close Scanner"
                className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100 rounded-full"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">Scan Barcode</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        {/* Header */}
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
          <p className="text-sm opacity-60 mt-2">Point your camera at the barcode or use your hardware scanner.</p>
        </div>

        {/* Device Grid */}
        <div className="grid gap-4">
          {item.instances.map((unit: any, index: number) => (
            <div 
              key={unit.id}
              className={dark 
                ? "bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" 
                : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              }
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={dark ? "h-10 w-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-black" : "h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black"}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Serial Number</div>
                  <div className="flex items-center gap-2">
                    <input 
                      defaultValue={unit.serialNumber.startsWith("PENDING") || unit.serialNumber.startsWith("IMPORT") || unit.serialNumber.startsWith("RESTOCK") ? "" : unit.serialNumber}
                      placeholder="Scan Barcode..."
                      title={`Serial number for unit ${index + 1}`}
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
                    
                    {loadingId === unit.id ? (
                      <Loader2 className="animate-spin opacity-50" size={18} />
                    ) : unit.serialNumber && !unit.serialNumber.startsWith("PENDING") && !unit.serialNumber.startsWith("IMPORT") ? (
                      <CheckCircle2 className="text-emerald-500" size={18} />
                    ) : (
                      <button
                        onClick={() => setScanningId(unit.id)}
                        aria-label={`Scan barcode for unit ${index + 1}`}
                        title="Scan with Camera"
                        className={dark ? "p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sky-400" : "p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sky-600"}
                      >
                        <QrCode size={18} />
                      </button>
                    )}
                  </div>
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