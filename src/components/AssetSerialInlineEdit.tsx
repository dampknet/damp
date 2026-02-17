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
      const res = await fetch("/sites/api/asset-serial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          serialNumber: next.trim() || null,
        }),
      });

      if (!res.ok) {
        // rollback UI
        setValue(initialSerial ?? "");
      } else {
        // accept
        setValue(next.trim());
      }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (!canEdit) return <span>{value || "-"}</span>;

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-48 rounded-md border bg-white px-2 py-1 text-xs outline-none focus:border-gray-400"
            placeholder="Enter serial..."
            autoFocus
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => save(value)}
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
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
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-sm">{value || "-"}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
