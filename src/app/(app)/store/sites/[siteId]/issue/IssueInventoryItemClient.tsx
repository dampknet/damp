"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Trash2, Loader2, CheckCircle2, QrCode, ArrowLeft } from "lucide-react";

type ItemRow = {
  id: string;
  name: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  quantity: number;
  unit: string | null;
  stockNumber: string | null;
  serialNumber: string | null;
  reorderLevel: number;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
  condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
  instances: { serialNumber: string; condition: string }[];
};

export default function IssueInventoryItemClient({
  site,
  items,
  action,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  items: ItemRow[];
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [bucket, setBucket] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);

  // ─────────────────────────────────────────────────────────────────
  // SMART UNIVERSAL BARCODE / QR-CODE PARSER
  //
  // Extracts the serial number (and optionally model/manufacturer)
  // from any scan format the Syble gun or camera might produce:
  //
  // 1. Rohde & Schwarz  <Manufacturer><Model-Serial-suffix><...>
  // 2. Key:Value text   Serial Number: X  Model: Y  Manufacturer: Z
  // 3. GS1 App IDs      (21)SN  (240)Model  (710)Brand
  // 4. Victron Energy   HQYYWWxxxxx
  // 5. Pipe-delimited   serial|model|manufacturer
  // 6. Semicolon        serial;model;manufacturer
  // 7. Tab-delimited    serial\tmodel\tmanufacturer
  // 8. CSV              serial,model,manufacturer
  // 9. JSON             {"serialNumber":"X","model":"Y",...}
  // 10. URL query-str   ?sn=X&model=Y&mfg=Z
  // 11. Plain serial    bare alphanumeric string
  // ─────────────────────────────────────────────────────────────────
  const parseSmartScan = (text: string): { serialNumber: string; model: string; manufacturer: string } => {
    const result = { serialNumber: "", model: "", manufacturer: "" };

    const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const clean = raw.replace(/[ \t]+/g, " ");

    // ── 1. Rohde & Schwarz angle-bracket format ───────────────────────────────
    const angleFields = [...clean.matchAll(/<([^>]*)>/g)].map(m => m[1].trim());
    if (angleFields.length >= 2) {
      result.manufacturer = angleFields[0];
      const field1 = angleFields[1];
      const parts = field1.split("-");

      if (parts.length === 1) {
        result.serialNumber = field1;
      } else {
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
          result.serialNumber = parts[parts.length - 1];
          result.model = parts.slice(0, -1).join("-");
        }
      }

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
        const sn  = obj.serialNumber ?? obj.serial_number ?? obj.sn ?? obj.serial ?? obj.SN ?? "";
        const mdl = obj.model ?? obj.Model ?? obj.partNumber ?? obj.part_number ?? obj.pn ?? "";
        const mfg = obj.manufacturer ?? obj.Manufacturer ?? obj.brand ?? obj.Brand ?? obj.make ?? "";
        result.serialNumber  = String(sn);
        result.model         = String(mdl);
        result.manufacturer  = String(mfg);
        if (result.serialNumber) return result;
      } catch (_) { /* not valid JSON */ }
    }

    // ── 3. URL query-string ───────────────────────────────────────────────────
    const qsMatch = clean.match(/[?&]([^#]+)/);
    if (qsMatch) {
      try {
        const params = new URLSearchParams(qsMatch[1]);
        const sn =
          params.get("sn") ?? params.get("serialNumber") ?? params.get("serial") ??
          params.get("serial_number") ?? params.get("SN") ?? "";
        const mdl = params.get("model") ?? params.get("Model") ?? params.get("partNumber") ?? params.get("part") ?? "";
        const mfg = params.get("manufacturer") ?? params.get("mfg") ?? params.get("brand") ?? params.get("make") ?? "";
        if (sn) {
          result.serialNumber = sn;
          result.model        = mdl;
          result.manufacturer = mfg;
          return result;
        }
      } catch (_) { /* ignore */ }
    }

    // ── 4. GS1 Application Identifier format ─────────────────────────────────
    const gs1ParenRx = /\((\d{2,4})\)([^(]+)/g;
    const gs1Paren: Record<string, string> = {};
    let gs1Match;
    while ((gs1Match = gs1ParenRx.exec(clean)) !== null) {
      gs1Paren[gs1Match[1]] = gs1Match[2].trim();
    }
    if (Object.keys(gs1Paren).length > 0) {
      result.serialNumber = gs1Paren["21"]  ?? gs1Paren["251"] ?? "";
      result.model        = gs1Paren["240"] ?? gs1Paren["8012"] ?? gs1Paren["01"] ?? "";
      result.manufacturer = gs1Paren["710"] ?? gs1Paren["711"] ?? gs1Paren["712"] ??
                            gs1Paren["713"] ?? gs1Paren["714"] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 5. Key:Value text ─────────────────────────────────────────────────────
    const kvText = clean.replace(/\n/g, " ");
    const snKv  = kvText.match(/(?:serial\s*(?:number|no\.?|#)?|s\/n|sn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mdlKv = kvText.match(/(?:model\s*(?:no\.?|number|#)?|mod|part\s*(?:no\.?|number)?|pn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mfgKv = kvText.match(/(?:manufacturer|mfg|make|brand|vendor)\s*[:\-=]\s*([^\n,;|]+)/i);
    if (snKv) {
      result.serialNumber = snKv[1].trim();
      if (mdlKv) result.model        = mdlKv[1].trim();
      if (mfgKv) result.manufacturer = mfgKv[1].trim().replace(/\s+/g, " ");
      return result;
    }

    // ── 6. Victron Energy serial number ──────────────────────────────────────
    if (/^HQ\d{4}[A-Z0-9]{4,}$/i.test(raw)) {
      result.serialNumber  = raw;
      result.manufacturer  = "Victron Energy";
      return result;
    }

    // ── 7. Pipe-delimited ─────────────────────────────────────────────────────
    if (clean.includes("|")) {
      const parts = clean.split("|").map(s => s.trim());
      result.serialNumber  = parts[0] ?? "";
      result.model         = parts[1] ?? "";
      result.manufacturer  = parts[2] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 8. Semicolon-delimited ────────────────────────────────────────────────
    if (clean.includes(";")) {
      const parts = clean.split(";").map(s => s.trim());
      result.serialNumber  = parts[0] ?? "";
      result.model         = parts[1] ?? "";
      result.manufacturer  = parts[2] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 9. Tab-delimited ──────────────────────────────────────────────────────
    if (raw.includes("\t")) {
      const parts = raw.split("\t").map(s => s.trim());
      result.serialNumber  = parts[0] ?? "";
      result.model         = parts[1] ?? "";
      result.manufacturer  = parts[2] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 10. CSV (2–4 tokens only) ─────────────────────────────────────────────
    const csvParts = clean.split(",").map(s => s.trim());
    if (csvParts.length >= 2 && csvParts.length <= 4 && csvParts[0].length <= 60) {
      result.serialNumber  = csvParts[0];
      result.model         = csvParts[1] ?? "";
      result.manufacturer  = csvParts[2] ?? "";
      if (result.serialNumber) return result;
    }

    // ── 11. Plain serial fallback ─────────────────────────────────────────────
    const plainCandidate = raw.replace(/\s+/g, "");
    if (plainCandidate.length > 0 && plainCandidate.length <= 60 && /^[A-Za-z0-9\-_.\/]+$/.test(plainCandidate)) {
      result.serialNumber = plainCandidate;
      return result;
    }

    // ── 12. Last resort: first word that looks like a serial ──────────────────
    const wordMatch = clean.match(/\b([A-Z0-9][A-Z0-9\-]{4,})\b/i);
    if (wordMatch) result.serialNumber = wordMatch[1];

    return result;
  };

  // ─────────────────────────────────────────────────────────────────
  // SCAN MATCH LOGIC
  // After parsing the scan, extract the serial number and look it up
  // against all registered instances in the database.  The match uses
  // substring search so messy Rohde & Schwarz / multi-field strings
  // still resolve correctly even if the scanner emits extra fields.
  // ─────────────────────────────────────────────────────────────────
  const handleLocalScanMatch = (rawScan: string) => {
    setIsSearching(true);

    // 1. Try to extract a clean serial via the smart parser first
    const parsed = parseSmartScan(rawScan);
    // We'll also keep the raw lowercased string as a fallback for
    // the substring-match path (preserves old behaviour for edge cases)
    const rawLower = rawScan.toLowerCase();
    const parsedSerial = parsed.serialNumber.toLowerCase();

    // 2. Duplicate check — look in the bucket
    const isAlreadyScanned = bucket.some(item =>
      item.serials.some((s: any) => {
        const existing = s.sn.toLowerCase();
        return (
          (parsedSerial && existing === parsedSerial) ||
          rawLower.includes(existing)
        );
      })
    );

    if (isAlreadyScanned) {
      alert("Stop! This item is already in your issue bucket.");
      setIsSearching(false);
      return;
    }

    // 3. Search all instances for a match
    let foundInstance: { serialNumber: string; condition: string } | null = null;
    let foundParentItem: ItemRow | null = null;
    let matchedSerial = "";

    for (const item of items) {
      const match = item.instances?.find((ins) => {
        const dbSerial = ins.serialNumber.toLowerCase();
        if (dbSerial.length < 3) return false;
        // Prefer exact match on the parsed serial; fall back to substring
        return (parsedSerial && dbSerial === parsedSerial) || rawLower.includes(dbSerial);
      });

      if (match) {
        foundInstance  = match;
        foundParentItem = item;
        matchedSerial  = match.serialNumber;
        break;
      }
    }

    if (foundInstance && foundParentItem) {
      setBucket((prev) => {
        const existing = prev.find((i) => i.id === foundParentItem!.id);
        if (existing) {
          return prev.map((i) =>
            i.id === foundParentItem!.id
              ? { ...i, quantity: i.quantity + 1, serials: [...i.serials, { sn: matchedSerial, condition: foundInstance!.condition }] }
              : i
          );
        }
        return [...prev, {
          id: foundParentItem!.id,
          name: foundParentItem!.name,
          itemType: foundParentItem!.itemType,
          quantity: 1,
          serials: [{ sn: matchedSerial, condition: foundInstance!.condition }],
          expectedReturnDate: "",
        }];
      });
    } else {
      alert("Serial not found! No registered serial number was detected inside this scan.");
    }

    setIsSearching(false);
  };

  // ✅ SYBLE SCANNER LISTENER
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 100) scanBuffer.current = "";
      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        if (scanBuffer.current.length > 3) {
          e.preventDefault();
          handleLocalScanMatch(scanBuffer.current);
          scanBuffer.current = "";
        }
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bucket, items]);

  // ✅ CAMERA SCANNER EFFECT
  useEffect(() => {
    if (isCameraActive) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        handleLocalScanMatch(text);
        setIsCameraActive(false);
        scanner.clear();
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [isCameraActive, bucket, items]);

  const getConditionStyle = (c: string) => {
    if (c === "NEW")  return "bg-blue-600";
    if (c === "GOOD") return "bg-emerald-600";
    return "bg-rose-600";
  };

  return (
    <div className={dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"}>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <section className={dark ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl" : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-8 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"}>
          
          <div className={dark ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]" : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"} />

          <div className="flex flex-col gap-3">
            <Link href={`/store/sites/${site.id}`} title="Back to site" className={dark ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline" : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"}>
              <ArrowLeft size={16} /> Back to {site.name} Inventory
            </Link>
            <div className="flex items-center justify-between">
              <div className={dark ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]" : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"}>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Issue Smart Bucket
              </div>
              <div className="flex items-center gap-3">
                 {isSearching && <div className="flex items-center gap-2 text-xs font-bold text-sky-500 animate-pulse"><Loader2 size={14} className="animate-spin" /> MAPPING...</div>}
                 <button type="button" title="Use Camera Scanner" onClick={() => setIsCameraActive(!isCameraActive)} className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-sky-600 transition-all">
                    <QrCode size={16} /> {isCameraActive ? "Close Camera" : "Use Camera"}
                 </button>
              </div>
            </div>
          </div>

          <h1 className={dark ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl" : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"}>
            Issue Inventory Items
          </h1>

          {isCameraActive && (
            <div className="mt-6 overflow-hidden rounded-2xl border-2 border-dashed border-sky-500/50 bg-sky-500/5 p-4">
              <div id="reader" className="mx-auto max-w-sm"></div>
            </div>
          )}

          {/* BUCKET TABLE */}
          <div className={`mt-8 overflow-hidden rounded-2xl border ${dark ? 'border-white/10 bg-white/5' : 'border-[#e7ded3] bg-white'}`}>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest ${dark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4 text-center">Serials / Condition</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-center">Return Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {bucket.length === 0 && (
                  <tr><td colSpan={5} className="py-16 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">Point Syble gun or use camera to scan...</td></tr>
                )}
                {bucket.map((item) => (
                  <tr key={item.id} className="hover:bg-sky-500/5 transition-colors">
                    <td className="px-6 py-4">
                       <div className="font-bold text-sm text-sky-500">{item.name}</div>
                       <div className="text-[10px] opacity-50 uppercase font-black">{item.itemType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-2">
                        {item.serials.map((s: any) => (
                          <span key={s.sn} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black text-white ${getConditionStyle(s.condition)}`}>
                            {s.sn}
                            <button type="button" title={`Remove serial ${s.sn}`} onClick={() => {
                               const filtered = item.serials.filter((x: any) => x.sn !== s.sn);
                               setBucket(prev => filtered.length ? prev.map(i => i.id === item.id ? {...i, serials: filtered, quantity: filtered.length} : i) : prev.filter(i => i.id !== item.id));
                            }}><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.itemType === "MATERIAL" ? (
                        <input type="number" min="1" value={item.quantity} title="Adjust Quantity" aria-label="Adjust Quantity" onChange={(e) => setBucket(prev => prev.map(i => i.id === item.id ? {...i, quantity: Number(e.target.value)} : i))} className="w-16 bg-transparent border-b-sky-500 border-b-2 text-center font-bold outline-none" />
                      ) : <span className="font-mono font-bold text-sm">{item.quantity}</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.itemType === "EQUIPMENT" && (
                        <input type="date" title="Expected Return Date" aria-label="Expected Return Date" onChange={(e) => setBucket(prev => prev.map(i => i.id === item.id ? {...i, expectedReturnDate: e.target.value} : i))} className="bg-transparent text-xs font-bold outline-none border-b border-slate-500/20" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button type="button" title="Remove entire row" aria-label="Remove entire row" onClick={() => setBucket(prev => prev.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4">
             <select title="Manual Search" aria-label="Manual Search" className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none ${dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white text-slate-900"}`}
              onChange={(e) => {
                const itm = items.find((i: any) => i.id === e.target.value);
                if (itm) setBucket(prev => [...prev, { id: itm.id, name: itm.name, itemType: itm.itemType, quantity: 1, serials: [], expectedReturnDate: "" }]);
              }}
             >
               <option value="">Manual Search & Add (Materials)...</option>
               {items.filter((i: any) => i.itemType === "MATERIAL").map((i: any) => (
                 <option key={i.id} value={i.id}>{i.name} ({i.quantity} available)</option>
               ))}
             </select>
          </div>

          <form action={action} onSubmit={(e) => {
              if (bucket.length === 0) { e.preventDefault(); alert("Bucket is empty!"); return; }
              const fd = new FormData(e.currentTarget);
              fd.append("bucketData", JSON.stringify(bucket));
            }}
            className="mt-10 space-y-8"
          >
            <section className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-5" : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"}>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>Requester Details</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Requester Name" dark={dark}><input name="requesterName" required title="Requester Name" placeholder="Full Name" className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} /></Field>
                <Field label="Contact" dark={dark}><input name="requesterContact" required title="Contact" placeholder="Phone Number" className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} /></Field>
              </div>
              <div className="mt-4"><Field label="Department" dark={dark}><input name="department" title="Department" placeholder="Team/Department" className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} /></Field></div>
            </section>

            <section className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-5" : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"}>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>Authorization & Purpose</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Authorized By" dark={dark}><input name="authorizedBy" required title="Authorized By" placeholder="Approving Officer" className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} /></Field>
              </div>
              <div className="mt-4"><Field label="Purpose" dark={dark}><textarea name="purpose" rows={4} required title="Purpose" placeholder="Reason for issue..." className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} /></Field></div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit" title="Confirm and Process" className={dark ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-8 py-3 text-sm font-bold text-white hover:opacity-90" : "rounded-xl bg-[#1a1814] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d2924]"}>
                Process Multi-Item Issue ({bucket.reduce((acc, i) => acc + i.quantity, 0)})
              </button>
              <Link href={`/store/sites/${site.id}`} title="Cancel operation" className={dark ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10" : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2]"}>
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children, dark }: any) {
  return (
    <div className="block">
      <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>{label}</div>
      {children}
    </div>
  );
}