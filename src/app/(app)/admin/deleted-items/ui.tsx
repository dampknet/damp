"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { permanentlyDeleteItem, restoreDeletedItem } from "./actions";

type EntityType = "SITE" | "ASSET" | "INVENTORY_ITEM" | "STORE_ITEM";

type DeletedRow = {
  id: string;
  label: string;
  subLabel: string;
  deletedAt: string | null;
  deletedByEmail: string | null;
  deleteReason: string | null;
  entityType: EntityType;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Section({
  title,
  rows,
  dark,
  onRestore,
  onDeleteForever,
  pending,
}: {
  title: string;
  rows: DeletedRow[];
  dark: boolean;
  pending: boolean;
  onRestore: (entityType: EntityType, id: string, label: string) => void;
  onDeleteForever: (entityType: EntityType, id: string, label: string) => void;
}) {
  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          : "overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm"
      }
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
          {title}
        </div>
        <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
          {rows.length} item(s)
        </div>
      </div>

      <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className={
              dark
                ? "bg-[#101720] text-left text-slate-400"
                : "bg-[#f8f4ee] text-left text-[#5b564d]"
            }
          >
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Details</th>
              <th className="px-5 py-3 font-semibold">Deleted At</th>
              <th className="px-5 py-3 font-semibold">Deleted By</th>
              <th className="px-5 py-3 font-semibold">Reason</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={
                    dark
                      ? "px-5 py-10 text-center text-slate-500"
                      : "px-5 py-10 text-center text-[#8b857c]"
                  }
                >
                  No deleted records here.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.entityType}-${row.id}`} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                  <td className={dark ? "px-5 py-3 font-semibold text-slate-100" : "px-5 py-3 font-semibold text-[#1a1814]"}>
                    {row.label}
                  </td>
                  <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                    {row.subLabel}
                  </td>
                  <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                    {formatDate(row.deletedAt)}
                  </td>
                  <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                    {row.deletedByEmail ?? "-"}
                  </td>
                  <td className={dark ? "px-5 py-3 text-slate-400" : "px-5 py-3 text-[#5d584f]"}>
                    {row.deleteReason ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRestore(row.entityType, row.id, row.label)}
                        className={
                          dark
                            ? "rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                            : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        }
                      >
                        Restore
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onDeleteForever(row.entityType, row.id, row.label)}
                        className={
                          dark
                            ? "rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                            : "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        }
                      >
                        Permanent Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DeletedItemsClient({
  sites,
  assets,
  inventoryItems,
  storeItems,
}: {
  sites: DeletedRow[];
  assets: DeletedRow[];
  inventoryItems: DeletedRow[];
  storeItems: DeletedRow[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const [isPending, startTransition] = useTransition();

  function handleRestore(entityType: EntityType, id: string, label: string) {
    const ok = window.confirm(`Restore "${label}"?`);
    if (!ok) return;

    startTransition(async () => {
      try {
        await restoreDeletedItem(entityType, id);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Restore failed";
        alert(msg);
      }
    });
  }

  function handlePermanentDelete(entityType: EntityType, id: string, label: string) {
    const ok = window.confirm(
      `Permanently delete "${label}"?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        await permanentlyDeleteItem(entityType, id);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Permanent delete failed";
        alert(msg);
      }
    });
  }

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-gray-50"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link
          href="/dashboard"
          className={
            dark
              ? "text-sm text-slate-400 hover:underline"
              : "text-sm text-gray-600 hover:underline"
          }
        >
          ← Back to Dashboard
        </Link>

        <h1
          className={
            dark
              ? "mt-3 text-3xl font-semibold text-slate-100"
              : "mt-3 text-3xl font-semibold text-gray-900"
          }
        >
          Deleted Items
        </h1>

        <p
          className={
            dark
              ? "mt-2 text-sm text-slate-500"
              : "mt-2 text-sm text-gray-600"
          }
        >
          Admin only recycle bin for soft-deleted sites, assets, inventory items, and store items.
        </p>

        <div className="mt-6 space-y-6">
          <Section
            title="Deleted Sites"
            rows={sites}
            dark={dark}
            pending={isPending}
            onRestore={handleRestore}
            onDeleteForever={handlePermanentDelete}
          />

          <Section
            title="Deleted Assets"
            rows={assets}
            dark={dark}
            pending={isPending}
            onRestore={handleRestore}
            onDeleteForever={handlePermanentDelete}
          />

          <Section
            title="Deleted Inventory Items"
            rows={inventoryItems}
            dark={dark}
            pending={isPending}
            onRestore={handleRestore}
            onDeleteForever={handlePermanentDelete}
          />

          <Section
            title="Deleted Store Items"
            rows={storeItems}
            dark={dark}
            pending={isPending}
            onRestore={handleRestore}
            onDeleteForever={handlePermanentDelete}
          />
        </div>
      </div>
    </div>
  );
}