"use client";

import * as React from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  siteId: string;
  initialHeight: number | null;
  canEdit?: boolean;
};

export default function SiteHeightInlineEdit({
  siteId,
  initialHeight,
  canEdit = true,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [height, setHeight] = React.useState<number | null>(initialHeight);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(initialHeight?.toString() ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const next = draft.trim() === "" ? null : Number(draft.trim());

    if (next !== null && (!Number.isFinite(next) || next < 0)) return;

    const prev = height;
    setHeight(next);
    setSaving(true);

    try {
      const res = await fetch("/sites/api/site-meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, towerHeight: next }),
      });

      if (!res.ok) {
        setHeight(prev);
        setDraft(prev?.toString() ?? "");
      } else {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <span className={dark ? "text-slate-300" : ""}>{typeof height === "number" ? height : "-"}</span>;
  }

  if (!editing) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className={dark ? "text-slate-300" : "text-gray-700"}>
          {typeof height === "number" ? height : "-"}
        </span>
        <button
          type="button"
          className={
            dark
              ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
              : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
          }
          onClick={() => {
            setDraft(height?.toString() ?? "");
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        inputMode="decimal"
        placeholder="e.g. 45"
        className={
          dark
            ? "w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-500"
            : "w-24 rounded-md border bg-white px-2 py-1 text-xs outline-none"
        }
        aria-label="Tower height in meters"
        title="Tower height in meters"
        disabled={saving}
      />
      <button
        type="button"
        className={
          dark
            ? "rounded-md bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-2 py-1 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60"
            : "rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        }
        onClick={save}
        disabled={saving}
      >
        Save
      </button>
      <button
        type="button"
        className={
          dark
            ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10"
            : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
        }
        onClick={() => {
          setDraft(height?.toString() ?? "");
          setEditing(false);
        }}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
  );
}