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

  const [localUnits, setLocalUnits]   = useState(item.instances);
  const [loadingId, setLoadingId]     = useState<string | null>(null);
  const [scanningId, setScanningId]   = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const hasPermission  = canEdit === true;
  const scanBuffer     = useRef("");
  const lastKeyTime    = useRef(0);

  useEffect(() => { setLocalUnits(item.instances); }, [item.instances]);

  // ─── Is this a placeholder entity code? ────────────────────────────────────
  const isPlaceholder = (code: string) =>
    !code ||
    code.startsWith("PENDING") ||
    code.startsWith("IMPORT") ||
    code.startsWith("RESTOCK");

  // ─── ENTITY CODE SCANNER PARSER ────────────────────────────────────────────
  // Our barcodes encode entity codes like KNET-EQUIP-004-01.
  // When scanning, we ignore the site prefix (e.g. "KNET-") so that
  // "EQUIP-004-01" or "equip-004-01" both match KNET-EQUIP-004-01.
  // We also do a full case-insensitive match as fallback.
  const parseScannedCode = (text: string): string => {
    return text
      .replace(/\r\n/g, "")
      .replace(/\r/g, "")
      .replace(/\n/g, "")
      .trim();
  };

  // Strips the site prefix from an entity code for fuzzy matching
  // e.g. "KNET-EQUIP-004-01" → "EQUIP-004-01"
  const stripSitePrefix = (code: string): string => {
    // Entity codes look like PREFIX-TYPE-NNN-NN
    // The site prefix is everything before the first type segment
    // Type segments: EQUIP, ACCESS, TO/PA, GEN, COOL, CA/EL
    const typeSegments = ["EQUIP", "ACCESS", "TO/PA", "GEN", "COOL", "CA/EL"];
    const upper = code.toUpperCase();
    for (const seg of typeSegments) {
      const idx = upper.indexOf(seg);
      if (idx > 0) return code.slice(idx); // drop everything before the type
    }
    return code;
  };

  // Match a scanned string against a database entityCode
  const matchesEntityCode = (scanned: string, dbCode: string): boolean => {
    const s = scanned.trim().toLowerCase();
    const d = dbCode.trim().toLowerCase();

    if (!s || !d) return false;

    // Exact match
    if (s === d) return true;

    // Strip site prefix from both and compare
    const sStripped = stripSitePrefix(s);
    const dStripped = stripSitePrefix(d);
    if (sStripped === dStripped) return true;

    // Scanned value is a suffix of the db code (e.g. "EQUIP-004-01" matches "KNET-EQUIP-004-01")
    if (d.endsWith(s) || d.includes(`-${s}`)) return true;

    // DB code is a suffix of what was scanned
    if (s.endsWith(d) || s.includes(`-${d}`)) return true;

    return false;
  };

  // ─── KEYBOARD (Syble gun) SCAN HANDLER ─────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime.current > 150) scanBuffer.current = "";
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        const raw = scanBuffer.current.trim();
        scanBuffer.current = "";

        if (raw.length > 2) {
          e.preventDefault();
          const code = parseScannedCode(raw);

          // Find matching unit in localUnits
          const match = localUnits.find((u: any) => matchesEntityCode(code, u.entityCode));

          if (match && isPlaceholder(match.entityCode)) {
            // Fill empty slot
            await updateUnit(match.id, { entityCode: code });
          } else if (!match) {
            // No match — add as new
            await addNewInstance({ entityCode: code });
          } else {
            alert(`Entity code already registered: ${match.entityCode}`);
          }
        }
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [localUnits, hasPermission]);

  // ─── CAMERA SCAN HANDLER ───────────────────────────────────────────────────
  useEffect(() => {
    if (scanningId && hasPermission) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 15, qrbox: { width: 250, height: 150 } },
        false
      );
      scanner.render(async (decodedText: string) => {
        const code = parseScannedCode(decodedText);
        await scanner.clear();
        if (scanningId === "NEW_SLOT") await addNewInstance({ entityCode: code });
        else await updateUnit(scanningId, { entityCode: code });
        setScanningId(null);
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [scanningId, hasPermission]);

  // ─── ADD NEW INSTANCE ───────────────────────────────────────────────────────
  async function addNewInstance(data: any) {
    if (!hasPermission) return;
    setIsAddingNew(true);
    try {
      const res = await fetch(`/store/instances/new`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemId: item.id, ...data }),
      });
      if (res.ok) router.refresh();
      else {
        const err = await res.json();
        alert(err.message || "Duplicate entity code detected.");
      }
    } catch { alert("Network error adding stock"); }
    finally   { setIsAddingNew(false); }
  }

  // ─── UPDATE UNIT ────────────────────────────────────────────────────────────
  async function updateUnit(instanceId: string, updates: any) {
    if (!hasPermission) return;
    setLoadingId(instanceId);

    const payload = { ...updates };

    // If entity code cleared, reset to placeholder
    if (payload.entityCode === "") {
      payload.entityCode = `PENDING-${instanceId.slice(-5)}`;
      payload.serialNumber = "";
      payload.model = "";
    }

    try {
      const res = await fetch(`/store/instances/${instanceId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        setLocalUnits((prev: any) =>
          prev.map((u: any) => u.id === instanceId ? { ...u, ...payload } : u)
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.message || "This entity code is already assigned to another item.");
        router.refresh();
      }
    } catch { alert("Error updating unit"); }
    finally   { setLoadingId(null); }
  }

  // ─── BULK DELETE ────────────────────────────────────────────────────────────
  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} units? This will decrease total quantity.`)) return;
    try {
      const res = await fetch(`/store/instances/bulk-delete`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: selectedIds, itemId: item.id }),
      });
      if (res.ok) { setSelectedIds([]); router.refresh(); }
    } catch { alert("Delete failed."); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const inputClass = dark
    ? "w-full bg-transparent border-b border-white/10 focus:border-sky-500 outline-none font-mono text-sm py-1 text-white placeholder:text-slate-700"
    : "w-full bg-transparent border-b border-slate-400 focus:border-sky-600 outline-none font-mono text-sm py-1 text-slate-900 placeholder:text-slate-400";

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

        {/* Camera modal */}
        {scanningId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className={dark
              ? "bg-slate-900 w-full max-w-md rounded-3xl p-6 relative border border-white/10"
              : "bg-white w-full max-w-md rounded-3xl p-6 relative border border-slate-200"
            }>
              <button
                onClick={() => setScanningId(null)}
                title="Close Scanner"
                aria-label="Close Scanner"
                className="absolute right-4 top-4 p-2 opacity-50 hover:opacity-100"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4 text-center">Camera Scan</h2>
              <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-500/30" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="header-nav">
            <Link
              href={`/store/sites/${item.inventorySiteId}`}
              className="inline-flex items-center gap-2 text-sm font-bold opacity-60 hover:text-sky-500 mb-4"
            >
              <ArrowLeft size={16} /> Back
            </Link>
            <h1 className="text-4xl font-black tracking-tight">{item.name}</h1>
            {item.itemCode && (
              <div className="mt-1 font-mono text-sm opacity-50">{item.itemCode}</div>
            )}
          </div>

          <div className="flex items-center gap-3 no-print">
            {selectedIds.length > 0 && (
              <button
                onClick={deleteSelected}
                className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => window.print()}
              title="Print Labels"
              aria-label="Print Labels"
              className={dark
                ? "flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl font-bold text-sm"
                : "flex items-center gap-2 bg-white border border-slate-300 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm"
              }
            >
              <Printer size={18} /> Print List
            </button>
            <div className={dark
              ? "bg-white/5 border border-white/10 p-4 rounded-2xl"
              : "bg-white border border-slate-300 shadow-sm p-4 rounded-2xl"
            }>
              <span className="text-[10px] font-black uppercase opacity-40 block">Total Units</span>
              <span className="text-2xl font-black text-sky-500">
                {item.uncountable ? "N/A" : `${item.quantity} ${item.unit || "pcs"}`}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`table-container ${dark
          ? "rounded-2xl border border-white/10 bg-white/5"
          : "rounded-2xl border border-slate-300 bg-white shadow-xl"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={dark
                  ? "bg-white/5 text-[11px] font-black uppercase text-slate-400"
                  : "bg-slate-100 text-[11px] font-black uppercase text-slate-600"
                }>
                  <th className="px-6 py-4 w-12 text-center">No.</th>
                  <th className="px-6 py-4">Entity Code</th>
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4 w-32 text-right">Condition</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/5" : "divide-y divide-slate-200"}>
                {localUnits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">
                      No units yet — scan or add below
                    </td>
                  </tr>
                )}
                {localUnits.map((unit: any, index: number) => {
                  const hasRealCode = !isPlaceholder(unit.entityCode);
                  const isSelected  = selectedIds.includes(unit.id);

                  return (
                    <tr
                      key={unit.id}
                      className={`${isSelected ? "bg-sky-500/10" : ""} ${
                        loadingId === unit.id ? "bg-sky-500/5 animate-pulse" : "hover:bg-sky-500/5"
                      } transition-colors`}
                    >
                      {/* Row number / checkbox */}
                      <td
                        className="px-6 py-5 text-center font-mono text-xs cursor-pointer"
                        onClick={() => toggleSelect(unit.id)}
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center border text-xs ${
                          isSelected
                            ? "bg-sky-500 border-sky-500 text-white"
                            : "border-slate-500/30 text-slate-500"
                        }`}>
                          {index + 1}
                        </div>
                      </td>

                      {/* Entity code — editable */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <input
                            value={hasRealCode ? unit.entityCode : ""}
                            title={`Entity Code ${index + 1}`}
                            aria-label={`Entity Code ${index + 1}`}
                            disabled={!hasPermission}
                            onChange={(e) =>
                              setLocalUnits((prev: any) =>
                                prev.map((u: any) =>
                                  u.id === unit.id ? { ...u, entityCode: e.target.value } : u
                                )
                              )
                            }
                            onBlur={(e) => updateUnit(unit.id, { entityCode: e.target.value })}
                            placeholder="Scan or type code..."
                            className={inputClass}
                          />
                          {hasPermission && (
                            loadingId === unit.id
                              ? <Loader2 className="animate-spin text-sky-500 shrink-0" size={16} />
                              : hasRealCode
                              ? <CheckCircle2 className="text-emerald-500 no-print shrink-0" size={16} />
                              : (
                                <button
                                  onClick={() => setScanningId(unit.id)}
                                  title="Camera Scan"
                                  aria-label="Camera Scan"
                                  className="text-sky-500 hover:scale-110 no-print shrink-0"
                                >
                                  <QrCode size={18} />
                                </button>
                              )
                          )}
                        </div>
                      </td>

                      {/* Item code — display only (from parent item) */}
                      <td className="px-6 py-5">
                        <span className={`font-mono text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          {item.itemCode || "—"}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="px-6 py-5">
                        <input
                          value={unit.model || ""}
                          title={`Model ${index + 1}`}
                          aria-label={`Model ${index + 1}`}
                          disabled={!hasPermission}
                          onChange={(e) =>
                            setLocalUnits((prev: any) =>
                              prev.map((u: any) =>
                                u.id === unit.id ? { ...u, model: e.target.value } : u
                              )
                            )
                          }
                          onBlur={(e) => updateUnit(unit.id, { model: e.target.value })}
                          placeholder="—"
                          className={inputClass}
                        />
                      </td>

                      {/* Condition */}
                      <td className="px-6 py-5 text-right">
                        <select
                          value={unit.condition}
                          title={`Condition ${index + 1}`}
                          aria-label={`Condition ${index + 1}`}
                          disabled={!hasPermission}
                          onChange={(e) => updateUnit(unit.id, { condition: e.target.value })}
                          className={`${
                            dark
                              ? "bg-slate-800 border-white/20 text-white"
                              : "bg-white border-slate-400 text-slate-900"
                          } no-print rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer border`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="UNUSED">UNUSED</option>
                          <option value="USED">USED</option>
                          <option value="FAULTY">FAULTY</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add via camera */}
          {hasPermission && (
            <div className="p-4 no-print">
              <button
                onClick={() => setScanningId("NEW_SLOT")}
                disabled={isAddingNew}
                title="Camera Register"
                aria-label="Camera Register"
                className={dark
                  ? "w-full py-4 border-2 border-dashed border-white/10 rounded-xl font-bold text-xs uppercase text-slate-400 hover:border-sky-500 transition-colors"
                  : "w-full py-4 border-2 border-dashed border-slate-300 rounded-xl font-bold text-xs uppercase text-slate-500 hover:border-sky-600 transition-colors"
                }
              >
                {isAddingNew
                  ? <Loader2 className="animate-spin inline mr-2" size={14} />
                  : <PlusCircle className="inline mr-2" size={16} />
                }
                Register New Unit (Camera)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
