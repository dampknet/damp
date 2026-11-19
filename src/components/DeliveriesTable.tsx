"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, FileText, Loader2, PackageCheck, Undo2, X } from "lucide-react";
import { confirmDeliveries, type ConfirmItem } from "@/app/(app)/store/deliveries/actions";
import ReceiveReturnDialog from "@/components/ReceiveReturnDialog";
import type { DeliveryRow } from "@/lib/deliveries";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function DeliveriesTable({
  rows, dark, canConfirm, canReceive = false, showSite, emptyText,
}: {
  rows:        DeliveryRow[];
  dark:        boolean;
  canConfirm:  boolean;   // master admins: confirm delivery + quantity used
  canReceive?: boolean;   // admins/editors: receive unused items back into stock
  showSite:    boolean;
  emptyText:   string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog,   setDialog]   = useState(false);
  const [note,     setNote]     = useState("");
  const [usedQty,  setUsedQty]  = useState<Record<string, number>>({});
  const [usedUnits, setUsedUnits] = useState<Record<string, Set<string>>>({});
  const [backNow,  setBackNow]  = useState(false);
  const [returnedBy, setReturnedBy] = useState("");
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [message,  setMessage]  = useState<{ ok: boolean; text: string } | null>(null);
  const [pending,  start]       = useTransition();

  const pendingIds = useMemo(() => rows.filter((r) => r.status === "PENDING").map((r) => r.id), [rows]);
  const allChecked = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const chosen     = rows.filter((r) => selected.has(r.id));

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Open the confirm window with "everything used" as the starting point.
  const openConfirm = () => {
    setMessage(null);
    setUsedQty(Object.fromEntries(chosen.map((r) => [r.id, r.stillOut])));
    setUsedUnits(Object.fromEntries(chosen.map((r) => [r.id, new Set(r.openUnits.map((u) => u.lineId))])));
    setBackNow(false);
    setReturnedBy("");
    setDialog(true);
  };

  const usedOf    = (r: DeliveryRow) => (r.tracked ? usedUnits[r.id]?.size ?? 0 : usedQty[r.id] ?? r.stillOut);
  const leftovers = chosen.reduce((s, r) => s + Math.max(0, r.stillOut - usedOf(r)), 0);
  const invalid   = chosen.some((r) => !r.tracked && !(usedOf(r) >= 0 && usedOf(r) <= r.stillOut && Number.isInteger(usedOf(r))));

  const submit = () => start(async () => {
    const items: ConfirmItem[] = chosen.map((r) => r.tracked
      ? { id: r.id, usedLineIds: [...(usedUnits[r.id] ?? [])] }
      : { id: r.id, used: usedOf(r) });
    const res = await confirmDeliveries(items, note, backNow && leftovers > 0, returnedBy);
    setMessage({ ok: res.ok, text: res.message });
    setSelected(new Set());
    setNote("");
    setDialog(false);
    router.refresh();
  });

  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";
  const cols  = 8 + (showSite ? 1 : 0) + (canConfirm ? 1 : 0);
  const pill  = (cls: string) => `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${cls}`;

  return (
    <div>
      {message && (
        <div className={`mb-3 rounded-xl border px-4 py-2.5 text-sm ${
          message.ok
            ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            : dark ? "border-red-500/20 bg-red-500/10 text-red-300"             : "border-red-200 bg-red-50 text-red-700"
        }`}>{message.text}</div>
      )}

      {canConfirm && pendingIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={selected.size === 0} onClick={openConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
            <CheckCircle2 size={15} /> Confirm delivered{selected.size ? ` (${selected.size})` : ""}
          </button>
          <span className={`text-xs ${muted}`}>Tick the items the engineers have reported on. You'll enter how many were used.</span>
        </div>
      )}

      <div className={`overflow-x-auto rounded-2xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className={dark ? "bg-[#101720] text-left text-slate-400" : "bg-[#f8f4ee] text-left text-[#5b564d]"}>
            <tr>
              {canConfirm && (
                <th className="w-10 px-4 py-3">
                  {pendingIds.length > 0 && (
                    <input type="checkbox" checked={allChecked} aria-label="Select all pending"
                      onChange={() => setSelected(allChecked ? new Set() : new Set(pendingIds))}
                      className="h-4 w-4 accent-emerald-600" />
                  )}
                </th>
              )}
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 text-center font-semibold">Qty</th>
              {showSite && <th className="px-4 py-3 font-semibold">Destination</th>}
              <th className="px-4 py-3 font-semibold">From</th>
              <th className="px-4 py-3 font-semibold">Taken by</th>
              <th className="px-4 py-3 font-semibold">Issued</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Waybill</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {rows.length === 0 ? (
              <tr><td colSpan={cols} className={`px-4 py-10 text-center ${muted}`}>{emptyText}</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                {canConfirm && (
                  <td className="px-4 py-3">
                    {r.status === "PENDING" && (
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.itemName}`} className="h-4 w-4 accent-emerald-600" />
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className={`font-semibold [overflow-wrap:anywhere] ${txt}`}>{r.itemName}</div>
                  <div className={`mt-0.5 font-mono text-[11px] [overflow-wrap:anywhere] ${muted}`}>
                    {r.entityCodes.length ? r.entityCodes.join(", ") : r.itemCode ?? ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className={`font-bold ${txt}`}>{r.quantity} <span className={`text-[11px] font-normal ${muted}`}>{r.unit || "pcs"}</span></div>
                  {(r.quantityUsed != null || r.quantityReturned > 0) && (
                    <div className={`mt-0.5 whitespace-nowrap text-[11px] ${muted}`}>
                      {r.quantityUsed != null && `used ${r.quantityUsed}`}
                      {r.quantityUsed != null && r.quantityReturned > 0 && " · "}
                      {r.quantityReturned > 0 && `returned ${r.quantityReturned}`}
                    </div>
                  )}
                </td>
                {showSite && (
                  <td className="px-4 py-3">
                    {r.siteId ? (
                      <Link href={`/sites/${r.siteId}/store`} className={`font-semibold hover:underline ${dark ? "text-sky-400" : "text-[#1d5fa8]"}`}>{r.siteName}</Link>
                    ) : (
                      <span className="flex flex-col items-start gap-0.5">
                        <Link href={`/store/deliveries?place=${encodeURIComponent(r.siteName)}`} className={`font-semibold hover:underline ${txt}`}>{r.siteName}</Link>
                        <span className={`rounded-full border px-1.5 text-[9px] font-bold uppercase ${dark ? "border-white/10 text-slate-400" : "border-[#e0dbd2] text-[#8b857c]"}`}>Other place</span>
                      </span>
                    )}
                  </td>
                )}
                <td className={`px-4 py-3 ${txt}`}>{r.warehouseName}</td>
                <td className={`px-4 py-3 ${txt}`}>
                  <div>{r.takenBy}</div>
                  <div className={`mt-0.5 line-clamp-1 text-[11px] ${muted}`} title={r.purpose}>{r.purpose}</div>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 ${muted}`} suppressHydrationWarning>{fmtDate(r.takenAt)}</td>
                <td className="px-4 py-3">
                  {r.status === "PENDING" && (
                    <span className={pill(r.daysWaiting >= 14
                      ? dark ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"
                      : dark ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700")}>
                      <Clock size={11} /> Pending · {r.daysWaiting === 0 ? "today" : `${r.daysWaiting}d`}
                    </span>
                  )}
                  {r.status === "RETURNED" && (
                    <span className={pill(dark ? "border-sky-500/30 bg-sky-500/10 text-sky-300" : "border-sky-200 bg-sky-50 text-sky-700")}>
                      <Undo2 size={11} /> All returned
                    </span>
                  )}
                  {r.status === "DELIVERED" && (
                    <div>
                      <span className={pill(dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                        <CheckCircle2 size={11} /> Delivered
                      </span>
                      {r.awaitingReturn > 0 && (
                        <span className={`ml-1 ${pill(dark ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-violet-200 bg-violet-50 text-violet-700")}`}>
                          {r.awaitingReturn} awaiting return
                        </span>
                      )}
                      <div className={`mt-1 text-[11px] ${muted}`} suppressHydrationWarning>
                        {r.deliveredAt ? fmtDate(r.deliveredAt) : ""}{r.deliveredBy ? ` · ${r.deliveredBy}` : ""}
                      </div>
                      {r.deliveryNote && <div className={`mt-0.5 max-w-56 text-[11px] italic [overflow-wrap:anywhere] ${muted}`}>“{r.deliveryNote}”</div>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.groupId && (
                    <Link href={`/store/sites/${r.warehouseId}/issue/receipt?groupId=${r.groupId}`} title="Open waybill"
                      className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${dark ? "text-sky-400" : "text-[#1d5fa8]"}`}>
                      <FileText size={13} /> View
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {canReceive && r.awaitingReturn > 0 && (
                    <button type="button" onClick={() => { setMessage(null); setReceiveId(r.id); }}
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}>
                      <PackageCheck size={13} /> Receive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receiveId && (
        <ReceiveReturnDialog issueId={receiveId} dark={dark}
          onClose={() => setReceiveId(null)}
          onDone={(msg) => { setReceiveId(null); setMessage({ ok: true, text: msg }); router.refresh(); }} />
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !pending) setDialog(false); }}>
          <div className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl ${dark ? "border-white/10 bg-[#101720]" : "border-[#e0dbd2] bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`text-base font-semibold ${txt}`}>Confirm {chosen.length} item{chosen.length === 1 ? "" : "s"} delivered</h2>
                <p className={`mt-1 text-xs ${muted}`}>Enter how many were actually used. Anything not used becomes “awaiting return” until the store receives it back.</p>
              </div>
              <button type="button" onClick={() => setDialog(false)} disabled={pending} aria-label="Close" className={muted}><X size={18} /></button>
            </div>

            <div className={`mt-4 divide-y rounded-xl border ${dark ? "divide-white/8 border-white/10" : "divide-[#eee7dd] border-[#e0dbd2]"}`}>
              {chosen.map((r) => (
                <div key={r.id} className="px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold [overflow-wrap:anywhere] ${txt}`}>{r.itemName}</div>
                      <div className={`text-[11px] ${muted}`}>Sent {r.stillOut} {r.unit || "pcs"} to {r.siteName}</div>
                    </div>
                    {!r.tracked && (
                      <label className={`flex shrink-0 items-center gap-2 text-xs font-semibold ${muted}`}>
                        Used
                        <input type="number" min={0} max={r.stillOut} value={usedQty[r.id] ?? r.stillOut}
                          onChange={(e) => setUsedQty((p) => ({ ...p, [r.id]: Number(e.target.value) }))}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm font-bold ${dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white text-[#1a1814]"}`} />
                        of {r.stillOut}
                      </label>
                    )}
                  </div>
                  {r.tracked && (
                    <div className="mt-2">
                      <div className={`mb-1 text-[11px] font-semibold ${muted}`}>Tick the units that were installed / used ({usedUnits[r.id]?.size ?? 0} of {r.openUnits.length}):</div>
                      <div className="flex flex-wrap gap-2">
                        {r.openUnits.map((u) => {
                          const on = usedUnits[r.id]?.has(u.lineId) ?? false;
                          return (
                            <label key={u.lineId} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[11px] ${
                              on ? dark ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800"
                                 : dark ? "border-white/10 text-slate-400" : "border-[#e0dbd2] text-[#6b655d]"
                            }`}>
                              <input type="checkbox" checked={on} className="h-3.5 w-3.5 accent-emerald-600"
                                onChange={() => setUsedUnits((p) => {
                                  const s = new Set(p[r.id] ?? []);
                                  if (s.has(u.lineId)) s.delete(u.lineId); else s.add(u.lineId);
                                  return { ...p, [r.id]: s };
                                })} />
                              {u.entityCode}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {r.stillOut - usedOf(r) > 0 && (
                    <div className={`mt-1.5 text-[11px] font-semibold ${dark ? "text-violet-300" : "text-violet-700"}`}>
                      {r.stillOut - usedOf(r)} not used → to come back to the store
                    </div>
                  )}
                </div>
              ))}
            </div>

            {leftovers > 0 && (
              <div className={`mt-3 rounded-xl border px-3 py-3 ${dark ? "border-violet-500/20 bg-violet-500/5" : "border-violet-200 bg-violet-50/60"}`}>
                <label className={`flex cursor-pointer items-start gap-2 text-sm font-semibold ${txt}`}>
                  <input type="checkbox" checked={backNow} onChange={(e) => setBackNow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-600" />
                  <span>
                    The engineer already brought the {leftovers} unused unit{leftovers === 1 ? "" : "s"} back — put {leftovers === 1 ? "it" : "them"} in stock now
                    <span className={`block text-[11px] font-normal ${muted}`}>Same condition as when issued. Leave unticked if they're still at the site.</span>
                  </span>
                </label>
                {backNow && (
                  <input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} maxLength={120}
                    placeholder="Brought back by (leave blank = the person who took them)"
                    className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white"}`} />
                )}
              </div>
            )}

            <label className={`mt-4 block text-xs font-semibold ${muted}`}>Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
              placeholder="e.g. Installed by Kofi on rack 2"
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white"}`} />

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setDialog(false)} disabled={pending}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${dark ? "border-white/10 text-slate-200" : "border-[#ddd5c9] text-[#1a1814]"}`}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={pending || invalid}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {pending ? <><Loader2 size={14} className="animate-spin" /> Confirming…</> : "Confirm delivered"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
