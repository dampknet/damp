"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Loader2, CheckCircle2, PlusCircle } from "lucide-react";

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
              <h2 className="text-xl font-bold mb-4 text-center">Smart Scan Active</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href={`/store/sites/${item.inventorySiteId}`} className="text-sm opacity-50 hover:underline">← Back</Link>
            <h1 className="text-3xl font-black mt-2">{item.name}</h1>
          </div>
          <div className={dark ? "bg-white/10 px-4 py-2 rounded-2xl border border-white/10" : "bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm"}>
             <span className="text-xs font-bold uppercase opacity-50 block">Quantity</span>
             <span className="text-xl font-black">{item.quantity} {item.unit || "pcs"}</span>
          </div>
        </div>

        <div className="grid gap-4">
          {localUnits.map((unit: any, index: number) => {
            const hasRealSerial = !isPlaceholder(unit.serialNumber);

            return (
              <div key={unit.id} className={dark ? "bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={dark ? "h-10 w-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-black" : "h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black"}>{index + 1}</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase opacity-50">Serial Number</div>
                    <div className="flex items-center gap-2">
                      <input 
                        value={hasRealSerial ? unit.serialNumber : ""}
                        title={`Serial number for unit ${index + 1}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalUnits((prev: any) => prev.map((u: any) => (u.id === unit.id ? { ...u, serialNumber: val } : u)));
                        }}
                        onBlur={(e) => updateUnit(unit.id, { serialNumber: e.target.value })}
                        placeholder="Waiting for scan..."
                        className={dark 
                          ? "bg-transparent border-b border-white/20 outline-none font-mono text-lg w-full md:w-64 text-white placeholder:text-slate-500" 
                          : "bg-transparent border-b border-slate-400 outline-none font-mono text-lg w-full md:w-64 text-slate-900 placeholder:text-slate-400"}
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
                <select 
                  value={unit.condition} 
                  title="Select condition"
                  aria-label={`Condition for unit ${index + 1}`}
                  onChange={(e) => updateUnit(unit.id, { condition: e.target.value })} 
                  className={dark ? "bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white" : "bg-white border border-slate-400 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900"}
                >
                  <option value="NEW">NEW</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAULTY">FAULTY</option>
                  <option value="DAMAGED">DAMAGED</option>
                </select>
              </div>
            );
          })}

          <div className={dark ? "border-2 border-dashed border-white/20 rounded-2xl p-6 flex items-center justify-center bg-white/5 group" : "border-2 border-dashed border-slate-400 rounded-2xl p-6 flex items-center justify-center bg-slate-50 group"}>
             <button 
              onClick={() => setScanningId("NEW_SLOT")}
              disabled={isAddingNew}
              title="Add extra stock"
              aria-label="Add extra stock by scanning"
              className="flex items-center gap-3 text-sm font-bold opacity-80 group-hover:opacity-100"
             >
               {isAddingNew ? <Loader2 className="animate-spin" /> : <PlusCircle className="text-sky-500" />}
               Click or Scan here to add EXTRA STOCK
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}