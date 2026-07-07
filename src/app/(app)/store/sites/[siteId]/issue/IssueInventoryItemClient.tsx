"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Trash2, Loader2, QrCode, ArrowLeft } from "lucide-react";

type InstanceRow = {
  id:         string;
  entityCode: string;
  condition:  string;
  status:     string;
};

type ItemRow = {
  id:           string;
  name:         string;
  itemType:     string;
  itemCode:     string | null;
  quantity:     number;
  uncountable:  boolean;
  unit:         string | null;
  reorderLevel: number;
  status:       string;
  condition:    string;  // ✅ item-level condition from DB
  instances:    InstanceRow[];
};

// ─── Canonicalise: strip site prefix, uppercase ───────────────────────────────

const SITE_PREFIXES = ["KNET-", "BAAT-", "TSEA-", "GBC-", "KANDA-", "BAATSONA-", "TSEADDO-"];
const TYPE_SEGS     = ["EQUIP-", "ACCESS-", "TO/PA-", "GEN-", "COOL-", "CA/EL-"];

function canonicalise(raw: string): string {
  let s = raw.trim().toUpperCase();
  for (const prefix of SITE_PREFIXES) {
    if (s.startsWith(prefix)) { s = s.slice(prefix.length); break; }
  }
  const hasTypeSeg = TYPE_SEGS.some((seg) => s.startsWith(seg));
  if (!hasTypeSeg) {
    for (const seg of TYPE_SEGS) {
      const idx = s.indexOf(seg);
      if (idx > 0) { s = s.slice(idx); break; }
    }
  }
  return s;
}

function matchCode(scanned: string, code: string): boolean {
  const s = canonicalise(scanned);
  const d = canonicalise(code);
  if (!s || !d || s.length < 3 || d.length < 3) return false;
  if (s === d) return true;
  if (d.endsWith(s) || s.endsWith(d)) return true;
  return false;
}

