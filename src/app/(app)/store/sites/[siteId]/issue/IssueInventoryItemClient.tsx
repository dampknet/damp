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
  // KEY DIFFERENCE FROM DeviceManagement version:
  // This returns ALL possible candidate serial numbers extracted from
  // the scan (not just the best one), so the DB match can try every
  // candidate. This is critical for R&S format where the "serial"
  // could be stored as "101793", "101793-dZ", or the full field.
  // ─────────────────────────────────────────────────────────────────
  const parseSmartScan = (text: string): {
    candidates: string[];
    model: string;
    manufacturer: string;
  } => {
    const candidates: string[] = [];
    let model = "";
    let manufacturer = "";

    const raw   = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const clean = raw.replace(/[ \t]+/g, " ");

    // Add a candidate only if non-empty, long enough, and not duplicate
    const addCandidate = (s: string) => {
      const t = s.trim();
      if (t && t.length >= 3 && !candidates.includes(t)) candidates.push(t);
    };

    // ── 1. Rohde & Schwarz angle-bracket format ───────────────────────────────
    // e.g. <Rhode & Schwarz><2501.7406.06-101793-dZ><-><UHF AMPLIFIER><...>
    const angleFields = [...clean.matchAll(/<([^>]*)>/g)].map(m => m[1].trim());
    if (angleFields.length >= 2) {
      manufacturer      = angleFields[0];
      const field1      = angleFields[1]; // "2501.7406.06-101793-dZ"
      const parts       = field1.split("-");

      // Always add every individual segment and the full field as candidates
      // so no matter how the serial was saved, we find a match
      addCandidate(field1);
      parts.forEach(p => addCandidate(p));

      // Also add every multi-segment suffix (e.g. "101793-dZ", "dZ")
      for (let i = 1; i < parts.length; i++) {
        addCandidate(parts.slice(i).join("-"));
      }

      // Best-guess serial: walk right-to-left, first token that is
      // alphanumeric-only, has a digit, and is ≥4 chars
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (/[0-9]/.test(p) && p.length >= 4 && /^[A-Za-z0-9]+$/.test(p)) {
          // Move this to front of candidates so it's tried first
          const idx = candidates.indexOf(p);
          if (idx > 0) {
            candidates.splice(idx, 1);
            candidates.unshift(p);
          }
          model = parts.slice(0, i).join("-");
          break;
        }
      }

      // Description field as model fallback
      if (!model && angleFields.length > 3) {
        const desc = angleFields[3];
        if (!/^\d{2}-\d{2}-\d{4}$/.test(desc) && !/\d+KG/i.test(desc) && desc !== "-") {
          model = desc;
        }
      }

      return { candidates, model, manufacturer };
    }

    // ── 2. JSON object ────────────────────────────────────────────────────────
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const obj = JSON.parse(clean);
        const sn  = obj.serialNumber ?? obj.serial_number ?? obj.sn ?? obj.serial ?? obj.SN ?? "";
        model        = String(obj.model ?? obj.Model ?? obj.partNumber ?? obj.part_number ?? obj.pn ?? "");
        manufacturer = String(obj.manufacturer ?? obj.Manufacturer ?? obj.brand ?? obj.Brand ?? obj.make ?? "");
        addCandidate(String(sn));
        if (candidates.length) return { candidates, model, manufacturer };
      } catch (_) { /* not JSON */ }
    }

    // ── 3. URL query-string ───────────────────────────────────────────────────
    const qsMatch = clean.match(/[?&]([^#]+)/);
    if (qsMatch) {
      try {
        const params = new URLSearchParams(qsMatch[1]);
        const sn = params.get("sn") ?? params.get("serialNumber") ?? params.get("serial") ??
                   params.get("serial_number") ?? params.get("SN") ?? "";
        model        = params.get("model") ?? params.get("partNumber") ?? params.get("part") ?? "";
        manufacturer = params.get("manufacturer") ?? params.get("mfg") ?? params.get("brand") ?? "";
        addCandidate(sn);
        if (candidates.length) return { candidates, model, manufacturer };
      } catch (_) { /* ignore */ }
    }

    // ── 4. GS1 Application Identifiers ───────────────────────────────────────
    const gs1Paren: Record<string, string> = {};
    const gs1Rx = /\((\d{2,4})\)([^(]+)/g;
    let gs1m;
    while ((gs1m = gs1Rx.exec(clean)) !== null) gs1Paren[gs1m[1]] = gs1m[2].trim();
    if (Object.keys(gs1Paren).length > 0) {
      addCandidate(gs1Paren["21"]  ?? gs1Paren["251"] ?? "");
      model        = gs1Paren["240"] ?? gs1Paren["8012"] ?? gs1Paren["01"] ?? "";
      manufacturer = gs1Paren["710"] ?? gs1Paren["711"] ?? gs1Paren["712"] ??
                     gs1Paren["713"] ?? gs1Paren["714"] ?? "";
      if (candidates.length) return { candidates, model, manufacturer };
    }

    // ── 5. Key:Value text ─────────────────────────────────────────────────────
    const kvText = clean.replace(/\n/g, " ");
    const snKv   = kvText.match(/(?:serial\s*(?:number|no\.?|#)?|s\/n|sn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mdlKv  = kvText.match(/(?:model\s*(?:no\.?|number|#)?|mod|part\s*(?:no\.?|number)?|pn)\s*[:\-=]\s*([^\s,;|]+)/i);
    const mfgKv  = kvText.match(/(?:manufacturer|mfg|make|brand|vendor)\s*[:\-=]\s*([^\n,;|]+)/i);
    if (snKv) {
      addCandidate(snKv[1].trim());
      if (mdlKv) model        = mdlKv[1].trim();
      if (mfgKv) manufacturer = mfgKv[1].trim().replace(/\s+/g, " ");
      return { candidates, model, manufacturer };
    }

    // ── 6. Victron Energy HQYYWWxxxxx ────────────────────────────────────────
    if (/^HQ\d{4}[A-Z0-9]{4,}$/i.test(raw)) {
      addCandidate(raw);
      manufacturer = "Victron Energy";
      return { candidates, model, manufacturer };
    }

    // ── 7–10. Delimited formats ───────────────────────────────────────────────
    if (clean.includes("|")) {
      const p = clean.split("|").map(s => s.trim());
      addCandidate(p[0]); model = p[1] ?? ""; manufacturer = p[2] ?? "";
      if (candidates.length) return { candidates, model, manufacturer };
    }
    if (clean.includes(";")) {
      const p = clean.split(";").map(s => s.trim());
      addCandidate(p[0]); model = p[1] ?? ""; manufacturer = p[2] ?? "";
      if (candidates.length) return { candidates, model, manufacturer };
    }
    if (raw.includes("\t")) {
      const p = raw.split("\t").map(s => s.trim());
      addCandidate(p[0]); model = p[1] ?? ""; manufacturer = p[2] ?? "";
      if (candidates.length) return { candidates, model, manufacturer };
    }
    const csvParts = clean.split(",").map(s => s.trim());
    if (csvParts.length >= 2 && csvParts.length <= 4 && csvParts[0].length <= 60) {
      addCandidate(csvParts[0]); model = csvParts[1] ?? ""; manufacturer = csvParts[2] ?? "";
      if (candidates.length) return { candidates, model, manufacturer };
    }

    // ── 11. Plain serial fallback ─────────────────────────────────────────────
    const plain = raw.replace(/\s+/g, "");
    if (plain.length > 0 && plain.length <= 60 && /^[A-Za-z0-9\-_.\/]+$/.test(plain)) {
      addCandidate(plain);
      return { candidates, model, manufacturer };
    }

    // ── 12. Last resort ───────────────────────────────────────────────────────
    const wordMatch = clean.match(/\b([A-Z0-9][A-Z0-9\-]{4,})\b/i);
    if (wordMatch) addCandidate(wordMatch[1]);

    return { candidates, model, manufacturer };
  };

  // ─────────────────────────────────────────────────────────────────
  // SCAN MATCH LOGIC — THREE-PASS MATCHING
  //
  // Pass A: exact — candidate === dbSerial
  // Pass B: scan contains db serial (raw substring)
  // Pass C: candidate contains db serial, OR db serial contains candidate
  //
  // This means it doesn't matter whether the device was registered
  // with "101793", "101793-dZ", or "2501.7406.06-101793-dZ" —
  // one of the three passes will always find it.
  // ─────────────────────────────────────────────────────────────────
  const handleLocalScanMatch = (rawScan: string) => {
    setIsSearching(true);

    const { candidates } = parseSmartScan(rawScan);
    const rawLower        = rawScan.toLowerCase();
    const candidatesLower = candidates.map(c => c.toLowerCase());

    // ── Duplicate check ───────────────────────────────────────────────────────
    const isAlreadyScanned = bucket.some(item =>
      item.serials.some((s: any) => {
        const existing = s.sn.toLowerCase();
        return (
          candidatesLower.some(c => c === existing) ||
          rawLower.includes(existing) ||
          candidatesLower.some(c => c.includes(existing) || existing.includes(c))
        );
      })
    );
    if (isAlreadyScanned) {
      alert("Stop! This item is already in your issue bucket.");
      setIsSearching(false);
      return;
    }

    // ── Database search ───────────────────────────────────────────────────────
    let foundInstance: { serialNumber: string; condition: string } | null = null;
    let foundParentItem: ItemRow | null = null;
    let matchedSerial = "";

    outer:
    for (const item of items) {
      for (const ins of (item.instances ?? [])) {
        const dbSerial = ins.serialNumber.toLowerCase();
        if (dbSerial.length < 3) continue;

        const hit =
          // A. Exact match
          candidatesLower.some(c => c === dbSerial) ||
          // B. Raw scan string contains the db serial
          rawLower.includes(dbSerial) ||
          // C. Candidate contains db serial, or db serial contains candidate
          candidatesLower.some(c => c.includes(dbSerial) || dbSerial.includes(c));

        if (hit) {
          foundInstance   = ins;
          foundParentItem = item;
          matchedSerial   = ins.serialNumber;
          break outer;
        }
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
          id:                 foundParentItem!.id,
          name:               foundParentItem!.name,
          itemType:           foundParentItem!.itemType,
          quantity:           1,
          serials:            [{ sn: matchedSerial, condition: foundInstance!.condition }],
          expectedReturnDate: "",
        }];
      });
    } else {
      // Debug info printed to console so you can see exactly what was tried
      console.warn("[Scanner] No match found.");
      console.warn("  Raw scan   :", rawScan);
      console.warn("  Candidates :", candidates);
      console.warn("  DB serials :", items.flatMap(i => i.instances.map(ins => ins.serialNumber)));
      alert(
        `Serial not found!\n\n` +
        `Candidates tried:\n${candidates.join("\n") || "(none extracted)"}\n\n` +
        `Open browser console (F12) to see all DB serials and compare.`
      );
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