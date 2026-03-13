"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

type SiteMini = { id: string; name: string };

type Props = {
  sites: SiteMini[];
  canEdit: boolean;
};

export default function DeleteSiteDialog({ sites, canEdit }: Props) {
  const router = useRouter();
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [open, setOpen] = React.useState(false);
  const [siteId, setSiteId] = React.useState<string>(sites[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);

  const selected = sites.find((s) => s.id === siteId);

  React.useEffect(() => {
    if (!siteId && sites[0]?.id) {
      setSiteId(sites[0].id);
    }
  }, [siteId, sites]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("keydown", onKeyDown);
    }

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onDelete() {
    if (!canEdit) return;

    if (!siteId) {
      window.alert("Select a site first.");
      return;
    }

    const ok = window.confirm(
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
        window.alert(data?.error ?? "Failed to delete site");
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
        onClick={() => setOpen(true)}
        disabled={!canEdit}
        className={
          canEdit
            ? dark
              ? "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15"
              : "rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            : dark
            ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-500"
            : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-400"
        }
        title={canEdit ? "Delete a site" : "View only"}
      >
        Delete Site
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-90 bg-black/50"
          />

          <div
            className={
              dark
                ? "absolute right-0 z-100 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#101720] shadow-2xl"
                : "absolute right-0 z-100 mt-2 w-80 overflow-hidden rounded-2xl border bg-white shadow-lg"
            }
          >
            <div className="px-4 py-3">
              <div
                className={
                  dark
                    ? "text-sm font-semibold text-slate-100"
                    : "text-sm font-semibold text-gray-900"
                }
              >
                Delete a Site
              </div>
              <div
                className={
                  dark
                    ? "mt-1 text-xs text-slate-500"
                    : "mt-1 text-xs text-gray-500"
                }
              >
                Select a site, then confirm.
              </div>
            </div>

            <div className={dark ? "h-px bg-white/10" : "h-px bg-gray-100"} />

            <div className="px-4 py-3">
              <label
                className={
                  dark
                    ? "text-xs font-medium text-slate-400"
                    : "text-xs font-medium text-gray-600"
                }
              >
                Site to delete
              </label>

              <select
                className={
                  dark
                    ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                    : "mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                }
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

              <div
                className={
                  dark
                    ? "mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                    : "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                }
              >
                Warning: deleting a site will also delete all assets under that site.
              </div>

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
                className={
                  dark
                    ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                    : "mt-2 w-full rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}