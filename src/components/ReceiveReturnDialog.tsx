"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, PackageCheck, X } from "lucide-react";
import { getReturnDetails, receiveReturnAction, type ReturnDetails } from "@/app/(app)/store/returns/actions";

const CONDITIONS = ["NEW", "UNUSED", "USED", "FAULTY"] as const;
type Condition = (typeof CONDITIONS)[number];
const LABEL: Record<Condition, string> = { NEW: "New", UNUSED: "Unused", USED: "Used", FAULTY: "Faulty" };

// Store staff receive leftovers back into stock. The condition defaults to how the item left the store.
export default function ReceiveReturnDialog({
  issueId, dark, onClose, onDone,
}: {
  issueId: string;
  dark:    boolean;
  onClose: () => void;
  onDone:  (message: string) => void;
}) {
  const [d, setD]               = useState<ReturnDetails | null>(null);
  const [loadError, setLoadErr] = useState<string | null>(null);
  const [returnedBy, setBy]     = useState("");
  const [qty, setQty]           = useState(1);
  const [condition, setCond]    = useState<Condition>("NEW");
  const [units, setUnits]       = useState<Record<string, { checked: boolean; condition: Condition }>>({});
  const [note, setNote]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [pending, start]        = useTransition();

  useEffect(() => {
    let cancelled = false;
    getReturnDetails(issueId).then((r) => {
      if (cancelled) return;
      if ("error" in r) { setLoadErr(r.error); return; }
      setD(r);
      setBy(r.takenBy);
      setQty(r.outstanding);
      setCond(r.defaultCondition as Condition);
      setUnits(Object.fromEntries(r.units.map((u) => [u.lineId, { checked: true, condition: u.condition as Condition }])));
    }).catch(() => !cancelled && setLoadErr("Could not load this item."));
    return () => { cancelled = true; };
  }, [issueId]);

  const chosenUnits = Object.entries(units).filter(([, v]) => v.checked);

  const submit = () => start(async () => {
    setError(null);
    if (!d) return;
    const res = await receiveReturnAction(d.tracked
      ? { issueId, returnedBy, note, units: chosenUnits.map(([lineId, v]) => ({ lineId, condition: v.condition })) }
      : { issueId, returnedBy, note, quantity: qty, condition });
    if (res.ok) onDone(res.message);
    else setError(res.message);
  });

  const muted = dark ? "text-slate-400" : "text-[#6b655d]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";
  const input = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";
  const label = `mb-1.5 block text-xs font-semibold ${dark ? "text-slate-300" : "text-[#1a1814]"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div className={`max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] border shadow-2xl ${dark ? "border-white/10 bg-[#0f1923]" : "border-[#e7ded3] bg-white"}`}>
        <div className="h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981)]" />
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className={`flex items-center gap-2 text-base font-bold ${txt}`}><PackageCheck size={18} /> Receive returned items</div>
              {d && (
                <div className={`mt-1 text-xs ${muted}`}>
                  {d.itemName} · issued {d.quantityTaken} {d.unit}
                  {d.quantityUsed != null && ` · used ${d.quantityUsed}`}
                  {d.quantityReturned > 0 && ` · already returned ${d.quantityReturned}`}
                  {d.destination && ` · sent to ${d.destination}`}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className={muted}><X size={18} /></button>
          </div>

          {loadError && <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>}
          {!d && !loadError && <div className={`flex items-center gap-2 py-8 text-sm ${muted}`}><Loader2 size={16} className="animate-spin" /> Loading…</div>}

          {d && d.outstanding < 1 && (
            <div className={`rounded-xl border px-3 py-3 text-sm ${dark ? "border-white/10 text-slate-300" : "border-[#e0dbd2] text-[#4a4740]"}`}>
              Nothing left to return for this item — everything is used or already back.
            </div>
          )}

          {d && d.outstanding > 0 && (
            <div className="space-y-4">
              <div>
                <label className={label}>Brought back by</label>
                <input value={returnedBy} onChange={(e) => setBy(e.target.value)} maxLength={120} className={input} placeholder="Name of the person returning them" />
              </div>

              {d.tracked ? (
                <div>
                  <label className={label}>Which units came back? ({chosenUnits.length} of {d.units.length})</label>
                  <div className={`divide-y rounded-xl border ${dark ? "divide-white/8 border-white/10" : "divide-[#eee7dd] border-[#e0dbd2]"}`}>
                    {d.units.map((u) => {
                      const v = units[u.lineId];
                      return (
                        <div key={u.lineId} className="flex items-center gap-3 px-3 py-2">
                          <input type="checkbox" checked={!!v?.checked} aria-label={`Returned ${u.entityCode}`}
                            onChange={(e) => setUnits((p) => ({ ...p, [u.lineId]: { ...p[u.lineId], checked: e.target.checked } }))}
                            className="h-4 w-4 accent-emerald-600" />
                          <span className={`flex-1 font-mono text-xs ${txt}`}>{u.entityCode}</span>
                          <select value={v?.condition} disabled={!v?.checked} aria-label={`Condition of ${u.entityCode}`}
                            onChange={(e) => setUnits((p) => ({ ...p, [u.lineId]: { ...p[u.lineId], condition: e.target.value as Condition } }))}
                            className={`rounded-lg border px-2 py-1 text-xs disabled:opacity-40 ${dark ? "border-white/10 bg-[#101720] text-slate-100" : "border-[#ddd5c9] bg-white"}`}>
                            {CONDITIONS.map((c) => <option key={c} value={c}>{LABEL[c]}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Quantity back (max {d.outstanding})</label>
                    <input type="number" min={1} max={d.outstanding} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={input} />
                  </div>
                  <div>
                    <label className={label}>Condition</label>
                    <select value={condition} onChange={(e) => setCond(e.target.value as Condition)} className={input}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{LABEL[c]}{c === d.defaultCondition ? " (as issued)" : ""}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <p className={`text-[11px] ${muted}`}>
                Condition starts as it was when issued. Change it only if something came back different (e.g. Faulty) — it then goes to a separate stock line with that condition.
              </p>

              <div>
                <label className={label}>Note (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={input} placeholder="e.g. Leftover after installation" />
              </div>

              {error && <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>{error}</div>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} disabled={pending}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${dark ? "border-white/10 text-slate-200" : "border-[#ddd5c9] text-[#1a1814]"}`}>
                  Cancel
                </button>
                <button type="button" onClick={submit}
                  disabled={pending || !returnedBy.trim() || (d.tracked ? chosenUnits.length === 0 : !(qty >= 1 && qty <= d.outstanding))}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {pending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Receive into stock"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
