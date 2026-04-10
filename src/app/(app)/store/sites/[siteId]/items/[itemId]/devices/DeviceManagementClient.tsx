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
          let cleanSerial = decodedText.replace(/serial number:\s*/i, "").trim();
          updateUnit(scanningId, { serialNumber: cleanSerial });
          setScanningId(null);
          scanner.clear();
        },
        () => { /* silent errors */ }
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

  const isPlaceholder = (sn: string) => {
    return !sn || sn.startsWith("PENDING") || sn.startsWith("IMPORT") || sn.startsWith("RESTOCK");
  };

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#fbf8f3]"}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={dark ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative" : "bg-white w-full max-w-md rounded-3xl p-6 relative"}>
              <button 
                onClick={() => setScanningId(null)} 
                title="Close Scanner"
                aria-label="Close Scanner"
                className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100 rounded-full"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4 text-center">Scan QR / Barcode</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        <div className="mb-8">
          <Link href={`/store/sites/${item.inventorySiteId}`} className="text-sm opacity-50 hover:underline">
            ← Back to Inventory
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <h1 className="text-3xl font-black">{item.name}</h1>
          </div>
        </div>

        <div className="grid gap-4">
          {item.instances.map((unit: any, index: number) => {
            const hasRealSerial = !isPlaceholder(unit.serialNumber);

            return (
              <div key={unit.id} className={dark ? "bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={dark ? "h-10 w-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-black" : "h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black"}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Serial Number</div>
                    <div className="flex items-center gap-2">
                      <input 
                        defaultValue={hasRealSerial ? unit.serialNumber : ""}
                        placeholder="Scan Barcode..."
                        title={`Serial number for item ${index + 1}`}
                        disabled={!canEdit || loadingId === unit.id}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== unit.serialNumber) {
                            updateUnit(unit.id, { serialNumber: e.target.value });
                          }
                        }}
                        className={dark ? "bg-transparent border-b border-white/10 outline-none font-mono text-lg w-full md:w-64" : "bg-transparent border-b border-slate-300 outline-none font-mono text-lg w-full md:w-64"}
                      />
                      
                      {loadingId === unit.id ? (
                        <Loader2 className="animate-spin opacity-50" size={18} />
                      ) : hasRealSerial ? (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      ) : (
                        <button
                          onClick={() => setScanningId(unit.id)}
                          title="Scan with Camera"
                          aria-label={`Scan barcode for item ${index + 1}`}
                          className={dark ? "p-2 rounded-lg bg-white/5 text-sky-400" : "p-2 rounded-lg bg-slate-100 text-sky-600"}
                        >
                          <QrCode size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    value={unit.condition} 
                    title="Select Condition"
                    aria-label="Condition"
                    onChange={(e) => updateUnit(unit.id, { condition: e.target.value })} 
                    className={dark ? "bg-white/5 rounded-lg px-3 py-1.5 text-xs" : "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"}
                  >
                    <option value="NEW">NEW</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAULTY">FAULTY</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                  <select 
                    value={unit.status} 
                    title="Select Status"
                    aria-label="Status"
                    onChange={(e) => updateUnit(unit.id, { status: e.target.value })} 
                    className={dark ? "bg-white/5 rounded-lg px-3 py-1.5 text-xs" : "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="CHECKED_OUT">CHECKED OUT</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}