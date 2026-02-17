"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type SiteMini = { id: string; name: string };

type Props = {
  sites: SiteMini[];
  canEdit: boolean;
};

export default function DeleteSiteDialog({ sites, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [siteId, setSiteId] = React.useState<string>(sites[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);
  const selected = sites.find((s) => s.id === siteId);

  async function onDelete() {
    if (!canEdit) return;

    if (!siteId) {
      alert("Select a site first.");
      return;
    }

    const ok = confirm(
      `DELETE SITE?\n\nYou are about to permanently delete:\n${selected?.name ?? "Selected site"}\n\nThis will also delete all assets under the site.\n\nClick OK to confirm.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/sites/api/site-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Failed to delete site");
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!canEdit}
        className={
          canEdit
            ? "rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-400"
        }
        title={canEdit ? "Delete a site" : "View only"}
      >
        Delete Site
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border bg-white shadow-lg">
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">Delete a Site</div>
            <div className="mt-1 text-xs text-gray-500">
              Select a site, then confirm.
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="px-4 py-3">
            <label className="text-xs font-medium text-gray-600">
              Site to delete
            </label>
            <select
              className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              aria-label="Select site to delete"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onDelete}
              disabled={!canEdit || loading}
              className="mt-3 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
