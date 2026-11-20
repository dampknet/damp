"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Loader2, Pencil, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import { createItemType, renameItemType, setTracked, setWarehouseType, deleteItemType } from "./actions";

type Warehouse = { id: string; name: string };
export type MainTypeView = {
  id: string; name: string; original: boolean; tracked: boolean; defaultCode: string; items: number;
  warehouses: { warehouseId: string; enabled: boolean; code: string; items: number; matching: number; otherCodes: { code: string; count: number }[] }[];
  subTypes: { id: string; name: string; items: number; warehouses: { warehouseId: string; enabled: boolean }[] }[];
};

export default function ItemTypesClient({ warehouses, mains, clashes }: { warehouses: Warehouse[]; mains: MainTypeView[]; clashes: string[] }) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();
  const [msg, setMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start]     = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => {
    const r = await fn();
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) router.refresh();
  });

  const card  = dark ? "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-3xl border border-[#e0dbd2] bg-white shadow-sm";
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";
  const input = dark ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none" : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm outline-none";
  const btn   = dark ? "inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-40"
                     : "inline-flex items-center gap-1.5 rounded-xl border border-[#ddd5c9] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1814] hover:bg-[#faf7f2] disabled:opacity-40";
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "";

  // New main type form
  const [nName, setNName] = useState("");
  const [nCode, setNCode] = useState("");
  const [nTracked, setNTracked] = useState(false);
  const [nWh, setNWh] = useState<Set<string>>(new Set());

  return (
    <div className={dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <section className={`${card} relative overflow-hidden p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
          <Link href="/admin" className={`mb-4 inline-flex items-center gap-2 text-sm font-medium ${muted} hover:underline`}><ArrowLeft size={16} /> Back to Admin</Link>
          <h1 className={`flex items-center gap-2 text-2xl font-semibold tracking-tight ${txt}`}><Layers size={22} /> Item Types</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Item types and their optional sub-types, which warehouses use them, and each warehouse&apos;s short code
            (used in new item codes like <span className="font-mono">KANDA-EQUIP-001</span>). Short codes for the original types were
            filled in from your existing item codes — please check them below. Changing a code only affects <b>new</b> item codes.
          </p>
          {clashes.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div><b>Same short code used twice in one warehouse</b> — change one of them:<ul className="mt-1 list-disc pl-5">{clashes.map((c) => <li key={c}>{c}</li>)}</ul></div>
            </div>
          )}
        </section>

        {msg && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${msg.ok
            ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            : dark ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>
        )}

        {/* New item type */}
        <section className={`${card} mt-5 p-5`}>
          <div className={`mb-3 text-sm font-bold ${txt}`}>Add an item type</div>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Name, e.g. Solar Equipment" maxLength={60} className={input} />
            <input value={nCode} onChange={(e) => setNCode(e.target.value.toUpperCase())} placeholder="Short code, e.g. SOL" maxLength={8} className={`${input} font-mono`} />
            <label className={`flex items-center gap-2 text-xs font-semibold ${txt}`}>
              <input type="checkbox" checked={nTracked} onChange={(e) => setNTracked(e.target.checked)} className="h-4 w-4 accent-[#1d5fa8]" />
              Track units one by one (like Equipment)
            </label>
          </div>
          <div className={`mt-3 text-xs font-semibold ${muted}`}>Used in these warehouses:</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {warehouses.map((w) => (
              <label key={w.id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${nWh.has(w.id) ? "border-[#1d5fa8] bg-[#e8f0fb] text-[#1d5fa8]" : dark ? "border-white/10 text-slate-300" : "border-[#e0dbd2] text-[#4a4740]"}`}>
                <input type="checkbox" checked={nWh.has(w.id)} className="h-3.5 w-3.5 accent-[#1d5fa8]"
                  onChange={() => setNWh((p) => { const s = new Set(p); if (s.has(w.id)) s.delete(w.id); else s.add(w.id); return s; })} />
                {w.name}
              </label>
            ))}
          </div>
          <button type="button" disabled={busy || !nName.trim() || !nCode.trim()} className={`${btn} mt-3`}
            onClick={() => run(async () => {
              const r = await createItemType({ name: nName, code: nCode, tracked: nTracked, warehouseIds: [...nWh] });
              if (r.ok) { setNName(""); setNCode(""); setNTracked(false); setNWh(new Set()); }
              return r;
            })}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create item type
          </button>
        </section>

        <div className="mt-5 space-y-5">
          {mains.map((m) => <MainTypeCard key={`${m.id}:${m.warehouses.map((w) => w.code).join(",")}`} m={m} dark={dark} busy={busy} run={run} warehouses={warehouses} whName={whName} card={card} muted={muted} txt={txt} input={input} btn={btn} />)}
        </div>
      </div>
    </div>
  );
}

