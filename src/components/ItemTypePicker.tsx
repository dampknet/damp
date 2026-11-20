"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createItemType } from "@/app/(app)/admin/item-types/actions";
import type { TypeOption } from "@/lib/item-type-registry";

const NEW = "__new__";

// Item type + optional sub-type for one warehouse. Admins also see types/sub-types not used here yet
// (picking one switches it on when the item is saved) and can create new ones on the spot.
export default function ItemTypePicker({
  siteId, options, canManage, typeId, subTypeId, onChange, dark, inputCls,
}: {
  siteId:    string;
  options:   TypeOption[];
  canManage: boolean;
  typeId:    string;
  subTypeId: string;
  onChange:  (typeId: string, subTypeId: string) => void;
  dark:      boolean;
  inputCls:  string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState<"type" | "sub" | null>(null);
  const [name, setName]   = useState("");
  const [code, setCode]   = useState("");
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start]  = useTransition();

  const here    = options.filter((o) => o.enabledHere);
  const notHere = options.filter((o) => !o.enabledHere);
  const current = options.find((o) => o.id === typeId);

  const save = () => start(async () => {
    setError(null);
    const r = await createItemType(creating === "sub"
      ? { name, parentId: typeId, warehouseIds: [siteId] }
      : { name, code, tracked, warehouseIds: [siteId] });
    if (!r.ok || !r.id) { setError(r.message); return; }
    if (creating === "sub") onChange(typeId, r.id); else onChange(r.id, "");
    setCreating(null); setName(""); setCode(""); setTracked(false);
    router.refresh();   // reload the lists with the new type
  });

  // This sits inside the item form: Enter here creates the type, it must not submit the item.
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); if (name.trim() && (creating === "sub" || code.trim())) save(); }
  };

  const label = `mb-1 block text-xs font-medium ${dark ? "text-slate-400" : "text-gray-600"}`;
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="typeId" value={typeId} />
      <input type="hidden" name="subTypeId" value={subTypeId} />

      <div>
        <span className={label}>Item Type</span>
        <select required value={creating === "type" ? NEW : typeId} title="Item Type" className={inputCls}
          onChange={(e) => {
            if (e.target.value === NEW) { setCreating("type"); setError(null); return; }
            setCreating(null); onChange(e.target.value, "");
          }}>
          <option value="" disabled>Choose an item type…</option>
          {here.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
          {canManage && notHere.length > 0 && (
            <optgroup label="Not used in this warehouse yet (switches on when saved)">
              {notHere.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
            </optgroup>
          )}
          {!canManage && notHere.some((o) => o.id === typeId) && (
            <optgroup label="Current type (no longer offered here)">
              {notHere.filter((o) => o.id === typeId).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </optgroup>
          )}
          {canManage && <option value={NEW}>+ New item type…</option>}
        </select>
        {current && !current.enabledHere && canManage && <div className="mt-1 text-[11px] text-amber-600">Will be switched on for this warehouse when you save.</div>}
        {!canManage && here.length === 0 && <div className="mt-1 text-[11px] text-amber-600">No item types are switched on for this warehouse. Ask an admin (Admin → Item Types).</div>}
      </div>

      <div>
        <span className={label}>Sub-type (optional)</span>
        <select value={creating === "sub" ? NEW : subTypeId} title="Sub-type" className={inputCls} disabled={!current || creating === "type"}
          onChange={(e) => {
            if (e.target.value === NEW) { setCreating("sub"); setError(null); return; }
            setCreating(null); onChange(typeId, e.target.value);
          }}>
          <option value="">— None —</option>
          {current?.subTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          {canManage && current && current.otherSubTypes.length > 0 && (
            <optgroup label={`Other ${current.name} sub-types (not used here yet)`}>
              {current.otherSubTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          )}
          {!canManage && current && current.otherSubTypes.some((s) => s.id === subTypeId) && (
            <optgroup label="Current sub-type (no longer offered here)">
              {current.otherSubTypes.filter((s) => s.id === subTypeId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          )}
          {canManage && current && <option value={NEW}>+ New {current.name} sub-type…</option>}
        </select>
        {canManage && current && current.otherSubTypes.some((s) => s.id === subTypeId) && <div className="mt-1 text-[11px] text-amber-600">Will be switched on for this warehouse when you save.</div>}
      </div>

      {creating && (
        <div className={`md:col-span-2 rounded-xl border p-4 ${dark ? "border-sky-500/20 bg-sky-500/5" : "border-sky-200 bg-sky-50/60"}`}>
          <div className={`mb-2 text-sm font-semibold ${dark ? "text-slate-100" : "text-[#1a1814]"}`}>
            {creating === "type" ? "New item type (for this warehouse)" : `New sub-type of ${current?.name}`}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} maxLength={60} autoFocus
              placeholder={creating === "type" ? "e.g. Solar Equipment" : "e.g. Solar Panels"} className={`${inputCls} md:w-64`} />
            {creating === "type" && (
              <>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={onEnter} maxLength={8} placeholder="Short code, e.g. SOL" className={`${inputCls} w-36 font-mono`} />
                <label className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-slate-200" : "text-[#1a1814]"}`}>
                  <input type="checkbox" checked={tracked} onChange={(e) => setTracked(e.target.checked)} className="h-4 w-4 accent-[#1d5fa8]" />
                  Track units one by one
                </label>
              </>
            )}
            <button type="button" onClick={save} disabled={pending || !name.trim() || (creating === "type" && !code.trim())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d5fa8] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {pending && <Loader2 size={13} className="animate-spin" />} Create
            </button>
            <button type="button" onClick={() => { setCreating(null); setError(null); }} className={`text-xs font-semibold ${muted} hover:underline`}>Cancel</button>
          </div>
          <div className={`mt-1.5 text-[11px] ${muted}`}>
            {creating === "type" ? "The short code is used in new item codes here (e.g. PREFIX-SOL-001). Other warehouses can switch it on later." : "Only this warehouse gets it for now; others can switch it on in Admin → Item Types."}
            {" "}If the name already exists, the existing one is used instead of making a copy.
          </div>
          {error && <div className="mt-2 text-xs font-semibold text-red-600">{error}</div>}
        </div>
      )}
    </div>
  );
}
