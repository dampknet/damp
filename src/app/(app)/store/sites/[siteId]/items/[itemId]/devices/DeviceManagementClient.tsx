"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Loader2, CheckCircle2, PlusCircle, ArrowLeft } from "lucide-react";

export default function DeviceManagementClient({ item, canEdit }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  
  const [localUnits, setLocalUnits] = useState(item.instances);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    setLocalUnits(item.instances);
  }, [item.instances]);

  const isPlaceholder = (sn: string) => {
    return !sn || sn.startsWith("PENDING") || sn.startsWith("IMPORT") || sn.startsWith("RESTOCK");
  };

  const parseSmartScan = (text: string) => {
    const data: any = {};
    const snMatch = text.match(/(?:serial number|sn|s\/n|serial)[:\s]+([^\s,]+)/i);
    const modelMatch = text.match(/(?:model|mod)[:\s]+([^\s,]+)/i);
    const mfgMatch = text.match(/(?:manufacturer|mfg|make)[:\s]+([^\s,]+)/i);

    data.serialNumber = snMatch ? snMatch[1] : text.split(' ')[0];
    if (modelMatch) data.model = modelMatch[1];
    if (mfgMatch) data.manufacturer = mfgMatch[1];

    return data;
  };

  useEffect(() => {
    if (scanningId) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 15, qrbox: { width: 250, height: 150 } },
        false
      );

      const onScanSuccess = async (decodedText: string) => {
        const smartData = parseSmartScan(decodedText);
        await scanner.clear();
        if (scanningId === "NEW_SLOT") {
          await addNewInstance(smartData);
        } else {
          await updateUnit(scanningId, smartData);
        }
        setScanningId(null);
      };

      scanner.render(onScanSuccess, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [scanningId]);

  async function addNewInstance(data: any) {
    setIsAddingNew(true);
    try {
      const res = await fetch(`/store/instances/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, ...data }),
      });
      if (res.ok) router.refresh();
      else alert("Could not add new stock.");
    } catch (e) { alert("Network error."); }
    finally { setIsAddingNew(false); }
  }

  async function updateUnit(instanceId: string, updates: any) {
    setLoadingId(instanceId);
    try {
      const res = await fetch(`/store/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) router.refresh();
      else alert(data.message || "Save failed.");
    } catch (e) { alert("Network error."); }
    finally { setLoadingId(null); }
  }

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#fbf8f3]"}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        
        {/* SCANNER MODAL */}
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={dark ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative border border-white/10" : "bg-white w-full max-w-md rounded-3xl p-6 relative border border-slate-200"}>
              <button onClick={() => setScanningId(null)} title="Close Scanner" aria-label="Close Scanner" className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100"><X size={24} /></button>
              <h2 className="text-xl font-bold mb-4 text-center">Smart Asset Capture</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        {/* BREADCRUMB & HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href={`/store/sites/${item.inventorySiteId}`} className="inline-flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 hover:text-sky-500 transition-all mb-4">
              <ArrowLeft size={16} /> Back to Site Inventory
            </Link>
            <h1 className="text-4xl font-black tracking-tight">{item.name}</h1>
            <p className="mt-1 text-sm opacity-50 font-medium">Instance Management & Batch Processing</p>
          </div>
          <div className={dark ? "bg-white/5 border border-white/10 p-4 rounded-2xl text-right" : "bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-right"}>
             <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Total Stock Count</span>
             <span className="text-2xl font-black text-sky-500">{item.quantity} <span className="text-sm font-bold text-slate-500">{item.unit || "pcs"}</span></span>
          </div>
        </div>

        {/* THE TABLE FRAMEWORK */}
        <div className={dark ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5" : "overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl"}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={dark ? "bg-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400" : "bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600"}>
                <th className="px-6 py-4 w-16">No.</th>
                <th className="px-6 py-4">Asset Identification (Serial Number)</th>
                <th className="px-6 py-4 w-48">Condition</th>
                <th className="px-6 py-4 w-20 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={dark ? "divide-y divide-white/5" : "divide-y divide-slate-200"}>
              {localUnits.map((unit: any, index: number) => {
                const hasRealSerial = !isPlaceholder(unit.serialNumber);

                return (
                  <tr key={unit.id} className={dark ? "hover:bg-white/2 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                    {/* INDEX */}
                    <td className="px-6 py-4">
                      <span className={dark ? "text-slate-500 font-mono font-bold" : "text-slate-400 font-mono font-bold"}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>

                    {/* SERIAL INPUT SECTION */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input 
                            value={hasRealSerial ? unit.serialNumber : ""}
                            title={`Serial number for instance ${index + 1}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalUnits((prev: any) => prev.map((u: any) => (u.id === unit.id ? { ...u, serialNumber: val } : u)));
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== item.instances[index].serialNumber) {
                                updateUnit(unit.id, { serialNumber: e.target.value });
                              }
                            }}
                            placeholder="Awaiting Scan or Entry..."
                            className={dark 
                              ? "w-full bg-transparent border-b-2 border-white/10 focus:border-sky-500 outline-none font-mono text-base py-1 text-white placeholder:text-slate-700 transition-all" 
                              : "w-full bg-transparent border-b-2 border-slate-300 focus:border-sky-600 outline-none font-mono text-base py-1 text-slate-900 placeholder:text-slate-400 transition-all"}
                          />
                        </div>
                        
                        {loadingId === unit.id ? (
                          <Loader2 className="animate-spin text-sky-500" size={20} />
                        ) : hasRealSerial ? (
                          <CheckCircle2 className="text-emerald-500" size={20} />
                        ) : (
                          <button 
                            onClick={() => setScanningId(unit.id)} 
                            title="Open Camera Scanner"
                            aria-label={`Scan unit ${index + 1}`}
                            className={dark ? "p-2 rounded-lg bg-white/10 text-sky-400 hover:bg-sky-500 hover:text-white transition-all" : "p-2 rounded-lg bg-slate-100 text-sky-600 hover:bg-sky-600 hover:text-white transition-all"}
                          >
                            <QrCode size={18} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* CONDITION DROPDOWN */}
                    <td className="px-6 py-4">
                      <select 
                        value={unit.condition} 
                        title="Set physical condition"
                        aria-label={`Condition for unit ${index + 1}`}
                        onChange={(e) => updateUnit(unit.id, { condition: e.target.value })} 
                        className={dark 
                          ? "w-full bg-slate-800 border border-white/20 rounded-xl px-3 py-2 text-xs font-black text-white outline-none focus:ring-2 ring-sky-500/50" 
                          : "w-full bg-white border border-slate-400 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 ring-sky-600/20"}
                      >
                        <option value="NEW">NEW / SEALED</option>
                        <option value="GOOD">GOOD / WORKING</option>
                        <option value="FAULTY">FAULTY / TESTING</option>
                        <option value="DAMAGED">DAMAGED / SCRAP</option>
                      </select>
                    </td>

                    {/* STATUS INDICATOR */}
                    <td className="px-6 py-4 text-center">
                       <div className={`h-3 w-3 rounded-full mx-auto ${unit.status === 'AVAILABLE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`} title={unit.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* DYNAMIC ADDITION FOOTER */}
          <div className={dark ? "bg-white/3 p-4 border-t border-white/10" : "bg-slate-50 p-4 border-t border-slate-200"}>
             <button 
              onClick={() => setScanningId("NEW_SLOT")}
              disabled={isAddingNew}
              title="Add a new physical unit to this item"
              aria-label="Create new asset instance"
              className={dark
                ? "flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-white/10 rounded-xl font-black text-sm uppercase tracking-widest text-slate-400 hover:border-sky-500 hover:text-sky-500 transition-all"
                : "flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl font-black text-sm uppercase tracking-widest text-slate-500 hover:border-sky-600 hover:text-sky-600 transition-all"
              }
             >
               {isAddingNew ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
               {isAddingNew ? "Registering Asset..." : "Register Extra Stock (Scan to Add)"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}