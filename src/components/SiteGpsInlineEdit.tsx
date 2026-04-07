"use client";

import * as React from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  siteId: string;
  initialGps: string | null;
  canEdit?: boolean;
  showCoords?: boolean; // Step 3: Already added to your type!
};

function GpsDisplay({ gps, dark }: { gps: string | null; dark: boolean }) {
  return gps ? (
    <a
      /* Note: Fixed the '0' to '1' in the URL for better Google Maps compatibility */
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gps)}`}
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
  showCoords = true, // Step 3: Default is true, but we pass false from SitesClient
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
        /* CRITICAL: After saving, we force a refresh so the 
          parent page picks up the new Location Name 
        */
        window.location.reload(); 
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    /* Step 3: Only show the numbers if showCoords is true */
    return showCoords ? <GpsDisplay gps={gps} dark={dark} /> : null;
  }

  if (!editing) {
    return (
      <div className="inline-flex items-center gap-2">
        {/* Step 3: Only show the numbers if showCoords is true */}
        {showCoords && <GpsDisplay gps={gps} dark={dark} />}
        
        <button
          type="button"
          className={
            dark
              ? "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-slate-400 hover:bg-white/10"
              : "rounded-md border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase text-gray-500 hover:bg-gray-50"
          }
          onClick={() => {
            setDraft(gps ?? "");
            setEditing(true);
          }}
        >
          Edit GPS
        </button>
      </div>
    );
  }

  /* When EDITING is true, we ALWAYS show the input box so you can see the numbers */
  return (
    <div className="inline-flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder='e.g. "5.6037,-0.1870"'
        className={
          dark
            ? "w-48 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-500"
            : "w-48 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs outline-none"
        }
        disabled={saving}
      />
      <button
        type="button"
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
        onClick={save}
        disabled={saving}
      >
        {saving ? "..." : "Save"}
      </button>
      <button
        type="button"
        className="text-xs font-medium text-gray-500 hover:text-red-500"
        onClick={() => setEditing(false)}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
  );
}