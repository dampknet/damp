"use client";

import * as React from "react";
import type { StoreStatus } from "@prisma/client";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  itemId: string;
  initialStatus: StoreStatus;
  canEdit?: boolean;
};

function badgeClass(status: StoreStatus, dark: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  if (status === "RECEIVED") {
    return dark
      ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
      : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  return dark
    ? `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`
    : `${base} border-amber-200 bg-amber-50 text-amber-800`;
}

export default function StoreStatusSelect({
  itemId,
  initialStatus,
  canEdit = true,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [status, setStatus] = React.useState<StoreStatus>(initialStatus);
  const [saving, setSaving] = React.useState(false);

  const lastSavedRef = React.useRef<StoreStatus>(initialStatus);

  React.useEffect(() => {
    setStatus(initialStatus);
    lastSavedRef.current = initialStatus;
  }, [initialStatus]);

  async function update(next: StoreStatus) {
    setStatus(next);
    setSaving(true);

    try {
      const res = await fetch("/store/api/item-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: next }),
      });

      if (!res.ok) {
        setStatus(lastSavedRef.current);
        return;
      }

      lastSavedRef.current = next;
    } catch {
      setStatus(lastSavedRef.current);
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <span className={badgeClass(status, dark)}>{status}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={badgeClass(status, dark)}>{status}</span>

      <select
        value={status}
        onChange={(e) => update(e.target.value as StoreStatus)}
        disabled={saving}
        className={
          dark
            ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
            : "rounded-md border bg-white px-2 py-1 text-xs"
        }
        aria-label="Update store item status"
      >
        <option value="RECEIVED">RECEIVED</option>
        <option value="NOT_RECEIVED">NOT_RECEIVED</option>
      </select>
    </div>
  );
}