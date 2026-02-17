"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type TowerType = "GBC" | "KNET";

type Props = {
  siteId: string;
  initialTowerType: TowerType;
  initialTowerHeight: number | null;
  initialGps: string | null;
  canEdit: boolean;
};

export default function SiteMetaEditor({
  siteId,
  initialTowerType,
  initialTowerHeight,
  initialGps,
  canEdit,
}: Props) {
  const router = useRouter();

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [towerType, setTowerType] = React.useState<TowerType>(initialTowerType);
  const [towerHeight, setTowerHeight] = React.useState<string>(
    initialTowerHeight === null || initialTowerHeight === undefined
      ? ""
      : String(initialTowerHeight)
  );
  const [gps, setGps] = React.useState<string>(initialGps ?? "");

  React.useEffect(() => {
    setTowerType(initialTowerType);
    setTowerHeight(
      initialTowerHeight === null || initialTowerHeight === undefined
        ? ""
        : String(initialTowerHeight)
    );
    setGps(initialGps ?? "");
  }, [initialTowerType, initialTowerHeight, initialGps]);

  async function save() {
    setSaving(true);
    try {
      const heightTrim = towerHeight.trim();
      const parsedHeight =
        heightTrim.length === 0 ? null : Number(heightTrim);

      if (heightTrim.length > 0 && !Number.isFinite(parsedHeight)) {
        // simple guard
        setSaving(false);
        return;
      }

      const res = await fetch("/sites/api/site-meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          towerType,
          towerHeight: parsedHeight === null ? null : Math.trunc(parsedHeight),
          gps: gps.trim() ? gps.trim() : null,
        }),
      });

      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        // rollback to server state
        setTowerType(initialTowerType);
        setTowerHeight(
          initialTowerHeight === null || initialTowerHeight === undefined
            ? ""
            : String(initialTowerHeight)
        );
        setGps(initialGps ?? "");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-gray-700">
          <span className="font-medium">{initialTowerType}</span>
        </div>
        <div className="text-xs text-gray-700">
          Height: <span className="font-medium">{initialTowerHeight ?? "-"}</span>
        </div>

        <div className="text-xs">
          GPS:{" "}
          {initialGps ? (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(
                initialGps
              )}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              {initialGps}
            </a>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-700">
          <span className="font-medium">{initialTowerType}</span>
          <span className="mx-2 text-gray-300">•</span>
          Height: <span className="font-medium">{initialTowerHeight ?? "-"}</span>
        </div>

        <div className="text-xs">
          GPS:{" "}
          {initialGps ? (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(
                initialGps
              )}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              {initialGps}
            </a>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={towerType}
        onChange={(e) => setTowerType(e.target.value as TowerType)}
        disabled={saving}
        className="w-full rounded-lg border bg-white px-2 py-1.5 text-xs"
        aria-label="Tower type"
        title="Tower type"
      >
        <option value="GBC">GBC</option>
        <option value="KNET">KNET</option>
      </select>

      <input
        value={towerHeight}
        onChange={(e) => setTowerHeight(e.target.value)}
        disabled={saving}
        inputMode="numeric"
        placeholder="Height (e.g. 60)"
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-gray-400"
        aria-label="Tower height"
      />

      <input
        value={gps}
        onChange={(e) => setGps(e.target.value)}
        disabled={saving}
        placeholder="GPS (e.g. 5.6037, -0.1870)"
        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-gray-400"
        aria-label="GPS coordinates"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setTowerType(initialTowerType);
            setTowerHeight(
              initialTowerHeight === null || initialTowerHeight === undefined
                ? ""
                : String(initialTowerHeight)
            );
            setGps(initialGps ?? "");
          }}
          disabled={saving}
          className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
