"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { Download, ArrowLeft, Printer, Trash2, CheckCircle2, Loader2, AlertTriangle, CalendarClock, X } from "lucide-react";
import { changeIssueDate } from "./actions";

type ReceiptRow = {
  issueId:     string;
  lineId:      string | null;   // ✅ null for bulk, set for tracked
  description: string;
  itemCode:    string;
  quantity:    number;
  condition:   string;
  returnable:  boolean;
  destination: string;          // empty for issues made before destinations existed
};

export default function ReceiptClient({
  site, groupId, requesterName, requesterContact,
  authorizedBy, purpose, date, dateInput, enteredOn, canEditDate, rows,
}: {
  site:             { id: string; name: string };
  groupId:          string;
  requesterName:    string;
  requesterContact: string;
  authorizedBy:     string;
  purpose:          string;
  date:             string;
  dateInput:        string;          // YYYY-MM-DD of the issue date
  enteredOn:        string | null;   // set when back-dated: the day it was entered in the system
  canEditDate:      boolean;         // master admins only
  rows:             ReceiptRow[];
}) {
  const { mode } = useThemeMode();
  const dark      = mode === "dark";
  const router    = useRouter();

  const [dateOpen,  setDateOpen]  = useState(false);
  const [newDate,   setNewDate]   = useState(dateInput);
  const [dateMsg,   setDateMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [datePending, startDate]  = useTransition();
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD for the date input "max"

  // The issue went through: the saved draft on the issue page is no longer needed.
  useEffect(() => {
    try { localStorage.removeItem(`kims:issue-draft:${site.id}`); } catch {}
  }, [site.id]);

  const saveDate = () => startDate(async () => {
    const res = await changeIssueDate(groupId, newDate);
    setDateMsg({ ok: res.ok, text: res.message });
    if (res.ok) { setDateOpen(false); router.refresh(); }
  });

  const [downloading,   setDownloading]   = useState(false);
  const [confirming,    setConfirming]    = useState(false);
  const [localRows,     setLocalRows]     = useState<ReceiptRow[]>(rows);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [showConfirm,   setShowConfirm]   = useState(false);

  // ── Download waybill ──────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/store/waybill?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `waybill-${date.replace(/\//g, "-")}-${requesterName.split(" ")[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download waybill. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Delete a single row from preview + DB ─────────────────────────────────
  const handleDeleteRow = async (row: ReceiptRow) => {
    const { issueId, description } = row;
    if (!confirm(`Remove "${description}" from this issue?\nThis will reverse it in the system.`)) return;
    setDeletingId(issueId + (row.lineId ?? ""));
    try {
      const res = await fetch(`/api/store/waybill/delete-issue`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ issueId, lineId: row.lineId }),
      });
      if (res.ok) {
        setLocalRows((prev) => prev.filter((r) => r.issueId !== issueId));
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to remove item.");
      }
    } catch {
      alert("Network error removing item.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Confirm issue — go to issue log with success ──────────────────────────
  const handleConfirm = () => {
    router.push(`/store/sites/${site.id}/issues?success=${encodeURIComponent("Items issued successfully")}`);
  };

  const conditionBadge = (c: string) => {
    if (c === "NEW")    return dark ? "bg-blue-500/10 text-blue-300"   : "bg-blue-50 text-blue-700";
    if (c === "UNUSED") return dark ? "bg-sky-500/10 text-sky-300"     : "bg-sky-50 text-sky-700";
    if (c === "USED")   return dark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700";
    if (c === "FAULTY") return dark ? "bg-red-500/10 text-red-300"     : "bg-red-50 text-red-700";
    return dark ? "bg-slate-500/10 text-slate-400" : "bg-slate-50 text-slate-600";
  };

  const allRemoved = localRows.length === 0;

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">

        {/* ── ACTION BAR ── */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push(`/store/sites/${site.id}`)}
            className={dark
              ? "inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200"
              : "inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:text-[#1a1814]"
            }
          >
            <ArrowLeft size={16} /> Back to {site.name} Inventory
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {canEditDate && (
              <button onClick={() => { setNewDate(dateInput); setDateMsg(null); setDateOpen(true); }}
                className={dark
                  ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                  : "inline-flex items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#f5f2ed]"
                }
              >
                <CalendarClock size={16} /> Change issue date
              </button>
            )}

            <button onClick={() => window.print()}
              className={dark
                ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                : "inline-flex items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#f5f2ed]"
              }
            >
              <Printer size={16} /> Print
            </button>

            <button onClick={handleDownload} disabled={downloading}
              className={dark
                ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2a7d52,#10b981)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                : "inline-flex items-center gap-2 rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              }
            >
              <Download size={16} />
              {downloading ? "Generating…" : "Download Waybill (.docx)"}
            </button>

            {/* ✅ Yes, Issue — confirm and go to issue log */}
            {!allRemoved && (
              <button onClick={() => setShowConfirm(true)}
                className={dark
                  ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-5 py-2 text-sm font-bold text-white hover:opacity-90"
                  : "inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-5 py-2 text-sm font-bold text-white hover:bg-[#2d2924]"
                }
              >
                <CheckCircle2 size={16} /> Yes, Issue
              </button>
            )}
          </div>
        </div>

        {dateMsg && (
          <div className={`no-print mb-4 rounded-2xl border px-4 py-3 text-sm ${
            dateMsg.ok
              ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              : dark ? "border-red-500/20 bg-red-500/10 text-red-300"             : "border-red-200 bg-red-50 text-red-700"
          }`}>{dateMsg.text}</div>
        )}

        {/* ── HINT ── */}
        <div className={dark
          ? "no-print mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300"
          : "no-print mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        }>
          <AlertTriangle size={16} className="shrink-0" />
          Review the items below. Use the <Trash2 size={13} className="inline mx-1" /> button to remove any mistakes before confirming. Click <strong className="mx-1">Yes, Issue</strong> when everything looks correct.
        </div>

        {allRemoved && (
          <div className={dark
            ? "no-print mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
            : "no-print mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          }>
            All items removed. <button onClick={() => router.push(`/store/sites/${site.id}`)} className="underline font-semibold">Go back to inventory</button>
          </div>
        )}

        {/* ── RECEIPT PREVIEW ── */}
        <div className={`print-area overflow-hidden rounded-[28px] border shadow-lg ${
          dark ? "border-white/10 bg-white/5" : "border-[#e0dbd2] bg-white"
        }`}>
          <div className="h-1.5 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]" />

          <div className="p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col items-center gap-1 text-center">
              <div className={dark ? "text-2xl font-bold tracking-tight text-slate-100" : "text-2xl font-bold tracking-tight text-[#1a1814]"}>
                KNET WAYBILL
              </div>
              <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                Issue Receipt — {site.name}
              </div>
            </div>

            {/* Info grid */}
            <div className={`mb-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 ${
              dark ? "border-white/10 bg-white/5" : "border-[#e7dfd4] bg-[#fffdf9]"
            }`}>
              <InfoRow dark={dark} label="NAME"          value={requesterName} />
              <div>
                <InfoRow dark={dark} label="DATE" value={date} />
                {enteredOn && (
                  <div className={`no-print mt-1 text-[11px] font-medium ${dark ? "text-amber-300" : "text-amber-700"}`}>
                    Back-dated · entered in system on {enteredOn}
                  </div>
                )}
              </div>
              <InfoRow dark={dark} label="CONTACT"       value={requesterContact || "—"} />
              <InfoRow dark={dark} label="AUTHORIZED BY" value={authorizedBy || "—"} />
              <div className="col-span-2">
                <InfoRow dark={dark} label="PURPOSE" value={purpose} />
              </div>
              <div className="col-span-2">
                <InfoRow dark={dark} label="DRIVER'S NAME" value="________________________________" />
              </div>
            </div>

            {/* Items table */}
            <div className={`overflow-hidden rounded-2xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
              <table className="w-full text-sm">
                <thead className={dark ? "bg-[#101720] text-slate-400" : "bg-[#f8f4ee] text-[#5b564d]"}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-center font-semibold">Condition</th>
                    <th className="px-4 py-3 text-center font-semibold">Returnable</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                    {/* ✅ Delete column — no-print so it never shows in DOCX/print */}
                    <th className="px-4 py-3 no-print" />
                  </tr>
                </thead>
                <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                  {localRows.map((row, i) => (
                    <tr key={row.issueId} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                      <td className={dark ? "px-4 py-3 text-slate-500" : "px-4 py-3 text-[#6b655d]"}>{i + 1}</td>
                      <td className={dark ? "px-4 py-3 font-medium text-slate-100" : "px-4 py-3 font-medium text-[#1a1814]"}>
                        {row.description}
                      </td>
                      <td className={dark ? "px-4 py-3 font-mono text-xs text-slate-400" : "px-4 py-3 font-mono text-xs text-[#5d584f]"}>
                        {row.itemCode || "—"}
                      </td>
                      <td className={dark ? "px-4 py-3 text-center font-bold text-slate-200" : "px-4 py-3 text-center font-bold text-[#1a1814]"}>
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.condition ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${conditionBadge(row.condition)}`}>
                            {row.condition}
                          </span>
                        ) : <span className={dark ? "text-slate-600" : "text-[#b0a79b]"}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${row.returnable
                          ? dark ? "text-emerald-400" : "text-emerald-700"
                          : dark ? "text-slate-600"   : "text-[#b0a79b]"
                        }`}>
                          {row.returnable ? "Yes" : "No"}
                        </span>
                      </td>
                      {row.destination ? (
                        <td className={dark ? "px-4 py-3 font-medium text-slate-200" : "px-4 py-3 font-medium text-[#1a1814]"}>
                          {row.destination}
                        </td>
                      ) : (
                        <td className={dark ? "px-4 py-3 text-slate-600" : "px-4 py-3 text-[#b0a79b]"}>
                          ___________
                        </td>
                      )}
                      {/* ✅ Delete button — no-print */}
                      <td className="px-3 py-3 no-print">
                        <button
                          onClick={() => handleDeleteRow(row)}
                          disabled={deletingId === row.issueId + (row.lineId ?? "")}
                          title={`Remove ${row.description}`}
                          className={dark
                            ? "rounded-lg p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 transition-colors"
                            : "rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                          }
                        >
                          {deletingId === row.issueId + (row.lineId ?? "")
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* blank rows */}
                  {Array.from({ length: Math.max(0, 10 - localRows.length) }).map((_, i) => (
                    <tr key={`blank-${i}`}>
                      <td className="px-4 py-3">&nbsp;</td>
                      <td className="px-4 py-3" /><td className="px-4 py-3" />
                      <td className="px-4 py-3" /><td className="px-4 py-3" />
                      <td className="px-4 py-3" /><td className="px-4 py-3" />
                      <td className="no-print" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className={`mt-6 grid grid-cols-3 gap-6 rounded-2xl border p-4 text-sm ${
              dark ? "border-white/10 bg-white/5" : "border-[#e7dfd4] bg-[#fffdf9]"
            }`}>
              <FooterField dark={dark} label="RECEIVED BY" />
              <FooterField dark={dark} label="DATE" />
              <FooterField dark={dark} label="SIGNATURE" />
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="no-print mt-6 flex justify-center gap-6">
          <button onClick={() => router.push(`/store/sites/${site.id}/issues`)}
            className={dark ? "text-sm font-medium text-slate-400 hover:underline" : "text-sm font-medium text-[#6f6a62] hover:underline"}>
            View Issue Log →
          </button>
        </div>
      </div>

      {/* ── CONFIRM MODAL ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className={dark
            ? "w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1923] shadow-2xl"
            : "w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white shadow-2xl"
          }>
            <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={24} className={dark ? "text-emerald-400 shrink-0" : "text-emerald-700 shrink-0"} />
                <div>
                  <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>
                    Confirm Issue
                  </div>
                  <div className={dark ? "text-xs text-slate-400" : "text-xs text-[#8b857c]"}>
                    {localRows.length} item{localRows.length !== 1 ? "s" : ""} will be issued to {requesterName}
                  </div>
                </div>
              </div>
              <p className={dark ? "text-sm text-slate-400 mb-5" : "text-sm text-[#6b655d] mb-5"}>
                Everything looks correct? Click <strong>Confirm</strong> to finalise and go to the issue log.
              </p>
              <div className="flex gap-3">
                <button onClick={handleConfirm}
                  className="flex-1 rounded-xl bg-[linear-gradient(135deg,#2a7d52,#10b981)] py-2.5 text-sm font-bold text-white hover:opacity-95">
                  ✓ Confirm & Go to Log
                </button>
                <button onClick={() => setShowConfirm(false)}
                  className={dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                  }>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE ISSUE DATE (master admin) ── */}
      {dateOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !datePending) setDateOpen(false); }}
        >
          <div className={dark
            ? "w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1923] shadow-2xl"
            : "w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white shadow-2xl"
          }>
            <div className="h-1 bg-[linear-gradient(90deg,#b08b2c,#f59e0b)]" />
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>Change issue date</div>
                  <div className={dark ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-[#8b857c]"}>
                    For items issued on a paper waybill before they were in the system. Applies to all {localRows.length} item{localRows.length !== 1 ? "s" : ""} on this waybill.
                  </div>
                </div>
                <button onClick={() => setDateOpen(false)} disabled={datePending} aria-label="Close"
                  className={dark ? "text-slate-500 hover:text-slate-300" : "text-[#9c9890] hover:text-[#1a1814]"}>
                  <X size={18} />
                </button>
              </div>

              <label className={dark ? "mb-1.5 block text-xs font-semibold text-slate-300" : "mb-1.5 block text-xs font-semibold text-[#1a1814]"}>
                Real issue date
              </label>
              <input type="date" value={newDate} max={today} min="2020-01-01" onChange={(e) => setNewDate(e.target.value)}
                className={dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                } />
              <p className={dark ? "mt-2 text-[11px] text-slate-500" : "mt-2 text-[11px] text-[#8b857c]"}>
                The change is recorded in the Activity log (old → new date). The day it was entered in the system is kept and shown on the waybill.
              </p>

              {dateMsg && !dateMsg.ok && (
                <div className={dark ? "mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>
                  {dateMsg.text}
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button onClick={saveDate} disabled={datePending || !newDate || newDate === dateInput}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#b08b2c] py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50">
                  {datePending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save date"}
                </button>
                <button onClick={() => setDateOpen(false)} disabled={datePending}
                  className={dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                  }>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <div>
      <div className={dark ? "text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500" : "text-[10px] font-bold uppercase tracking-[0.1em] text-[#9c9890]"}>{label}</div>
      <div className={dark ? "mt-0.5 text-sm font-semibold text-slate-100" : "mt-0.5 text-sm font-semibold text-[#1a1814]"}>{value}</div>
    </div>
  );
}

function FooterField({ dark, label }: { dark: boolean; label: string }) {
  return (
    <div>
      <div className={dark ? "text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500" : "text-[10px] font-bold uppercase tracking-[0.1em] text-[#9c9890]"}>{label}</div>
      <div className={dark ? "mt-3 border-b border-white/20 pb-1" : "mt-3 border-b border-[#c8c0b6] pb-1"} />
    </div>
  );
}
