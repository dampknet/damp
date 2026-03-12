"use client";

import * as React from "react";
import type { SiteStatus } from "@prisma/client";

type Props = {
  siteId: string;
  initialStatus: SiteStatus;
  canEdit?: boolean;
};

function badgeClass(status: SiteStatus) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  return status === "ACTIVE"
    ? `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300`
    : `${base} border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300`;
}

export default function SiteStatusSelect({
  siteId,
  initialStatus,
  canEdit = true,
}: Props) {
  const [status, setStatus] = React.useState<SiteStatus>(initialStatus);
  const [saving, setSaving] = React.useState(false);

  const [pendingStatus, setPendingStatus] = React.useState<SiteStatus | null>(null);
  const [reason, setReason] = React.useState("");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function onPick(next: SiteStatus) {
    if (next === status) return;
    setPendingStatus(next);
    setReason("");
    setOpen(true);
  }

  async function confirmChange() {
    if (!pendingStatus) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      window.alert("Reason is required.");
      return;
    }

    const prev = status;
    setStatus(pendingStatus);
    setSaving(true);
    setOpen(false);

    try {
      const res = await fetch("/sites/api/site-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          status: pendingStatus,
          reason: trimmedReason,
        }),
      });

      if (!res.ok) {
        setStatus(prev);
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Failed to update site status.");
      }
    } catch {
      setStatus(prev);
      window.alert("Failed to update site status.");
    } finally {
      setSaving(false);
      setPendingStatus(null);
      setReason("");
    }
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setPendingStatus(null);
    setReason("");
  }

  if (!canEdit) {
    return <span className={badgeClass(status)}>{status}</span>;
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <span className={badgeClass(status)}>{status}</span>

        <select
          value={status}
          onChange={(e) => onPick(e.target.value as SiteStatus)}
          disabled={saving}
          className="rounded-md border bg-white px-2 py-1 text-xs text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          aria-label="Update site status"
          title="Update site status"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DOWN">DOWN</option>
        </select>
      </div>

      {open ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#e7dfd4] bg-white shadow-2xl dark:border-white/10 dark:bg-[#101720] dark:backdrop-blur-xl">
            <div className="border-b border-[#efe7dc] bg-[#fcf8f2] px-6 py-5 dark:border-white/8 dark:bg-white/5">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    pendingStatus === "DOWN"
                      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  }`}
                >
                  <span className="text-lg font-bold">
                    {pendingStatus === "DOWN" ? "!" : "✓"}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-[#1a1814] dark:text-slate-100">
                    Change Site Status
                  </h3>
                  <p className="mt-1 text-sm text-[#6f6a62] dark:text-slate-400">
                    You are about to mark this site as{" "}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pendingStatus === "DOWN"
                          ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      }`}
                    >
                      {pendingStatus}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-2xl border border-[#eee6db] bg-[#faf7f2] px-4 py-3 dark:border-white/8 dark:bg-white/5">
                <div className="text-sm font-medium text-[#4f4a43] dark:text-slate-300">
                  Add a clear reason for this change.
                </div>
                <div className="mt-1 text-xs text-[#8b857c] dark:text-slate-500">
                  This will appear in recent activity on the dashboard.
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="site-status-reason"
                  className="mb-2 block text-sm font-semibold text-[#2c2823] dark:text-slate-200"
                >
                  Reason
                </label>

                <textarea
                  id="site-status-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={5}
                  autoFocus
                  placeholder={
                    pendingStatus === "DOWN"
                      ? "e.g. Site down due to faulty maintenance, power outage, transmitter issue..."
                      : "e.g. Site restored after maintenance completed, power returned..."
                  }
                  className="w-full rounded-2xl border border-[#d9d3c8] bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a1814] focus:ring-2 focus:ring-[#1a1814]/5 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#efe7dc] bg-[#fcf8f2] px-6 py-4 dark:border-white/8 dark:bg-white/5">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[#d9d3c8] bg-white px-4 py-2 text-sm font-medium text-[#4f4a43] transition hover:bg-[#f8f4ee] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmChange}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                  pendingStatus === "DOWN"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#1a1814] hover:bg-black dark:bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] dark:hover:opacity-95"
                }`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}