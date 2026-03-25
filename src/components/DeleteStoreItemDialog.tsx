"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

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
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [reason, setReason] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedItemNo = React.useMemo(() => {
    return items.find((x) => x.id === itemId)?.itemNo;
  }, [items, itemId]);

  function show() {
    if (!canEdit) return;
    setError(null);
    setReason("");

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
    setReason("");
  }

  async function onDelete() {
    if (!canEdit || deleting) return;

    if (!itemId) {
      setError("Please select an item.");
      return;
    }

    setDeleting(true);
    setError(null);

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
        className={
          dark
            ? "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            : "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        }
        title={disabled ? "No items to delete" : "Delete a store item"}
        aria-label="Delete store item"
      >
        Delete Item
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className={
          dark
            ? "w-full max-w-md rounded-2xl border border-white/10 bg-[#101720] p-0 text-slate-200 shadow-xl backdrop:bg-black/60"
            : "w-full max-w-md rounded-2xl border bg-white p-0 shadow-xl backdrop:bg-black/40"
        }
      >
        <div className="p-5">
          <div
            className={
              dark
                ? "text-base font-semibold text-slate-100"
                : "text-base font-semibold text-gray-900"
            }
          >
            Delete store item
          </div>

          <p
            className={
              dark
                ? "mt-1 text-sm text-slate-500"
                : "mt-1 text-sm text-gray-600"
            }
          >
            Select an item and move it to Deleted Items. Admin can restore it later.
          </p>

          <div className="mt-4">
            <label
              className={
                dark
                  ? "block text-xs font-medium text-slate-400"
                  : "block text-xs font-medium text-gray-600"
              }
            >
              Item to delete
            </label>

            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={
                dark
                  ? "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  : "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
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

          <div className="mt-4">
            <label
              className={
                dark
                  ? "block text-xs font-medium text-slate-400"
                  : "block text-xs font-medium text-gray-600"
              }
            >
              Reason (optional)
            </label>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why are you deleting this item?"
              className={
                dark
                  ? "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
              }
            />
          </div>

          <div
            className={
              dark
                ? "mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
                : "mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            }
          >
            This is a soft delete. The item will move to Deleted Items, not be removed permanently.
          </div>

          {error ? (
            <div
              className={
                dark
                  ? "mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  : "mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              }
            >
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                  : "rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={!canEdit || deleting || !itemId}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Move to Deleted Items"}
            </button>
          </div>
        </div>

        {open ? (
          <form method="dialog" className="hidden">
            <button />
          </form>
        ) : null}
      </dialog>
    </>
  );
}