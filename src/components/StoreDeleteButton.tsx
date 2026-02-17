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

    const ok = window.confirm(
      `Delete store item${typeof itemNo === "number" ? ` #${itemNo}` : ""}? This cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/store/api/item-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!res.ok) return;
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
