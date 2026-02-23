"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type ItemMini = {
  id: string;
  itemNo: number;
};

type Props = {
  items: ItemMini[];
  canEdit?: boolean;
};

export default function DeleteStoreItemDialog({ items, canEdit = true }: Props) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedItemNo = React.useMemo(() => {
    return items.find((x) => x.id === itemId)?.itemNo;
  }, [items, itemId]);

  function show() {
    if (!canEdit) return;
    setError(null);

    // always keep a valid selection
    const first = items[0]?.id ?? "";
    setItemId((prev) => prev || first);

    dialogRef.current?.showModal();
    setOpen(true);
  }

  function close() {
    dialogRef.current?.close();
    setOpen(false);
    setDeleting(false);
    setError(null);
  }

  async function onDelete() {
    if (!canEdit || deleting) return;
    if (!itemId) {
      setError("Please select an item.");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to delete store item #${selectedItemNo ?? ""}? This cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/store/api/item-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Failed to delete item.");
        return;
      }

      close();
      router.refresh();
    } catch {
      setError("Failed to delete item.");
    } finally {
      setDeleting(false);
    }
  }

  const disabled = !canEdit || items.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={disabled}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        title={disabled ? "No items to delete" : "Delete a store item"}
        aria-label="Delete store item"
      >
        Delete Item
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="w-full max-w-md rounded-2xl border bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <div className="text-base font-semibold text-gray-900">Delete store item</div>
          <p className="mt-1 text-sm text-gray-600">
            Select an item and confirm deletion. This will remove it from the database.
          </p>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600">
              Item to delete
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              aria-label="Select store item to delete"
              title="Select store item to delete"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  #{it.itemNo}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Warning: This action cannot be undone.
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={!canEdit || deleting || !itemId}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* allows Esc / clicking backdrop to close nicely */}
        {open ? (
          <form method="dialog" className="hidden">
            <button />
          </form>
        ) : null}
      </dialog>
    </>
  );
}