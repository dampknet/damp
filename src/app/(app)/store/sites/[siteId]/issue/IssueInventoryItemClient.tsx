"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Trash2, Loader2, QrCode, ArrowLeft } from "lucide-react";
import { ALL_CODE_SEGMENTS, ALL_SITE_PREFIXES } from "@/lib/item-types";

type InstanceRow = {
  id:         string;
  entityCode: string;
  condition:  string;
  status:     string;
};

type ItemRow = {
  id:           string;
  name:         string;
  itemType:     string;   // display name, e.g. "Equipment › Solar Equipment"
  tracked:      boolean;  // units tracked one by one (from the item type setting)
  itemCode:     string | null;
  quantity:     number;
  uncountable:  boolean;
  unit:         string | null;
  reorderLevel: number;
  status:       string;
  condition:    string;
  instances:    InstanceRow[];
};

type BucketEntry = {
  id:           string;
  name:         string;
  itemType:     string;
  tracked:      boolean;
  quantity:     number;
  entityCodes:  string[];
  conditions:   { code: string; condition: string }[];
  returnable:   boolean;
  isBulk:       boolean;
  uncountable?: boolean;
  bulkCondition?: string;
  availableQty?: number | null;
  unit?:        string | null;
  // undefined = not chosen yet (filled from "Send all items to"); OTHER_DEST = typed place
  destinationSiteId?: string;
  destinationOther?:  string;
};

type Destination = { id: string; name: string };

const OTHER_DEST = "__OTHER__";
const OTHER_PLACES_LIST = "issue-other-places";