function conditionColor(c: string) {
  if (c === "NEW")    return "bg-blue-600";
  if (c === "UNUSED") return "bg-sky-600";
  if (c === "USED")   return "bg-amber-600";
  return "bg-rose-600";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IssueInventoryItemClient({
  site, items, action,
}: {
  site:   { id: string; name: string; location: string | null };
  items:  ItemRow[];
  action: (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");

  const [bucket,         setBucket]         = useState<any[]>([]);
  const [isSearching,    setIsSearching]    = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scanBuffer    = useRef("");
  const assembledScan = useRef("");
  const lastKeyTime   = useRef(0);
  const assembleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── SCAN MATCH ──────────────────────────────────────────────────────────────
  // Priority:
  //   1. Match against a specific AssetInstance entityCode → add that unit
  //   2. Match against an InventoryItem itemCode → add as bulk (qty editable)

  const handleScanMatch = (rawScan: string) => {
    const scanned   = rawScan.replace(/\r\n|\r|\n/g, "").trim();
    const canonical = canonicalise(scanned);
    console.log("[SCAN] raw:", JSON.stringify(scanned), "→ canonical:", canonical);

    setIsSearching(true);

    // ── Pass 1: match a specific instance entity code ──────────────────────────
    let foundInstance: InstanceRow | null = null;
    let foundItemForInstance: ItemRow | null = null;

    outer:
    for (const item of items) {
      for (const ins of item.instances) {
        if (matchCode(scanned, ins.entityCode)) {
          foundInstance        = ins;
          foundItemForInstance = item;
          break outer;
        }
      }
    }

    if (foundInstance && foundItemForInstance) {
      // Duplicate entity code check
      const alreadyIn = bucket.some((b) =>
        b.entityCodes?.some((ec: string) => matchCode(scanned, ec))
      );
      if (alreadyIn) {
        alert("This unit is already in your issue bucket.");
        setIsSearching(false);
        return;
      }

      setBucket((prev) => {
        const existing = prev.find((b) => b.id === foundItemForInstance!.id);
        if (existing) {
          return prev.map((b) =>
            b.id === foundItemForInstance!.id
              ? {
                  ...b,
                  quantity:    b.quantity + 1,
                  entityCodes: [...b.entityCodes, foundInstance!.entityCode],
                  conditions:  [...b.conditions, { code: foundInstance!.entityCode, condition: foundInstance!.condition }],
                  isBulk:      false,
                }
              : b
          );
        }
        return [
          ...prev,
          {
            id:                 foundItemForInstance!.id,
            name:               foundItemForInstance!.name,
            itemType:           foundItemForInstance!.itemType,
            quantity:           1,
            entityCodes:        [foundInstance!.entityCode],
            conditions:         [{ code: foundInstance!.entityCode, condition: foundInstance!.condition }],
            returnable:         true,   // ✅ defaults to returnable
            isBulk:             false,
          },
        ];
      });

      setIsSearching(false);
      return;
    }

    // ── Pass 2: match an item code (bulk/consumable) ──────────────────────────
    const foundBulkItem = items.find(
      (item) => item.itemCode && matchCode(scanned, item.itemCode)
    );

    if (foundBulkItem) {
      // Duplicate item check
      const alreadyIn = bucket.some((b) => b.id === foundBulkItem.id);
      if (alreadyIn) {
        alert(`${foundBulkItem.name} is already in your bucket. Adjust the quantity directly.`);
        setIsSearching(false);
        return;
      }

      setBucket((prev) => [
        ...prev,
        {
          id:                 foundBulkItem.id,
          name:               foundBulkItem.name,
          itemType:           foundBulkItem.itemType,
          quantity:           1,
          entityCodes:        [],
          conditions:         [],
          returnable:         false,  // ✅ bulk defaults to non-returnable
          isBulk:             true,
          bulkCondition:      foundBulkItem.condition,  // ✅ from item DB record
          availableQty:       foundBulkItem.uncountable ? null : foundBulkItem.quantity,
          unit:               foundBulkItem.unit,
        },
      ]);

      setIsSearching(false);
      return;
    }

    // ── No match ─────────────────────────────────────────────────────────────
    console.warn("[SCAN] No match for canonical:", canonical);
    alert(
      `No item found for: ${scanned}\nLooking for: ${canonical}\n\nCheck F12 console for registered codes.`
    );
    setIsSearching(false);
  };

  // ─── SYBLE GUN ASSEMBLER ─────────────────────────────────────────────────────

  useEffect(() => {
    const isComplete = (s: string) => {
      if (s.includes("<") || s.includes(">")) {
        const opens  = (s.match(/</g) ?? []).length;
        const closes = (s.match(/>/g) ?? []).length;
        return opens >= 2 && opens === closes;
      }
      return true;
    };

    const flush = () => {
      const full = assembledScan.current.trim();
      assembledScan.current = "";
      scanBuffer.current    = "";
      if (full.length > 2) handleScanMatch(full);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime.current > 600) {
        scanBuffer.current    = "";
        assembledScan.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (assembleTimer.current) clearTimeout(assembleTimer.current);
        const burst = scanBuffer.current;
        scanBuffer.current = "";
        if (burst.length === 0) return;
        e.preventDefault();
        assembledScan.current += burst;
        if (isComplete(assembledScan.current)) flush();
        else assembleTimer.current = setTimeout(flush, 400);
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (assembleTimer.current) clearTimeout(assembleTimer.current);
    };
  }, [bucket, items]);

  // ─── CAMERA SCANNER ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isCameraActive) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        handleScanMatch(text);
        setIsCameraActive(false);
        scanner.clear();
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [isCameraActive, bucket, items]);

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-8 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
          } />

          {/* Header */}
          <div className="flex flex-col gap-3">
            <Link href={`/store/sites/${site.id}`} className={dark
              ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
              : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
            }>
              <ArrowLeft size={16} /> Back to {site.name} Inventory
            </Link>

            <div className="flex items-center justify-between">
              <div className={dark
                ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Issue Smart Bucket
              </div>
              <div className="flex items-center gap-3">
                {isSearching && (
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-500 animate-pulse">
                    <Loader2 size={14} className="animate-spin" /> MATCHING...
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-sky-600 transition-all"
                >
                  <QrCode size={16} /> {isCameraActive ? "Close Camera" : "Use Camera"}
                </button>
              </div>
            </div>
          </div>

          <h1 className={dark
            ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
            : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
          }>
            Issue Inventory Items
          </h1>
          <p className={dark ? "mt-2 text-sm text-slate-500" : "mt-2 text-sm text-[#8b857c]"}>
            Scan any barcode — entity codes (e.g. <span className="font-mono">EQUIP-004-01</span>) pull specific units,
            item codes (e.g. <span className="font-mono">CA/EL-013</span>) pull bulk items with editable quantity.
            Site prefix stripped automatically.
          </p>

          {error && (
            <div className={dark
              ? "mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{error}</div>
          )}

          {isCameraActive && (
            <div className="mt-6 overflow-hidden rounded-2xl border-2 border-dashed border-sky-500/50 bg-sky-500/5 p-4">
              <div id="reader" className="mx-auto max-w-sm" />
            </div>
          )}

          {/* Bucket table */}
          <div className={`mt-8 overflow-hidden rounded-2xl border ${
            dark ? "border-white/10 bg-white/5" : "border-[#e7ded3] bg-white"
          }`}>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest ${
                  dark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"
                }`}>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4 text-center">Units / Type</th>
                  <th className="px-6 py-4 text-center">Condition</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-center">Return Date</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {bucket.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">
                      Point scanner at barcode or use camera...
                    </td>
                  </tr>
                )}
                {bucket.map((b) => (
                  <tr key={b.id} className="hover:bg-sky-500/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-sky-500">{b.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-40 uppercase font-black">{b.itemType}</span>
                        {b.isBulk && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase text-amber-400">
                            Bulk
                          </span>
                        )}
                      </div>
                      {b.isBulk && b.availableQty !== null && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {b.availableQty} {b.unit || "pcs"} available
                        </div>
                      )}
                    </td>

                    {/* Units column — entity codes for tracked, or empty for bulk */}
                    <td className="px-6 py-4">
                      {b.isBulk ? (
                        <span className={`text-[11px] italic ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                          Bulk item — set qty →
                        </span>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-2">
                          {b.conditions.map((c: any) => (
                            <span
                              key={c.code}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white ${conditionColor(c.condition)}`}
                            >
                              <span className="font-mono">{c.code}</span>
                              <button
                                type="button"
                                title={`Remove ${c.code}`}
                                onClick={() => {
                                  const filtered = b.conditions.filter((x: any) => x.code !== c.code);
                                  setBucket((prev) =>
                                    filtered.length
                                      ? prev.map((i) =>
                                          i.id === b.id
                                            ? { ...i, conditions: filtered, entityCodes: filtered.map((f: any) => f.code), quantity: filtered.length }
                                            : i
                                        )
                                      : prev.filter((i) => i.id !== b.id)
                                  );
                                }}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Condition — colour badge for tracked units, dropdown for bulk */}
                    <td className="px-6 py-4 text-center">
                      {b.isBulk ? (
                        // Bulk: static badge from item's existing condition
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black text-white ${conditionColor(b.bulkCondition ?? "USED")}`}>
                          {b.bulkCondition ?? "USED"}
                        </span>
                      ) : (
                        // Tracked: show distinct badges per unit condition
                        <div className="flex flex-wrap justify-center gap-1">
                          {[...new Set(b.conditions.map((c: any) => c.condition))].map((cond: any) => (
                            <span key={cond}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black text-white ${conditionColor(cond)}`}>
                              {cond}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Qty — always editable for bulk, fixed for tracked */}
                    <td className="px-6 py-4 text-center">
                      {b.isBulk || (b.itemType !== "EQUIPMENT" && b.itemType !== "COOLING_INFRASTRUCTURE") ? (
                        <input
                          type="number"
                          min="1"
                          max={b.availableQty ?? undefined}
                          value={b.quantity}
                          title="Quantity"
                          aria-label="Quantity"
                          onChange={(e) =>
                            setBucket((prev) =>
                              prev.map((i) => i.id === b.id ? { ...i, quantity: Number(e.target.value) } : i)
                            )
                          }
                          className="w-16 bg-transparent border-b-sky-500 border-b-2 text-center font-bold outline-none"
                        />
                      ) : (
                        <span className="font-mono font-bold text-sm">{b.quantity}</span>
                      )}
                    </td>

                    {/* Returnable checkbox — applies to all item types */}
                    <td className="px-6 py-4 text-center">
                      <label className="inline-flex flex-col items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          title="Mark as returnable"
                          aria-label="Returnable"
                          checked={b.returnable ?? false}
                          onChange={(e) =>
                            setBucket((prev) =>
                              prev.map((i) => i.id === b.id ? { ...i, returnable: e.target.checked } : i)
                            )
                          }
                          className="h-4 w-4 rounded accent-emerald-500"
                        />
                        <span className={`text-[9px] font-black uppercase ${
                          (b.returnable ?? false)
                            ? dark ? "text-emerald-400" : "text-emerald-700"
                            : dark ? "text-slate-600" : "text-[#b0a79b]"
                        }`}>
                          {(b.returnable ?? false) ? "Yes" : "No"}
                        </span>
                      </label>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        title="Remove row"
                        aria-label="Remove row"
                        onClick={() => setBucket((prev) => prev.filter((i) => i.id !== b.id))}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Manual add dropdown — for items that can't be scanned */}
          <div className="mt-4">
            <select
              title="Manual Add"
              aria-label="Manual Add"
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none ${
                dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white text-slate-900"
              }`}
              onChange={(e) => {
                const found = items.find((i) => i.id === e.target.value);
                if (found) {
                  if (bucket.some((b) => b.id === found.id)) {
                    alert(`${found.name} is already in your bucket.`);
                    e.target.value = "";
                    return;
                  }
                  setBucket((prev) => [
                    ...prev,
                    {
                      id:                 found.id,
                      name:               found.name,
                      itemType:           found.itemType,
                      quantity:           1,
                      entityCodes:        [],
                      conditions:         [],
                      returnable:         false,  // ✅ manual adds default non-returnable
                      isBulk:             true,
                      bulkCondition:      found.condition,  // ✅ from item DB record
                      availableQty:       found.uncountable ? null : found.quantity,
                      unit:               found.unit,
                    },
                  ]);
                  e.target.value = "";
                }
              }}
            >
              <option value="">+ Manual Add (select any item)...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.itemCode ? `· ${i.itemCode}` : ""}
                  {" — "}
                  {i.uncountable ? "N/A" : `${i.quantity}`} {i.unit || "pcs"}
                </option>
              ))}
            </select>
          </div>

          {/* Issue form */}
          <form
            action={action}
            onSubmit={(e) => {
              if (bucket.length === 0) { e.preventDefault(); alert("Bucket is empty!"); return; }
              const fd = new FormData(e.currentTarget);
              fd.append("bucketData", JSON.stringify(bucket));
            }}
            className="mt-10 space-y-8"
          >
            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "text-sm font-semibold text-slate-100 mb-4" : "text-sm font-semibold text-[#1a1814] mb-4"}>
                Requester Details
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Requester Name" dark={dark}>
                  <input name="requesterName" required placeholder="Full Name" title="Requester Name" className={inputCls(dark)} />
                </Field>
                <Field label="Contact" dark={dark}>
                  <input name="requesterContact" required placeholder="Phone Number" title="Contact" className={inputCls(dark)} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Department" dark={dark}>
                  <input name="department" placeholder="Team/Department" title="Department" className={inputCls(dark)} />
                </Field>
              </div>
            </section>

            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "text-sm font-semibold text-slate-100 mb-4" : "text-sm font-semibold text-[#1a1814] mb-4"}>
                Authorization & Purpose
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Authorized By" dark={dark}>
                  <input name="authorizedBy" required placeholder="Approving Officer" title="Authorized By" className={inputCls(dark)} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Purpose" dark={dark}>
                  <textarea name="purpose" rows={4} required placeholder="Reason for issue..." title="Purpose" className={inputCls(dark)} />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit" className={dark
                ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-8 py-3 text-sm font-bold text-white hover:opacity-90"
                : "rounded-xl bg-[#1a1814] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d2924]"
              }>
                Process Issue ({bucket.reduce((acc, b) => acc + b.quantity, 0)} units)
              </button>
              <Link href={`/store/sites/${site.id}`} className={dark
                ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
                : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2]"
              }>
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function inputCls(dark: boolean) {
  return dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";
}

function Field({ label, children, dark }: { label: string; children: React.ReactNode; dark: boolean }) {
  return (
    <div>
      <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>
        {label}
      </div>
      {children}
    </div>
  );
}
