"use client";

import * as React from "react";
import type { SiteStatus } from "@prisma/client";

type Props = {
  siteId: string;
  initialStatus: SiteStatus;
  canEdit?: boolean;
};

function badgeClass(status: SiteStatus) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  return status === "ACTIVE"
    ? `${base} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${base} border-red-200 bg-red-50 text-red-700`;
}

export default function SiteStatusSelect({ siteId, initialStatus, canEdit = true }: Props) {
  const [status, setStatus] = React.useState<SiteStatus>(initialStatus);
  const [saving, setSaving] = React.useState(false);

  async function update(next: SiteStatus) {
    setStatus(next);
    setSaving(true);

    try {
      const res = await fetch("/sites/api/site-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, status: next }),
      });

      if (!res.ok) {
        // rollback
        setStatus(initialStatus);
      }
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
        onChange={(e) => update(e.target.value as SiteStatus)}
        disabled={saving}
        className="rounded-md border bg-white px-2 py-1 text-xs"
        aria-label="Update site status"
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="DOWN">DOWN</option>
      </select>
    </div>
  );
}
