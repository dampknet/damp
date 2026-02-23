"use client";

import * as React from "react";

type MuxKey = "MUX1" | "MUX2" | "MUX3";

type Props = {
  siteId: string;
  mux: MuxKey;
  initialSerial: string | null;
  canEdit: boolean;
};

export default function SiteMuxSerialInlineEdit({
  siteId,
  mux,
  initialSerial,
  canEdit,
}: Props) {
  const [value, setValue] = React.useState<string>(initialSerial ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save(next: string) {
    const cleaned = next.trim();
    setSaving(true);

    try {
      const res = await fetch("/sites/api/mux-serial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          mux,
          serial: cleaned.length ? cleaned : null,
        }),
      });

      if (!res.ok) {
        // rollback
        setValue(initialSerial ?? "");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <span className="font-semibold">{value.trim() ? value : "-"}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save(value)}
        placeholder="-"
        disabled={saving}
        className="w-44 rounded-md border bg-white px-2 py-1 text-xs outline-none focus:border-gray-400"
        aria-label={`${mux} serial`}
      />
      {saving ? <span className="text-[11px] text-gray-400">Saving…</span> : null}
    </div>
  );
}