function MainTypeCard({ m, dark, busy, run, warehouses, whName, card, muted, txt, input, btn }: {
  m: MainTypeView; dark: boolean; busy: boolean; run: (fn: () => Promise<{ ok: boolean; message: string }>) => void;
  warehouses: Warehouse[]; whName: (id: string) => string; card: string; muted: string; txt: string; input: string; btn: string;
}) {
  const [codes, setCodes] = useState<Record<string, string>>(Object.fromEntries(m.warehouses.map((w) => [w.warehouseId, w.code])));
  const [subName, setSubName] = useState("");
  const [subWh, setSubWh]     = useState<Set<string>>(new Set());
  const onHere = m.warehouses.filter((w) => w.enabled).map((w) => w.warehouseId);

  const rename = (id: string, current: string) => {
    const name = prompt("New name", current);
    if (name && name.trim() && name.trim() !== current) run(() => renameItemType(id, name));
  };
  const remove = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This only works when no item uses it.`)) run(() => deleteItemType(id));
  };

  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`text-lg font-semibold ${txt}`}>{m.name}</div>
        {m.original && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${dark ? "border-white/10 text-slate-400" : "border-[#e0dbd2] text-[#8b857c]"}`}>Original</span>}
        <span className={`text-xs ${muted}`}>{m.items} item{m.items === 1 ? "" : "s"}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className={`flex items-center gap-1.5 text-xs font-semibold ${txt}`}>
            <input type="checkbox" checked={m.tracked} disabled={busy} onChange={(e) => run(() => setTracked(m.id, e.target.checked))} className="h-4 w-4 accent-[#1d5fa8]" />
            Track units one by one
          </label>
          <button type="button" className={btn} disabled={busy} onClick={() => rename(m.id, m.name)}><Pencil size={12} /> Rename</button>
          {!m.original && <button type="button" className={btn} disabled={busy || m.items > 0} onClick={() => remove(m.id, m.name)}><Trash2 size={12} /> Delete</button>}
        </div>
      </div>

      <div className={`mt-4 overflow-x-auto rounded-2xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className={dark ? "bg-[#101720] text-left text-slate-400" : "bg-[#f8f4ee] text-left text-[#5b564d]"}>
            <tr><th className="px-4 py-2.5 font-semibold">Warehouse</th><th className="px-4 py-2.5 font-semibold">Used here</th><th className="px-4 py-2.5 font-semibold">Short code</th><th className="px-4 py-2.5 font-semibold">Items</th><th className="px-4 py-2.5 font-semibold">Check</th></tr>
          </thead>
          <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {m.warehouses.map((w) => (
              <tr key={w.warehouseId}>
                <td className={`px-4 py-2.5 font-medium ${txt}`}>{whName(w.warehouseId)}</td>
                <td className="px-4 py-2.5">
                  <button type="button" role="switch" aria-checked={w.enabled} disabled={busy}
                    aria-label={`${m.name} used in ${whName(w.warehouseId)}`}
                    onClick={() => run(() => setWarehouseType(w.warehouseId, m.id, { enabled: !w.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${w.enabled ? "bg-emerald-500" : "bg-slate-400/50"}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${w.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <input value={codes[w.warehouseId] ?? ""} maxLength={8} aria-label={`Short code in ${whName(w.warehouseId)}`}
                      onChange={(e) => setCodes((p) => ({ ...p, [w.warehouseId]: e.target.value.toUpperCase() }))}
                      className={`${input} w-28 font-mono`} />
                    {(codes[w.warehouseId] ?? "") !== w.code && (
                      <button type="button" className={btn} disabled={busy || !codes[w.warehouseId]}
                        onClick={() => run(() => setWarehouseType(w.warehouseId, m.id, { code: codes[w.warehouseId] }))}>Save</button>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-2.5 ${muted}`}>{w.items}</td>
                <td className="px-4 py-2.5 text-xs">
                  {w.otherCodes.length > 0
                    ? <span className="text-amber-600">⚠ {w.otherCodes.map((o) => `${o.count} use ${o.code}`).join(", ")}{w.matching ? ` · ${w.matching} use ${w.code}` : ""}</span>
                    : w.items > 0
                      ? <span className="text-emerald-600">✓ matches existing item codes</span>
                      : <span className={muted}>{w.enabled ? "no items yet" : "—"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sub-types */}
      <div className="mt-4">
        <div className={`text-sm font-bold ${txt}`}>Sub-types <span className={`text-xs font-normal ${muted}`}>(optional — shown only in the warehouses ticked for each)</span></div>
        {m.subTypes.length === 0 && <div className={`mt-1 text-xs ${muted}`}>No sub-types yet.</div>}
        <div className="mt-2 space-y-2">
          {m.subTypes.map((s) => (
            <div key={s.id} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${dark ? "border-white/10" : "border-[#eee7dd]"}`}>
              <span className={`text-sm font-semibold ${txt}`}>{s.name}</span>
              <span className={`text-xs ${muted}`}>{s.items} item{s.items === 1 ? "" : "s"}</span>
              <div className="flex flex-wrap gap-1.5">
                {s.warehouses.filter((w) => onHere.includes(w.warehouseId) || w.enabled).map((w) => (
                  <button key={w.warehouseId} type="button" disabled={busy}
                    onClick={() => run(() => setWarehouseType(w.warehouseId, s.id, { enabled: !w.enabled }))}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${w.enabled ? "border-emerald-400 bg-emerald-50 text-emerald-700" : dark ? "border-white/10 text-slate-500" : "border-[#e0dbd2] text-[#9c9890]"}`}>
                    {w.enabled ? "✓ " : ""}{whName(w.warehouseId)}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-1.5">
                <button type="button" className={btn} disabled={busy} onClick={() => rename(s.id, s.name)}><Pencil size={12} /></button>
                <button type="button" className={btn} disabled={busy || s.items > 0} onClick={() => remove(s.id, s.name)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        {onHere.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder={`New ${m.name} sub-type`} maxLength={60} className={`${input} w-60`} />
            {onHere.map((id) => (
              <label key={id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${subWh.has(id) ? "border-[#1d5fa8] bg-[#e8f0fb] text-[#1d5fa8]" : dark ? "border-white/10 text-slate-300" : "border-[#e0dbd2] text-[#4a4740]"}`}>
                <input type="checkbox" checked={subWh.has(id)} className="h-3.5 w-3.5 accent-[#1d5fa8]"
                  onChange={() => setSubWh((p) => { const x = new Set(p); if (x.has(id)) x.delete(id); else x.add(id); return x; })} />
                {whName(id)}
              </label>
            ))}
            <button type="button" className={btn} disabled={busy || !subName.trim() || subWh.size === 0}
              onClick={() => run(async () => {
                const r = await createItemType({ name: subName, parentId: m.id, warehouseIds: [...subWh] });
                if (r.ok) { setSubName(""); setSubWh(new Set()); }
                return r;
              })}><Plus size={12} /> Add sub-type</button>
          </div>
        )}
      </div>
    </section>
  );
}
