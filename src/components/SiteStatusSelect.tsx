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
    ? `${base} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${base} border-red-200 bg-red-50 text-red-700`;
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
          className="rounded-md border bg-white px-2 py-1 text-xs"
          aria-label="Update site status"
          title="Update site status"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DOWN">DOWN</option>
        </select>
      </div>

      {open ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e0dbd2] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1a1814]">
              Change Site Status
            </h3>

            <p className="mt-2 text-sm text-[#6f6a62]">
              You are changing this site to{" "}
              <span className="font-semibold text-[#1a1814]">
                {pendingStatus}
              </span>
              . Please provide a reason.
            </p>

            <div className="mt-4">
              <label
                htmlFor="site-status-reason"
                className="mb-1 block text-sm font-medium text-[#4f4a43]"
              >
                Reason
              </label>
              <textarea
                id="site-status-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                autoFocus
                placeholder={
                  pendingStatus === "DOWN"
                    ? "e.g. faulty maintenance, power outage, transmitter issue..."
                    : "e.g. maintenance completed, power restored..."
                }
                className="w-full rounded-xl border border-[#d9d3c8] px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[#d9d3c8] bg-white px-4 py-2 text-sm font-medium text-[#4f4a43] hover:bg-[#f8f4ee]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmChange}
                className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}