"use client";

import * as React from "react";

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
    return (
      <span className="text-gray-700 dark:text-slate-300">
        {typeof height === "number" ? height : "-"}
      </span>
    );
  }

  if (!editing) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-gray-700 dark:text-slate-300">
          {typeof height === "number" ? height : "-"}
        </span>
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
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
        className="w-24 rounded-md border bg-white px-2 py-1 text-xs text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
        aria-label="Tower height in meters"
        title="Tower height in meters"
        disabled={saving}
      />
      <button
        type="button"
        className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:bg-gray-900 disabled:opacity-60 dark:bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] dark:hover:opacity-95"
        onClick={save}
        disabled={saving}
      >
        Save
      </button>
      <button
        type="button"
        className="rounded-md border px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
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