function DestinationPicker({
  destinations, siteId, other, onChange, dark, compact = false, label,
}: {
  destinations: Destination[];
  siteId:       string;
  other:        string;
  onChange:     (siteId: string, other: string) => void;
  dark:         boolean;
  compact?:     boolean;
  label:        string;
}) {
  const cls = `${compact ? "w-44 px-2 py-1.5 text-xs" : "w-full px-3 py-2.5 text-sm"} rounded-xl border outline-none ${
    dark ? "border-white/10 bg-[#101720] text-slate-100" : "border-[#ddd5c9] bg-white text-slate-900"
  } ${!siteId ? (dark ? "border-amber-500/50" : "border-amber-400") : ""}`;
  return (
    <div data-noscan className={`flex flex-col gap-1.5 ${compact ? "items-center" : ""}`}>
      <select value={siteId} onChange={(e) => onChange(e.target.value, e.target.value === OTHER_DEST ? other : "")}
        aria-label={label} title={label} className={cls}>
        <option value="">Choose destination…</option>
        {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        <option value={OTHER_DEST}>Other place (type it)…</option>
      </select>
      {siteId === OTHER_DEST && (
        <input value={other} onChange={(e) => onChange(OTHER_DEST, e.target.value)} maxLength={120}
          list={OTHER_PLACES_LIST} autoComplete="off"
          placeholder="e.g. Head Office" aria-label={`${label} (other place)`} className={cls} />
      )}
    </div>
  );
}

// Set from the server for this warehouse (its prefix + short codes); defaults are the standard ones.
let SITE_PREFIXES: string[] = ALL_SITE_PREFIXES;
let TYPE_SEGS:     string[] = ALL_CODE_SEGMENTS;

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

export default function IssueInventoryItemClient({
  site, items, destinations, otherPlaces, canBackdate, today, action, codeSegments, sitePrefixes,
}: {
  site:         { id: string; name: string; location: string | null };
  items:        ItemRow[];
  destinations: Destination[];
  otherPlaces:  string[];
  canBackdate:  boolean;   // master admins can set the real issue date
  today:        string;    // YYYY-MM-DD (server's today)
  action:       (formData: FormData) => void;
  codeSegments: string[];  // this warehouse's short codes ("EQUIP-", …) for barcode matching
  sitePrefixes: string[];  // label prefixes to strip ("KANDA-", …)
}) {
  // Barcode matching uses this warehouse's own short codes.
  SITE_PREFIXES = sitePrefixes;
  TYPE_SEGS     = codeSegments;

  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");

  const [bucket,         setBucket]         = useState<BucketEntry[]>([]);
  const [isSearching,    setIsSearching]    = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const bucketRef = useRef<BucketEntry[]>([]);
  const itemsRef  = useRef<ItemRow[]>(items);

  // "Send all items to": applied to every row, and to rows added afterwards.
  const [defaultDest, setDefaultDest] = useState({ siteId: "", other: "" });

  useEffect(() => { bucketRef.current = bucket; }, [bucket]);

  // Newly added rows start with the "Send all items to" destination.
  useEffect(() => {
    if (bucket.some((b) => b.destinationSiteId === undefined)) {
      setBucket((prev) => prev.map((b) => b.destinationSiteId === undefined
        ? { ...b, destinationSiteId: defaultDest.siteId, destinationOther: defaultDest.other }
        : b));
    }
  }, [bucket, defaultDest]);

  const setRowDest = (id: string, siteId: string, other: string) =>
    setBucket((prev) => prev.map((b) => (b.id === id ? { ...b, destinationSiteId: siteId, destinationOther: other } : b)));

  const setAllDest = (siteId: string, other: string) => {
    setDefaultDest({ siteId, other });
    setBucket((prev) => prev.map((b) => ({ ...b, destinationSiteId: siteId, destinationOther: other })));
  };

  // ── Draft: keep the bucket and typed details in this browser until the issue goes through ──
  // (so an inactivity sign-out or a closed tab doesn't lose a half-finished issue)
  const DRAFT_KEY   = `kims:issue-draft:${site.id}`;
  const DRAFT_FIELDS = ["requesterName", "requesterContact", "department", "authorizedBy", "purpose", "issueDate"];
  const formRef     = useRef<HTMLFormElement>(null);
  const draftReady  = useRef(false);
  const [restoredAt,   setRestoredAt]   = useState<number | null>(null);
  const [droppedUnits, setDroppedUnits] = useState(0);

  const fieldEl = (name: string) =>
    (formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null) ?? null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { savedAt: number; bucket: BucketEntry[]; defaultDest?: { siteId: string; other: string }; fields?: Record<string, string> };
        // Only bring back items and units that are still available to issue.
        const byId = new Map(items.map((i) => [i.id, i]));
        let dropped = 0;
        const restored = (d.bucket ?? []).flatMap((b) => {
          const it = byId.get(b.id);
          if (!it) { dropped += b.quantity || 1; return []; }
          if (b.isBulk) return [b];
          const avail = new Set(it.instances.map((x) => x.entityCode));
          const conds = (b.conditions ?? []).filter((c) => avail.has(c.code));
          dropped += (b.conditions?.length ?? 0) - conds.length;
          return conds.length ? [{ ...b, conditions: conds, entityCodes: conds.map((c) => c.code), quantity: conds.length }] : [];
        });
        const fields = d.fields ?? {};
        const hasFields = Object.entries(fields).some(([k, v]) => k !== "issueDate" && v);
        if (restored.length || hasFields) {
          setBucket(restored);
          if (d.defaultDest) setDefaultDest(d.defaultDest);
          for (const [name, value] of Object.entries(fields)) { const el = fieldEl(name); if (el && value) el.value = value; }
          setRestoredAt(d.savedAt);
          setDroppedUnits(dropped);
        }
      }
    } catch {}
    const t = setTimeout(() => { draftReady.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = useCallback(() => {
    if (!draftReady.current) return;
    try {
      const fields: Record<string, string> = {};
      for (const name of DRAFT_FIELDS) { const el = fieldEl(name); if (el) fields[name] = el.value; }
      const empty = bucket.length === 0 && Object.entries(fields).every(([k, v]) => k === "issueDate" || !v.trim());
      if (empty) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), bucket, defaultDest, fields }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, defaultDest, DRAFT_KEY]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setBucket([]);
    setDefaultDest({ siteId: "", other: "" });
    formRef.current?.reset();
    setRestoredAt(null);
    setDroppedUnits(0);
  };

  const missingDestinations = bucket.filter((b) =>
    !b.destinationSiteId || (b.destinationSiteId === OTHER_DEST && !(b.destinationOther ?? "").trim()));
  useEffect(() => { itemsRef.current  = items;  }, [items]);

  const scanBuffer    = useRef("");
  const assembledScan = useRef("");
  const lastKeyTime   = useRef(0);
  const assembleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScanMatch = useCallback((rawScan: string) => {
    const scanned   = rawScan.replace(/\r\n|\r|\n/g, "").trim();
    const canonical = canonicalise(scanned);
    console.log("[SCAN] raw:", JSON.stringify(scanned), "→ canonical:", canonical);

    setIsSearching(true);

    const currentBucket = bucketRef.current;
    const currentItems  = itemsRef.current;

    let foundInstance:        InstanceRow | null = null;
    let foundItemForInstance: ItemRow     | null = null;

    outer:
    for (const item of currentItems) {
      for (const ins of item.instances) {
        if (matchCode(scanned, ins.entityCode)) {
          foundInstance        = ins;
          foundItemForInstance = item;
          break outer;
        }
      }
    }

    if (foundInstance && foundItemForInstance) {
      const alreadyIn = currentBucket.some((b) =>
        b.entityCodes?.some((ec) => matchCode(scanned, ec))
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
                }
              : b
          );
        }
        return [
          ...prev,
          {
            id:           foundItemForInstance!.id,
            name:         foundItemForInstance!.name,
            itemType:     foundItemForInstance!.itemType,
            tracked:      foundItemForInstance!.tracked,
            quantity:     1,
            entityCodes:  [foundInstance!.entityCode],
            conditions:   [{ code: foundInstance!.entityCode, condition: foundInstance!.condition }],
            returnable:   false,
            isBulk:       false,
          },
        ];
      });
      setIsSearching(false);
      return;
    }

    const foundBulkItem = currentItems.find(
      (item) => item.itemCode && matchCode(scanned, item.itemCode)
    );

    if (foundBulkItem) {
      const alreadyIn = currentBucket.some((b) => b.id === foundBulkItem.id);
      if (alreadyIn) {
        alert(`${foundBulkItem.name} is already in your bucket. Adjust the quantity directly.`);
        setIsSearching(false);
        return;
      }

      setBucket((prev) => [
        ...prev,
        {
          id:            foundBulkItem.id,
          name:          foundBulkItem.name,
          itemType:      foundBulkItem.itemType,
          tracked:       foundBulkItem.tracked,
          quantity:      1,
          entityCodes:   [],
          conditions:    [],
          returnable:    false,
          isBulk:        true,
          bulkCondition: foundBulkItem.condition,
          uncountable:   foundBulkItem.uncountable,
          availableQty:  foundBulkItem.uncountable ? null : foundBulkItem.quantity,
          unit:          foundBulkItem.unit,
        },
      ]);
      setIsSearching(false);
      return;
    }

    console.warn("[SCAN] No match for canonical:", canonical);
    alert(`No item found for: ${scanned}\nLooking for: ${canonical}\n\nCheck F12 console for registered codes.`);
    setIsSearching(false);
  }, []);

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
      // Typing a destination place name is not a barcode scan.
      if ((e.target as HTMLElement | null)?.closest?.("[data-noscan]")) return;
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
  }, [handleScanMatch]);

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
  }, [isCameraActive, handleScanMatch]);

  const doSearch = (val: string) => {
    const currentItems  = itemsRef.current;
    const currentBucket = bucketRef.current;

    for (const item of currentItems) {
      for (const ins of item.instances) {
        if (matchCode(val, ins.entityCode)) {
          handleScanMatch(val);
          return;
        }
      }
    }

    const byItemCode = currentItems.find(
      (i) => i.itemCode && matchCode(val, i.itemCode)
    );
    if (byItemCode) {
      if (currentBucket.some((b) => b.id === byItemCode.id)) {
        alert(`${byItemCode.name} is already in your bucket.`);
        return;
      }
      setBucket((prev) => [...prev, {
        id:            byItemCode.id,
        name:          byItemCode.name,
        itemType:      byItemCode.itemType,
        tracked:       byItemCode.tracked,
        quantity:      1,
        entityCodes:   [],
        conditions:    [],
        returnable:    false,
        isBulk:        true,
        bulkCondition: byItemCode.condition,
        uncountable:   byItemCode.uncountable,
        availableQty:  byItemCode.uncountable ? null : byItemCode.quantity,
        unit:          byItemCode.unit,
      }]);
      return;
    }

    const byName = currentItems.find(
      (i) => i.name.toLowerCase().includes(val.toLowerCase())
    );
    if (byName) {
      if (currentBucket.some((b) => b.id === byName.id)) {
        alert(`${byName.name} is already in your bucket.`);
        return;
      }
      setBucket((prev) => [...prev, {
        id:            byName.id,
        name:          byName.name,
        itemType:      byName.itemType,
        tracked:       byName.tracked,
        quantity:      1,
        entityCodes:   [],
        conditions:    [],
        returnable:    false,
        isBulk:        true,
        bulkCondition: byName.condition,
        uncountable:   byName.uncountable,
        availableQty:  byName.uncountable ? null : byName.quantity,
        unit:          byName.unit,
      }]);
      return;
    }

    alert(`No item found for: "${val}"\nTry the item code, entity code, or part of the name.`);
  };

  // The server gets a site id, or an empty id plus the typed place for "Other".
  const bucketJson = JSON.stringify(bucket.map((b) => ({
    ...b,
    destinationSiteId: b.destinationSiteId === OTHER_DEST ? "" : (b.destinationSiteId ?? ""),
    destinationOther:  b.destinationSiteId === OTHER_DEST ? (b.destinationOther ?? "").trim() : "",
  })));

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";

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
                <button type="button" onClick={() => setIsCameraActive(!isCameraActive)}
                  className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-sky-600 transition-all">
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
            Scan barcodes — entity codes pull specific units, item codes pull bulk items.
            Site prefix stripped automatically.
          </p>

          {error && (
            <div className={dark
              ? "mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{error}</div>
          )}

          {restoredAt && (
            <div className={dark
              ? "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200"
              : "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
            }>
              <span suppressHydrationWarning>
                Restored your unfinished issue from {new Date(restoredAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
                {droppedUnits > 0 && ` ${droppedUnits} unit${droppedUnits === 1 ? " is" : "s are"} no longer available and ${droppedUnits === 1 ? "was" : "were"} removed.`}
              </span>
              <button type="button" onClick={discardDraft} className="font-semibold underline">Discard and start fresh</button>
            </div>
          )}

          {isCameraActive && (
            <div className="mt-6 overflow-hidden rounded-2xl border-2 border-dashed border-sky-500/50 bg-sky-500/5 p-4">
              <div id="reader" className="mx-auto max-w-sm" />
            </div>
          )}

          {/* Suggestions for "Other place" boxes — places typed on earlier issues */}
          <datalist id={OTHER_PLACES_LIST}>
            {otherPlaces.map((p) => <option key={p} value={p} />)}
          </datalist>

          <div className={`mt-8 flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-start sm:gap-4 ${
            dark ? "border-white/10 bg-white/5" : "border-[#e7ded3] bg-[#fffdfa]"
          }`}>
            <div className="sm:w-56 sm:pt-2">
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>Send all items to</div>
              <div className={dark ? "text-[11px] text-slate-500" : "text-[11px] text-[#8b857c]"}>
                Sets every row (and new ones). You can still change any single item below.
              </div>
            </div>
            <div className="flex-1">
              <DestinationPicker dark={dark} destinations={destinations} label="Send all items to"
                siteId={defaultDest.siteId} other={defaultDest.other} onChange={setAllDest} />
            </div>
          </div>

          <div className={`mt-4 overflow-x-auto rounded-2xl border ${
            dark ? "border-white/10 bg-white/5" : "border-[#e7ded3] bg-white"
          }`}>
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest ${
                  dark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"
                }`}>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4 text-center">Units / Type</th>
                  <th className="px-6 py-4 text-center">Condition</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-center">Return Date</th>
                  <th className="px-4 py-4 text-center">Destination</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {bucket.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">
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
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase text-amber-400">Bulk</span>
                        )}
                      </div>
                      {b.isBulk && b.availableQty !== null && b.availableQty !== undefined && (
                        <div className="mt-0.5 text-[10px] text-slate-500">{b.availableQty} {b.unit || "pcs"} available</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {b.isBulk ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] italic ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                            {b.uncountable ? "N/A qty" : `${b.availableQty ?? 0} avail`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-2">
                          {b.conditions.map((c) => (
                            <span key={c.code}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white ${conditionColor(c.condition)}`}>
                              <span className="font-mono">{c.code}</span>
                              <button type="button" title={`Remove ${c.code}`}
                                onClick={() => {
                                  const filtered = b.conditions.filter((x) => x.code !== c.code);
                                  setBucket((prev) =>
                                    filtered.length
                                      ? prev.map((i) => i.id === b.id ? { ...i, conditions: filtered, entityCodes: filtered.map((f) => f.code), quantity: filtered.length } : i)
                                      : prev.filter((i) => i.id !== b.id)
                                  );
                                }}
                              ><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {b.isBulk ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black text-white ${conditionColor(b.bulkCondition ?? "USED")}`}>
                          {b.bulkCondition ?? "USED"}
                        </span>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-1">
                          {[...new Set(b.conditions.map((c) => c.condition))].map((cond) => (
                            <span key={cond}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black text-white ${conditionColor(cond)}`}>
                              {cond}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {b.isBulk || !b.tracked ? (
                        <input type="number" min="1"
                          max={b.availableQty ?? undefined}
                          value={b.quantity}
                          title="Quantity" aria-label="Quantity"
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

                    <td className="px-6 py-4 text-center">
                      <label className="inline-flex flex-col items-center gap-1 cursor-pointer">
                        <input type="checkbox"
                          title="Mark as returnable" aria-label="Returnable"
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

                    <td className="px-4 py-4 text-center">
                      <DestinationPicker dark={dark} compact destinations={destinations} label={`Destination for ${b.name}`}
                        siteId={b.destinationSiteId ?? ""} other={b.destinationOther ?? ""}
                        onChange={(siteId, other) => setRowDest(b.id, siteId, other)} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button type="button" title="Remove row" aria-label="Remove row"
                        onClick={() => setBucket((prev) => prev.filter((i) => i.id !== b.id))}
                        className="text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>
              Search by item code, entity code or name
            </div>
            <div className="flex gap-2">
              <input
                id="item-code-search"
                placeholder="e.g. KNET-ACCESS-007, KNET-EQUIP-004-01, or lock nuts..."
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none ${
                  dark ? "border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" : "border-[#ddd5c9] bg-white placeholder:text-slate-400"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) { doSearch(val); (e.target as HTMLInputElement).value = ""; }
                  }
                }}
              />
              <button type="button"
                onClick={() => {
                  const input = document.getElementById("item-code-search") as HTMLInputElement;
                  const val   = input?.value.trim();
                  if (val) { doSearch(val); if (input) input.value = ""; }
                }}
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-4">
            <select title="Manual Add" aria-label="Manual Add"
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
                      id:            found.id,
                      name:          found.name,
                      itemType:      found.itemType,
                      tracked:       found.tracked,
                      quantity:      1,
                      entityCodes:   [],
                      conditions:    [],
                      returnable:    false,
                      isBulk:        true,
                      bulkCondition: found.condition,
                      uncountable:   found.uncountable,
                      availableQty:  found.uncountable ? null : found.quantity,
                      unit:          found.unit,
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

          <form ref={formRef} action={action} className="mt-10 space-y-8" onInput={saveDraft} onSubmit={() => setIsSubmitting(true)}>
            <input type="hidden" name="bucketData" value={bucketJson} />

            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "text-sm font-semibold text-slate-100 mb-4" : "text-sm font-semibold text-[#1a1814] mb-4"}>
                Requester Details
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Requester Name" dark={dark}>
                  <input name="requesterName" required placeholder="Full Name" title="Requester Name" className={inputCls} />
                </Field>
                <Field label="Contact" dark={dark}>
                  <input name="requesterContact" required placeholder="Phone Number" title="Contact" className={inputCls} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Department" dark={dark}>
                  <input name="department" placeholder="Team/Department" title="Department" className={inputCls} />
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
                  <input name="authorizedBy" required placeholder="Approving Officer" title="Authorized By" className={inputCls} />
                </Field>
                {canBackdate && (
                  <Field label="Issue date (master admin)" dark={dark}>
                    <input type="date" name="issueDate" defaultValue={today} max={today} min="2020-01-01" required
                      title="Issue date" className={inputCls} />
                    <div className={dark ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-[11px] text-[#8b857c]"}>
                      Leave as today, or set the real date for items already given out on a paper waybill.
                    </div>
                  </Field>
                )}
              </div>
              <div className="mt-4">
                <Field label="Purpose" dark={dark}>
                  <textarea name="purpose" rows={4} required placeholder="Reason for issue..." title="Purpose" className={inputCls} />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit"
                disabled={isSubmitting}
                onClick={(e) => {
                  if (bucket.length === 0) {
                    e.preventDefault();
                    alert("Bucket is empty! Scan or add items first.");
                  } else if (missingDestinations.length > 0) {
                    e.preventDefault();
                    alert(`Choose a destination for:\n\n${missingDestinations.map((b) => `• ${b.name}`).join("\n")}`);
                  }
                }}
                className={dark
                  ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-8 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                  : "inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d2924] disabled:opacity-60"
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  `Process Issue (${bucket.reduce((acc, b) => acc + b.quantity, 0)} units)`
                )}
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
