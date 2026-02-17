"use client";

import * as React from "react";
import type { StoreStatus } from "@prisma/client";

type Props = {
  itemId: string;
  initialStatus: StoreStatus;
  canEdit?: boolean;
};

function badgeClass(status: StoreStatus) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  return status === "RECEIVED"
    ? `${base} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${base} border-amber-200 bg-amber-50 text-amber-800`;
}

export default function StoreStatusSelect({
  itemId,
  initialStatus,
  canEdit = true,
}: Props) {
  const [status, setStatus] = React.useState<StoreStatus>(initialStatus);
  const [saving, setSaving] = React.useState(false);

  // ✅ important: rollback should go to LAST SAVED, not the original prop forever
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

      // ✅ commit
      lastSavedRef.current = next;
    } catch {
      setStatus(lastSavedRef.current);
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <span className={badgeClass(status)}>{status}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={badgeClass(status)}>{status}</span>

      <select
        value={status}
        onChange={(e) => update(e.target.value as StoreStatus)}
        disabled={saving}
        className="rounded-md border bg-white px-2 py-1 text-xs"
        aria-label="Update store item status"
      >
        <option value="RECEIVED">RECEIVED</option>
        <option value="NOT_RECEIVED">NOT_RECEIVED</option>
      </select>
    </div>
  );
}
