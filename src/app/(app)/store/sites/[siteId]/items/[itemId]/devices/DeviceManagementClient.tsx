"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Loader2, CheckCircle2, PlusCircle, ArrowLeft, Printer } from "lucide-react";

export default function DeviceManagementClient({ item, canEdit }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  
  const [localUnits, setLocalUnits] = useState(item.instances);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const hasPermission = canEdit === true;

  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    setLocalUnits(item.instances);
  }, [item.instances]);

  const isPlaceholder = (sn: string) => {
    return !sn || sn.startsWith("PENDING") || sn.startsWith("IMPORT") || sn.startsWith("RESTOCK");
  };

  /** ✅ SMART PARSER FIX
   * Correctly segregates <Rhode & Schwarz><2501.7406.06-101793-dZ>
   */
  const parseSmartScan = (text: string) => {
    const data: any = { serialNumber: "", model: "", manufacturer: "" };
    const cleanText = text.replace(/[\n\r]/g, "").trim();
    const brackets = cleanText.match(/<([^>]+)>/g);

    if (brackets && brackets.length >= 2) {
      data.manufacturer = brackets[0].replace(/[<>]/g, "").trim();
      const midPart = brackets[1].replace(/[<>]/g, "").trim();
      const parts = midPart.split("-");

      const serialIdx = parts.findIndex(p => /^\d+$/.test(p));
      if (serialIdx !== -1) {
        data.serialNumber = parts[serialIdx];
        data.model = parts.slice(0, serialIdx).join("-");
      } else {
        data.model = parts[0];
        data.serialNumber = parts[1] || midPart;
      }
    } else {
      const snMatch = cleanText.match(/(?:serial number|sn|s\/n|serial)[:\s]+([^\s,]+)/i);
      const modelMatch = cleanText.match(/(?:model|mod)[:\s]+([^\s,]+)/i);
      const mfgMatch = cleanText.match(/(?:manufacturer|mfg|make)[:\s]+([^\s,]+)/i);
      data.serialNumber = snMatch ? snMatch[1] : cleanText.split(' ')[0];
      if (modelMatch) data.model = modelMatch[1];
      if (mfgMatch) data.manufacturer = mfgMatch[1];
    }
    return data;
  };

  /** ✅ GLOBAL BARCODE LISTENER FIX 
   * Awaits update and handles state immediately
   */
  useEffect(() => {
    if (!hasPermission) return;
    const handleKeyDown = async (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 100) scanBuffer.current = "";
      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        if (scanBuffer.current.length > 5) {
          e.preventDefault();
          const smartData = parseSmartScan(scanBuffer.current);
          const emptySlot = localUnits.find((u: any) => isPlaceholder(u.serialNumber));
          
          if (emptySlot) {
            await updateUnit(emptySlot.id, smartData);
          } else {
            await addNewInstance(smartData);
          }
          scanBuffer.current = "";
        }
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [localUnits, hasPermission]);

  // CAMERA SCANNER
  useEffect(() => {
    if (scanningId && hasPermission) {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 15, qrbox: { width: 250, height: 150 } }, false);
      scanner.render(async (decodedText: string) => {
        const smartData = parseSmartScan(decodedText);
        await scanner.clear();
        if (scanningId === "NEW_SLOT") await addNewInstance(smartData);
        else await updateUnit(scanningId, smartData);
        setScanningId(null);
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [scanningId, hasPermission]);

  async function addNewInstance(data: any) {
    if (!hasPermission) return;
    setIsAddingNew(true);
    try {
      const res = await fetch(`/store/instances/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, ...data }),
      });
      if (res.ok) router.refresh();
    } catch (e) { alert("Error adding stock"); }
    finally { setIsAddingNew(false); }
  }

  async function updateUnit(instanceId: string, updates: any) {
    if (!hasPermission) return;
    setLoadingId(instanceId);
    
    // ✅ RULE: If Serial is erased, clear Model and Manufacturer too
    const payload = { ...updates };
    if (payload.serialNumber === "") {
      payload.serialNumber = `PENDING-${instanceId.slice(-5)}`;
      payload.model = "";
      payload.manufacturer = "";
    }

    try {
      const res = await fetch(`/store/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setLocalUnits((prev: any) => 
          prev.map((u: any) => (u.id === instanceId ? { ...u, ...payload } : u))
        );
        router.refresh();
      }
    } catch (e) { alert("Error updating unit"); }
    finally { setLoadingId(null); }
  }

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-white" : "min-h-screen bg-[#fbf8f3] text-slate-900"}>
      <style jsx global>{`
        @media print {
          .no-print, button, svg, .header-nav, select { display: none !important; }
          body { background: white !important; color: black !important; }
          .table-container { border: 1px solid #ccc !important; }
          th, td { border-bottom: 1px solid #eee !important; padding: 12px !important; }
          input { border: none !important; background: transparent !important; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className={dark ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative border border-white/10" : "bg-white w-full max-w-md rounded-3xl p-6 relative border border-slate-200"}>
              <button onClick={() => setScanningId(null)} title="Close Scanner" aria-label="Close Scanner" className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100"><X size={24} /></button>
              <h2 className="text-xl font-bold mb-4 text-center">Camera Smart Capture</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="header-nav">
            <Link href={`/store/sites/${item.inventorySiteId}`} className="inline-flex items-center gap-2 text-sm font-bold opacity-60 hover:text-sky-500 mb-4"><ArrowLeft size={16} /> Back</Link>
            <h1 className="text-4xl font-black tracking-tight">{item.name}</h1>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button onClick={() => window.print()} title="Print Labels" aria-label="Print Labels" className={dark ? "flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl font-bold text-sm" : "flex items-center gap-2 bg-white border border-slate-300 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm"}>
              <Printer size={18} /> Print List
            </button>
            <div className={dark ? "bg-white/5 border border-white/10 p-4 rounded-2xl" : "bg-white border border-slate-300 shadow-sm p-4 rounded-2xl"}>
               <span className="text-[10px] font-black uppercase opacity-40 block">Total Stock</span>
               <span className="text-2xl font-black text-sky-500">{item.quantity} {item.unit || "pcs"}</span>
            </div>
          </div>
        </div>

        <div className={`table-container ${dark ? "rounded-2xl border border-white/10 bg-white/5" : "rounded-2xl border border-slate-300 bg-white shadow-xl"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className={dark ? "bg-white/5 text-[11px] font-black uppercase text-slate-400" : "bg-slate-100 text-[11px] font-black uppercase text-slate-600"}>
                  <th className="px-6 py-4 w-12 text-center">No.</th>
                  <th className="px-6 py-4">Serial Number</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Manufacturer</th>
                  <th className="px-6 py-4 w-32 text-right">Condition</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/5" : "divide-y divide-slate-200"}>
                {localUnits.map((unit: any, index: number) => {
                  const hasRealSerial = !isPlaceholder(unit.serialNumber);
                  const inputClass = dark 
                    ? "w-full bg-transparent border-b border-white/10 focus:border-sky-500 outline-none font-mono text-sm py-1 text-white placeholder:text-slate-700" 
                    : "w-full bg-transparent border-b border-slate-400 focus:border-sky-600 outline-none font-mono text-sm py-1 text-slate-900 placeholder:text-slate-400";

                  return (
                    <tr key={unit.id} className={loadingId === unit.id ? "bg-sky-500/5 animate-pulse" : "hover:bg-sky-500/2"}>
                      <td className="px-6 py-5 text-center font-mono text-xs opacity-40">{index + 1}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <input value={hasRealSerial ? unit.serialNumber : ""} title={`Serial ${index + 1}`} aria-label={`Serial ${index + 1}`} disabled={!hasPermission} onChange={(e) => setLocalUnits((prev: any) => prev.map((u: any) => (u.id === unit.id ? { ...u, serialNumber: e.target.value } : u)))} onBlur={(e) => updateUnit(unit.id, { serialNumber: e.target.value })} placeholder="Scan Serial..." className={inputClass} />
                          {hasPermission && (loadingId === unit.id ? <Loader2 className="animate-spin text-sky-500" size={16} /> : hasRealSerial ? <CheckCircle2 className="text-emerald-500 no-print" size={16} /> : <button onClick={() => setScanningId(unit.id)} title="Camera Scan" aria-label="Camera Scan" className="text-sky-500 hover:scale-110 no-print"><QrCode size={18} /></button>)}
                        </div>
                      </td>
                      <td className="px-6 py-5"><input value={unit.model || ""} title={`Model ${index + 1}`} aria-label={`Model ${index + 1}`} disabled={!hasPermission} onChange={(e) => setLocalUnits((prev: any) => prev.map((u: any) => (u.id === unit.id ? { ...u, model: e.target.value } : u)))} onBlur={(e) => updateUnit(unit.id, { model: e.target.value })} placeholder="—" className={inputClass} /></td>
                      <td className="px-6 py-5"><input value={unit.manufacturer || ""} title={`Mfg ${index + 1}`} aria-label={`Mfg ${index + 1}`} disabled={!hasPermission} onChange={(e) => setLocalUnits((prev: any) => prev.map((u: any) => (u.id === unit.id ? { ...u, manufacturer: e.target.value } : u)))} onBlur={(e) => updateUnit(unit.id, { manufacturer: e.target.value })} placeholder="—" className={inputClass} /></td>
                      <td className="px-6 py-5 text-right">
                        <select value={unit.condition} title={`Condition ${index + 1}`} aria-label={`Condition ${index + 1}`} disabled={!hasPermission} onChange={(e) => updateUnit(unit.id, { condition: e.target.value })} className={`${dark ? "bg-slate-800 border-white/20 text-white" : "bg-white border-slate-400 text-slate-900"} no-print rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer`}>
                          <option value="NEW">NEW</option><option value="GOOD">GOOD</option><option value="FAULTY">FAULTY</option><option value="DAMAGED">DAMAGED</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasPermission && (
            <div className="p-4 bg-sky-500/2 no-print">
               <button onClick={() => setScanningId("NEW_SLOT")} disabled={isAddingNew} title="Camera Register" aria-label="Camera Register" className={dark ? "w-full py-4 border-2 border-dashed border-white/10 rounded-xl font-bold text-xs uppercase text-slate-400 hover:border-sky-500" : "w-full py-4 border-2 border-dashed border-slate-300 rounded-xl font-bold text-xs uppercase text-slate-500 hover:border-sky-600"}>
                 {isAddingNew ? <Loader2 className="animate-spin inline mr-2" /> : <PlusCircle className="inline mr-2" size={16} />} Register Extra Stock (Camera)
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}