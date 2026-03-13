"use client";

import * as React from "react";
import { useThemeMode } from "@/context/ThemeContext";

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
  const { mode } = useThemeMode();
  const dark = mode === "dark";

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
    return <span className={dark ? "text-slate-300" : ""}>{value || "-"}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={
              dark
                ? "w-48 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                : "w-48 rounded-md border bg-white px-2 py-1 text-xs outline-none focus:border-gray-400"
            }
            placeholder="Enter serial..."
            autoFocus
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => save(value)}
            className={
              dark
                ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-60"
                : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
            }
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
            className={
              dark
                ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-60"
                : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
            }
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className={dark ? "text-sm text-slate-300" : "text-sm"}>
            {value || "-"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={
              dark
                ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
                : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
            }
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}