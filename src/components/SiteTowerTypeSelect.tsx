"use client";

import * as React from "react";
import { useThemeMode } from "@/context/ThemeContext";

type TowerType = "GBC" | "KNET";

type Props = {
  siteId: string;
  initialTowerType: TowerType;
  canEdit?: boolean;
};

function towerBadge(t: TowerType, dark: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  return t === "KNET"
    ? dark
      ? `${base} border-blue-500/30 bg-blue-500/10 text-blue-300`
      : `${base} border-blue-200 bg-blue-50 text-blue-700`
    : dark
    ? `${base} border-slate-500/30 bg-slate-500/10 text-slate-300`
    : `${base} border-gray-200 bg-gray-50 text-gray-700`;
}

export default function SiteTowerTypeSelect({
  siteId,
  initialTowerType,
  canEdit = true,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

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
    return <span className={towerBadge(towerType, dark)}>{towerType}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={towerBadge(towerType, dark)}>{towerType}</span>

      <select
        value={towerType}
        onChange={(e) => update(e.target.value as TowerType)}
        disabled={saving}
        className={
          dark
            ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
            : "rounded-md border bg-white px-2 py-1 text-xs"
        }
        aria-label="Update tower type"
        title="Update tower type"
      >
        <option value="GBC">GBC</option>
        <option value="KNET">KNET</option>
      </select>
    </div>
  );
}