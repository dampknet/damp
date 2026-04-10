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
  
  const [localUnits, setLocalUnits] = useState(item.instances);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);

  useEffect(() => {
    setLocalUnits(item.instances);
  }, [item.instances]);

  const isPlaceholder = (sn: string) => {
    return !sn || sn.startsWith("PENDING") || sn.startsWith("IMPORT") || sn.startsWith("RESTOCK");
  };

  useEffect(() => {
    if (scanningId) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 15, qrbox: { width: 250, height: 150 } },
        false
      );

      const onScanSuccess = async (decodedText: string) => {
        let cleanSerial = "";
        let extraData: any = {};

        // CHECK: Handle JSON data or plain text with prefix
        try {
          const parsed = JSON.parse(decodedText);
          cleanSerial = parsed.serialNumber || parsed.sn || decodedText;
          extraData.manufacturer = parsed.manufacturer || parsed.make;
          extraData.model = parsed.model;
        } catch (e) {
          // Logic: Strip "serial number: " if it exists in the raw text
          cleanSerial = decodedText.replace(/serial number:\s*/i, "").trim();
        }
        
        await scanner.clear(); 
        setScanningId(null);

        // Logic: Send cleaned serial and hidden manufacturer/model info
        await updateUnit(scanningId, { 
          serialNumber: cleanSerial,
          ...extraData 
        });
      };

      scanner.render(onScanSuccess, () => {});

      return () => {
        scanner.clear().catch(e => console.error("Scanner clear error", e));
      };
    }
  }, [scanningId]);

  async function updateUnit(instanceId: string, updates: any) {
    setLoadingId(instanceId);
    
    // Optimistic UI Update
    if (updates.serialNumber) {
      setLocalUnits((prev: any) =>
        prev.map((u: any) => (u.id === instanceId ? { ...u, serialNumber: updates.serialNumber } : u))
      );
    }

    try {
      const res = await fetch(`/store/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (res.ok) {
        router.refresh();
      } else {
        // Logic: Show why it failed (e.g. Duplicate Serial)
        alert(data.message || "Server failed to save. Please try again.");
        router.refresh(); 
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#fbf8f3]"}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={dark ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative border border-white/10" : "bg-white w-full max-w-md rounded-3xl p-6 relative border border-slate-200"}>
              <button 
                onClick={() => setScanningId(null)} 
                title="Close Scanner"
                aria-label="Close Scanner"
                className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4 text-center">Scanning...</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        <div className="mb-8">
          <Link href={`/store/sites/${item.inventorySiteId}`} className="text-sm opacity-50 hover:underline">← Back</Link>
          <h1 className="text-3xl font-black mt-2">{item.name}</h1>
        </div>

        <div className="grid gap-4">
          {localUnits.map((unit: any, index: number) => {
            const hasRealSerial = !isPlaceholder(unit.serialNumber);

            return (
              <div key={unit.id} className={dark ? "bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={dark ? "h-10 w-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-black" : "h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black"}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase opacity-50">Serial Number</div>
                    <div className="flex items-center gap-2">
                      <input 
                        value={hasRealSerial ? unit.serialNumber : ""}
                        title={`Serial number for item ${index + 1}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalUnits((prev: any) =>
                            prev.map((u: any) => (u.id === unit.id ? { ...u, serialNumber: val } : u))
                          );
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== item.instances[index].serialNumber) {
                            updateUnit(unit.id, { serialNumber: e.target.value });
                          }
                        }}
                        placeholder="Waiting for scan..."
                        disabled={!canEdit || loadingId === unit.id}
                        className={dark ? "bg-transparent border-b border-white/10 outline-none font-mono text-lg w-full md:w-64 text-slate-100" : "bg-transparent border-b border-slate-300 outline-none font-mono text-lg w-full md:w-64 text-[#1a1814]"}
                      />
                      
                      {loadingId === unit.id ? (
                        <Loader2 className="animate-spin opacity-50" size={18} />
                      ) : hasRealSerial ? (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      ) : (
                        <button
                          onClick={() => setScanningId(unit.id)}
                          title="Scan with Camera"
                          aria-label={`Scan barcode for unit ${index + 1}`}
                          className={dark ? "p-2 rounded-lg bg-white/5 text-sky-400" : "p-2 rounded-lg bg-slate-100 text-sky-600"}
                        >
                          <QrCode size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <select 
                    value={unit.condition} 
                    title="Select condition"
                    aria-label={`Condition for unit ${index + 1}`}
                    onChange={(e) => updateUnit(unit.id, { condition: e.target.value })} 
                    className={dark ? "bg-white/5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200" : "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#5b564d]"}
                  >
                    <option value="NEW">NEW</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAULTY">FAULTY</option>
                    <option value="DAMAGED">DAMAGED</option>
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