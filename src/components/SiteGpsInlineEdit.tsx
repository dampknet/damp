"use client";

import * as React from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  siteId: string;
  initialGps: string | null;
  canEdit?: boolean;
};

function GpsDisplay({ gps, dark }: { gps: string | null; dark: boolean }) {
  return gps ? (
    <a
      href={`https://www.google.com/maps?q=${encodeURIComponent(gps)}`}
      target="_blank"
      rel="noreferrer"
      className={
        dark
          ? "text-sm font-medium text-sky-300 hover:underline"
          : "text-sm font-medium text-blue-600 hover:underline"
      }
      title="Open in Google Maps"
    >
      {gps}
    </a>
  ) : (
    <span className={dark ? "text-slate-300" : ""}>-</span>
  );
}

export default function SiteGpsInlineEdit({
  siteId,
  initialGps,
  canEdit = true,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [gps, setGps] = React.useState<string | null>(initialGps);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(initialGps ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const next = draft.trim() ? draft.trim() : null;

    const prev = gps;
    setGps(next);
    setSaving(true);

    try {
      const res = await fetch("/sites/api/site-meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, gps: next }),
      });

      if (!res.ok) {
        setGps(prev);
        setDraft(prev ?? "");
      } else {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <GpsDisplay gps={gps} dark={dark} />;
  }

  if (!editing) {
    return (
      <div className="inline-flex items-center gap-2">
        <GpsDisplay gps={gps} dark={dark} />
        <button
          type="button"
          className={
            dark
              ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
              : "rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
          }
          onClick={() => {
            setDraft(gps ?? "");
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
        placeholder='e.g. "5.6037,-0.1870" or any text'
        className={
          dark
            ? "w-64 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-500"
            : "w-64 rounded-md border bg-white px-2 py-1 text-xs outline-none"
        }
        aria-label="GPS coordinates"
        title="GPS coordinates"
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
          setDraft(gps ?? "");
          setEditing(false);
        }}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
  );
}