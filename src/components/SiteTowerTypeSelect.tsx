"use client";

import * as React from "react";

type TowerType = "GBC" | "KNET";

type Props = {
  siteId: string;
  initialTowerType: TowerType;
  canEdit?: boolean;
};

function towerBadge(t: TowerType) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  return t === "KNET"
    ? `${base} border-blue-200 bg-blue-50 text-blue-700`
    : `${base} border-gray-200 bg-gray-50 text-gray-700`;
}

export default function SiteTowerTypeSelect({
  siteId,
  initialTowerType,
  canEdit = true,
}: Props) {
  const [towerType, setTowerType] = React.useState<TowerType>(initialTowerType);
  const [saving, setSaving] = React.useState(false);

  async function update(next: TowerType) {
    const prev = towerType;
    setTowerType(next);
    setSaving(true);

    try {
      const res = await fetch("/sites/api/site-meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, towerType: next }),
      });

      if (!res.ok) setTowerType(prev);
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <span className={towerBadge(towerType)}>{towerType}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={towerBadge(towerType)}>{towerType}</span>

      <select
        value={towerType}
        onChange={(e) => update(e.target.value as TowerType)}
        disabled={saving}
        className="rounded-md border bg-white px-2 py-1 text-xs"
        aria-label="Update tower type"
        title="Update tower type"
      >
        <option value="GBC">GBC</option>
        <option value="KNET">KNET</option>
      </select>
    </div>
  );
}
