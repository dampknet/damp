"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  itemId: string;
  itemNo?: number;
  canEdit?: boolean;
};

export default function StoreDeleteButton({ itemId, itemNo, canEdit = true }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
    if (!canEdit) return;

    const reason = window.prompt(
      `Delete store item${typeof itemNo === "number" ? ` #${itemNo}` : ""}?\n\nThis will move it to Deleted Items.\n\nOptional: enter a reason for deletion:`
    );

    if (reason === null) return;

    setDeleting(true);
    try {
      const res = await fetch("/store/api/item-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          reason: reason.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Failed to delete store item.");
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
      aria-label="Delete store item"
      title="Delete"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}