"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Loader2, CheckCircle2, PlusCircle, ArrowLeft, Printer, Trash2 } from "lucide-react";

export default function DeviceManagementClient({ item, canEdit }: any) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();
  
  const [localUnits, setLocalUnits] = useState(item.instances);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const hasPermission = canEdit === true;
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    setLocalUnits(item.instances);
  }, [item.instances]);

  const isPlaceholder = (sn: string) => {
    return !sn || sn.startsWith("PENDING") || sn.startsWith("IMPORT") || sn.startsWith("RESTOCK");
  };

  // ─────────────────────────────────────────────────────────────────
  // SMART UNIVERSAL BARCODE / QR-CODE PARSER
  //
  // Handles the following formats (in priority order):
  //
  // 1. ROHDE & SCHWARZ angle-bracket format
  //    <Manufacturer><Model-SerialNumber-suffix><-><Description><...>
  //    e.g. <Rhode & Schwarz><2501.7406.06-101793-dZ><-><UHF AMPLIFIER><...>
  //
  // 2. KEY:VALUE label text (any order, any separator)
  //    e.g. "Serial Number: 2434567 Model: 333332 Manufacturer: Rhode and Schwarz"
  //    Also handles multi-line versions from physical label scanners.
  //
  // 3. GS1 Application Identifier format
  //    e.g. (21)SN12345(240)ModelABC(10)BatchXYZ
  //    AI 21 = serial number, AI 240/8012 = model, AI 710-714 = brand
  //
  // 4. Victron Energy serial number format
  //    HQYYWWxxxxx  e.g. HQ2237ABCDE  → serial only, manufacturer = Victron Energy
  //
  // 5. CSV / tab-delimited   (serial,model,manufacturer  or  serial\tmodel\tmfg)
  //
  // 6. JSON object           {"serialNumber":"X","model":"Y","manufacturer":"Z"}
  //
  // 7. URL query-string      ?sn=X&model=Y&mfg=Z  or  ?serial=X&...
  //
  // 8. Pipe / semicolon delimited with positional fields
  //    serial|model|manufacturer   or   serial;model;manufacturer
  //
  // 9. Plain serial number (fallback — just a bare alphanumeric string)
  // ─────────────────────────────────────────────────────────────────
  const parseSmartScan = (text: string): { serialNumber: string; model: string; manufacturer: string } => {
    const result = { serialNumber: "", model: "", manufacturer: "" };

    // Normalise line endings and trim
    const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    // Collapse runs of whitespace (but keep newlines so multi-line KV still works)
    const clean = raw.replace(/[ \t]+/g, " ");

    // ── 1. ROHDE & SCHWARZ angle-bracket format ──────────────────────────────
    // Pattern: one or more <...> fields
    // Field[0] = manufacturer, Field[1] = "Model-Serial[-variant]", remaining = description etc.
    const angleFields = [...clean.matchAll(/<([^>]*)>/g)].map(m => m[1].trim());
    if (angleFields.length >= 2) {
      result.manufacturer = angleFields[0];

      // Field[1] looks like "2501.7406.06-101793-dZ"
      // Convention: last purely-numeric-or-alphanumeric segment after a dash that
      // looks like a serial (6+ chars, contains digits) is the serial.
      // Everything before it is the model / part number.
      const field1 = angleFields[1];
      const parts = field1.split("-");

      if (parts.length === 1) {
        // No dash — treat whole thing as serial number
        result.serialNumber = field1;
      } else {
        // Walk from the right to find the serial-number segment.
        // Serial: alphanumeric, 4+ chars, must contain at least one digit.
        let serialIdx = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          if (/[0-9]/.test(p) && p.length >= 4 && /^[A-Za-z0-9]+$/.test(p)) {
            serialIdx = i;
            break;
          }
        }
        if (serialIdx > 0) {
          result.serialNumber = parts[serialIdx];
          result.model = parts.slice(0, serialIdx).join("-");
        } else if (serialIdx === 0) {
          result.serialNumber = parts[0];
          result.model = parts.slice(1).join("-");
        } else {
          // Fallback: last segment = serial, rest = model
          result.serialNumber = parts[parts.length - 1];
          result.model = parts.slice(0, -1).join("-");
        }
      }

      // Optional: Field[3] may be a human-readable description — append to model
      // if model is blank and description doesn't look like a date/weight/dimension
      if (!result.model && angleFields.length > 3) {
        const desc = angleFields[3];
        if (!/^\d{2}-\d{2}-\d{4}$/.test(desc) && !/\d+KG/i.test(desc) && desc !== "-") {
          result.model = desc;
        }
      }

      return result;
    }

    // ── 2. JSON object ────────────────────────────────────────────────────────
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const obj = JSON.parse(clean);
        const sn = obj.serialNumber ?? obj.serial_number ?? obj.sn ?? obj.serial ?? obj.SN ?? "";
        const mdl = obj.model ?? obj.Model ?? obj.partNumber ?? obj.part_number ?? obj.pn ?? "";
        const mfg = obj.manufacturer ?? obj.Manufacturer ?? obj.brand ?? obj.Brand ?? obj.make ?? "";
        result.serialNumber = String(sn);
        result.model = String(mdl);
        result.manufacturer = String(mfg);
        if (result.serialNumber) return result;
      } catch (_) { /* not valid JSON */ }
    }

    // ── 3. URL query-string ───────────────────────────────────────────────────
    // e.g. https://example.com/asset?sn=ABC123&model=X200&mfg=Victron
    // or just  ?sn=ABC123&model=X200
    const qsMatch = clean.match(/[?&]([^#]+)/);
    if (qsMatch) {
      try {
        const params = new URLSearchParams(qsMatch[1]);
        const sn =
          params.get("sn") ?? params.get("serialNumber") ?? params.get("serial") ??
          params.get("serial_number") ?? params.get("SN") ?? "";
        const mdl =
          params.get("model") ?? params.get("Model") ?? params.get("partNumber") ??
          params.get("part") ?? "";
        const mfg =
          params.get("manufacturer") ?? params.get("mfg") ?? params.get("brand") ??
          params.get("make") ?? "";
        if (sn) {
          result.serialNumber = sn;
          result.model = mdl;
          result.manufacturer = mfg;
          return result;
        }
      } catch (_) { /* ignore */ }
    }

    // ── 4. GS1 Application Identifier format ─────────────────────────────────
    // Parenthesised AIs: (21)SN  (240)Model  (710)-(714)Manufacturer
    const gs1ParenRx = /\((\d{2,4})\)([^(]+)/g;
    const gs1Paren: Record<string, string> = {};
    let gs1Match;
    while ((gs1Match = gs1ParenRx.exec(clean)) !== null) {
      gs1Paren[gs1Match[1]] = gs1Match[2].trim();
    }
    if (Object.keys(gs1Paren).length > 0) {
      result.serialNumber = gs1Paren["21"] ?? gs1Paren["251"] ?? "";
      result.model        = gs1Paren["240"] ?? gs1Paren["8012"] ?? gs1Paren["01"] ?? "";
      result.manufacturer = gs1Paren["710"] ?? gs1Paren["711"] ?? gs1Paren["712"] ??
                            gs1Paren["713"] ?? gs1Paren["714"] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 5. KEY : VALUE text (case-insensitive, flexible separators) ───────────
    // Supports both single-line and multi-line label text.
    // Keys: serial number / sn / s/n / serial | model / mod / part | manufacturer / mfg / make / brand
    const kvText = clean.replace(/\n/g, " ");

    const snKv  = kvText.match(/(?:serial\s*(?:number|no\.?|#)?|s\/n|sn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mdlKv = kvText.match(/(?:model\s*(?:no\.?|number|#)?|mod|part\s*(?:no\.?|number)?|pn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mfgKv = kvText.match(/(?:manufacturer|mfg|make|brand|vendor)\s*[:\-=]\s*([^\n,;|]+)/i);

    if (snKv) {
      result.serialNumber = snKv[1].trim();
      if (mdlKv) result.model = mdlKv[1].trim();
      if (mfgKv) result.manufacturer = mfgKv[1].trim().replace(/\s+/g, " ");
      return result;
    }

    // ── 6. Victron Energy serial number ──────────────────────────────────────
    // Format: HQ + 2-digit year + 2-digit week + alphanumeric suffix
    // e.g. HQ2237ABCDE   HQ1846XYZAB
    if (/^HQ\d{4}[A-Z0-9]{4,}$/i.test(raw)) {
      result.serialNumber = raw;
      result.manufacturer = "Victron Energy";
      return result;
    }

    // ── 7. Pipe-delimited  serial|model|manufacturer ─────────────────────────
    if (clean.includes("|")) {
      const parts = clean.split("|").map(s => s.trim());
      if (parts.length >= 1) result.serialNumber  = parts[0];
      if (parts.length >= 2) result.model         = parts[1];
      if (parts.length >= 3) result.manufacturer  = parts[2];
      if (result.serialNumber) return result;
    }

    // ── 8. Semicolon-delimited  serial;model;manufacturer ────────────────────
    if (clean.includes(";")) {
      const parts = clean.split(";").map(s => s.trim());
      if (parts.length >= 1) result.serialNumber  = parts[0];
      if (parts.length >= 2) result.model         = parts[1];
      if (parts.length >= 3) result.manufacturer  = parts[2];
      if (result.serialNumber) return result;
    }

    // ── 9. Tab-delimited  serial\tmodel\tmanufacturer ─────────────────────────
    if (raw.includes("\t")) {
      const parts = raw.split("\t").map(s => s.trim());
      if (parts.length >= 1) result.serialNumber  = parts[0];
      if (parts.length >= 2) result.model         = parts[1];
      if (parts.length >= 3) result.manufacturer  = parts[2];
      if (result.serialNumber) return result;
    }

    // ── 10. CSV  serial,model,manufacturer ────────────────────────────────────
    // Only treat as CSV if there are exactly 2 or 3 comma-separated tokens
    // (avoids splitting a plain description sentence)
    const csvParts = clean.split(",").map(s => s.trim());
    if (csvParts.length >= 2 && csvParts.length <= 4 && csvParts[0].length <= 60) {
      result.serialNumber = csvParts[0];
      if (csvParts.length >= 2) result.model        = csvParts[1];
      if (csvParts.length >= 3) result.manufacturer = csvParts[2];
      if (result.serialNumber) return result;
    }

    // ── 11. PLAIN SERIAL NUMBER FALLBACK ─────────────────────────────────────
    // At this point treat the whole trimmed string as a serial number,
    // but only if it looks like one (alphanumeric, no long spaces / sentences).
    const plainCandidate = raw.replace(/\s+/g, "");
    if (plainCandidate.length > 0 && plainCandidate.length <= 60 && /^[A-Za-z0-9\-_.\/]+$/.test(plainCandidate)) {
      result.serialNumber = plainCandidate;
      return result;
    }

    // ── 12. Last-resort: take the first "word" that looks like a serial ───────
    const wordMatch = clean.match(/\b([A-Z0-9][A-Z0-9\-]{4,})\b/i);
    if (wordMatch) {
      result.serialNumber = wordMatch[1];
    }

    return result;
  };

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
          if (emptySlot) await updateUnit(emptySlot.id, smartData);
          else await addNewInstance(smartData);
          scanBuffer.current = "";
        }
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [localUnits, hasPermission]);

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
      else {
        const err = await res.json();
        alert(err.message || "Duplicate Serial detected in another record.");
      }
    } catch (e) { alert("Network error adding stock"); }
    finally { setIsAddingNew(false); }
  }

  async function updateUnit(instanceId: string, updates: any) {
    if (!hasPermission) return;
    setLoadingId(instanceId);
    const payload = { ...updates };
    // ✅ RULE: If Serial is erased, clear everything
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
        setLocalUnits((prev: any) => prev.map((u: any) => (u.id === instanceId ? { ...u, ...payload } : u)));
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.message || "This serial number is already assigned to another item.");
        router.refresh();
      }
    } catch (e) { alert("Error updating unit"); }
    finally { setLoadingId(null); }
  }

  // ✅ BULK DELETE LOGIC
  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} units? This will decrease total quantity.`)) return;
    try {
      const res = await fetch(`/store/instances/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, itemId: item.id }),
      });
      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      }
    } catch (e) { alert("Delete failed."); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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
            {selectedIds.length > 0 && (
              <button onClick={deleteSelected} className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                <Trash2 size={16}/> Delete ({selectedIds.length})
              </button>
            )}
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
                  const isSelected = selectedIds.includes(unit.id);
                  const inputClass = dark 
                    ? "w-full bg-transparent border-b border-white/10 focus:border-sky-500 outline-none font-mono text-sm py-1 text-white placeholder:text-slate-700" 
                    : "w-full bg-transparent border-b border-slate-400 focus:border-sky-600 outline-none font-mono text-sm py-1 text-slate-900 placeholder:text-slate-400";

                  return (
                    <tr key={unit.id} className={`${isSelected ? 'bg-sky-500/10' : ''} ${loadingId === unit.id ? "bg-sky-500/5 animate-pulse" : "hover:bg-sky-500/2"} transition-colors`}>
                      <td className="px-6 py-5 text-center font-mono text-xs cursor-pointer" onClick={() => toggleSelect(unit.id)}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center border ${isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-500/30 text-slate-500'}`}>
                          {isSelected ? index + 1 : index + 1}
                        </div>
                      </td>
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