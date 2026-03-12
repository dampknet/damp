"use client";

import * as React from "react";

type Props = {
  assetId: string;
  initialSerial: string | null;
  canEdit?: boolean;
};

export default function AssetSerialInlineEdit({
  assetId,
  initialSerial,
  canEdit = true,
}: Props) {
  const [value, setValue] = React.useState(initialSerial ?? "");
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    setValue(initialSerial ?? "");
  }, [initialSerial]);

  async function save(next: string) {
    setSaving(true);
    try {
      const cleaned = next.trim();

      const res = await fetch("/sites/api/asset-serial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          serialNumber: cleaned || null,
        }),
      });

      if (!res.ok) {
        setValue(initialSerial ?? "");
      } else {
        setValue(cleaned);
      }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (!canEdit) {
    return <span className="text-sm text-gray-900 dark:text-slate-100">{value || "-"}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-48 rounded-md border bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20"
            placeholder="Enter serial..."
            autoFocus
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => save(value)}
            className="rounded-md border px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setValue(initialSerial ?? "");
              setEditing(false);
            }}
            className="rounded-md border px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-900 dark:text-slate-100">{value || "-"}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}