"use client";

import * as React from "react";
import type { SiteStatus } from "@prisma/client";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  siteId: string;
  initialStatus: SiteStatus;
  canEdit?: boolean;
};

function badgeClass(status: SiteStatus, dark: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  return status === "ACTIVE"
    ? dark
      ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
      : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`
    : dark
    ? `${base} border-red-500/30 bg-red-500/10 text-red-300`
    : `${base} border-red-200 bg-red-50 text-red-700`;
}

export default function SiteStatusSelect({
  siteId,
  initialStatus,
  canEdit = true,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

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
    return <span className={badgeClass(status, dark)}>{status}</span>;
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <span className={badgeClass(status, dark)}>{status}</span>

        <select
          value={status}
          onChange={(e) => onPick(e.target.value as SiteStatus)}
          disabled={saving}
          className={
            dark
              ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
              : "rounded-md border bg-white px-2 py-1 text-xs"
          }
          aria-label="Update site status"
          title="Update site status"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DOWN">DOWN</option>
        </select>
      </div>

      {open ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4 py-6">
          <div
            className={
              dark
                ? "w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#101720] shadow-2xl"
                : "w-full max-w-lg overflow-hidden rounded-3xl border border-[#e7dfd4] bg-white shadow-2xl"
            }
          >
            <div
              className={
                dark
                  ? "border-b border-white/10 bg-white/5 px-6 py-5"
                  : "border-b border-[#efe7dc] bg-[#fcf8f2] px-6 py-5"
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    pendingStatus === "DOWN"
                      ? dark
                        ? "bg-red-500/10 text-red-300"
                        : "bg-red-50 text-red-700"
                      : dark
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span className="text-lg font-bold">
                    {pendingStatus === "DOWN" ? "!" : "✓"}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3
                    className={
                      dark
                        ? "text-lg font-semibold tracking-tight text-slate-100"
                        : "text-lg font-semibold tracking-tight text-[#1a1814]"
                    }
                  >
                    Change Site Status
                  </h3>
                  <p
                    className={
                      dark
                        ? "mt-1 text-sm text-slate-400"
                        : "mt-1 text-sm text-[#6f6a62]"
                    }
                  >
                    You are about to mark this site as{" "}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pendingStatus === "DOWN"
                          ? dark
                            ? "bg-red-500/10 text-red-300"
                            : "bg-red-50 text-red-700"
                          : dark
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {pendingStatus}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div
                className={
                  dark
                    ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    : "rounded-2xl border border-[#eee6db] bg-[#faf7f2] px-4 py-3"
                }
              >
                <div
                  className={
                    dark
                      ? "text-sm font-medium text-slate-300"
                      : "text-sm font-medium text-[#4f4a43]"
                  }
                >
                  Add a clear reason for this change.
                </div>
                <div
                  className={
                    dark
                      ? "mt-1 text-xs text-slate-500"
                      : "mt-1 text-xs text-[#8b857c]"
                  }
                >
                  This will appear in recent activity on the dashboard.
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="site-status-reason"
                  className={
                    dark
                      ? "mb-2 block text-sm font-semibold text-slate-200"
                      : "mb-2 block text-sm font-semibold text-[#2c2823]"
                  }
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
                  className={
                    dark
                      ? "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20 focus:ring-2 focus:ring-white/5"
                      : "w-full rounded-2xl border border-[#d9d3c8] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1a1814] focus:ring-2 focus:ring-[#1a1814]/5"
                  }
                />
              </div>
            </div>

            <div
              className={
                dark
                  ? "flex items-center justify-end gap-3 border-t border-white/10 bg-white/5 px-6 py-4"
                  : "flex items-center justify-end gap-3 border-t border-[#efe7dc] bg-[#fcf8f2] px-6 py-4"
              }
            >
              <button
                type="button"
                onClick={closeModal}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                    : "rounded-xl border border-[#d9d3c8] bg-white px-4 py-2 text-sm font-medium text-[#4f4a43] transition hover:bg-[#f8f4ee]"
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmChange}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                  pendingStatus === "DOWN"
                    ? "bg-red-600 hover:bg-red-700"
                    : dark
                    ? "bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] hover:opacity-95"
                    : "bg-[#1a1814] hover:bg-black"
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