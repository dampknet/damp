"use client";

import * as React from "react";

type AssetStatus = "ACTIVE" | "FAULTY" | "DECOMMISSIONED";

type Props = {
  assetId: string;
  initialStatus: AssetStatus;
  canEdit?: boolean;
};

function badgeClass(status: AssetStatus) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  if (status === "ACTIVE") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300`;
  }

  if (status === "FAULTY") {
    return `${base} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300`;
  }

  return `${base} border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300`;
}

export default function AssetStatusInlineEdit({
  assetId,
  initialStatus,
  canEdit = true,
}: Props) {
  const [status, setStatus] = React.useState<AssetStatus>(initialStatus);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  async function update(next: AssetStatus) {
    const prev = status;
    setStatus(next);
    setSaving(true);

    try {
      const res = await fetch("/sites/api/asset-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          status: next,
        }),
      });

      if (!res.ok) {
        setStatus(prev);
      }
    } catch {
      setStatus(prev);
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
        onChange={(e) => update(e.target.value as AssetStatus)}
        disabled={saving}
        className="rounded-md border bg-white px-2 py-1 text-xs text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        aria-label="Update asset status"
        title="Update asset status"
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="FAULTY">FAULTY</option>
        <option value="DECOMMISSIONED">DECOMMISSIONED</option>
      </select>
    </div>
  );
}