"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  siteId: string;
  siteName?: string;
  canEdit?: boolean;
};

export default function SiteDeleteButton({ siteId, siteName, canEdit = true }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
    if (!canEdit) return;

    const reason = window.prompt(
      `Delete site${siteName ? ` "${siteName}"` : ""}?\n\nThis will move the site to Deleted Items and soft-delete its assets too.\n\nOptional: enter a reason for deletion:`
    );

    if (reason === null) return;

    setDeleting(true);
    try {
      const res = await fetch("/sites/api/site-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          reason: reason.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Failed to delete site.");
        return;
      }

      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={!canEdit || deleting}
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Delete site"
      title="Delete site"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}