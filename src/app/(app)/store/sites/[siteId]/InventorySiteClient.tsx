"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import PrintExportButton from "@/components/PrintExportButton";
import DeleteInventoryItemsDialog from "@/components/DeleteInventoryItemsDialog";

type InventoryItemRow = {
  id: string;
  name: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  description: string | null;
  stockNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  unit: string | null;
  reorderLevel: number;
  targetStockLevel: number | null;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
  condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
  createdAt: Date;
  updatedAt: Date;
};

type Summary = {
  totalItems: number;
  materialCount: number;
  equipmentCount: number;
  lowStockCount: number;
  checkedOutCount: number;
};

function SummaryCard({
  dark,
  label,
  value,
  sub,
  accent,
}: {
  dark: boolean;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)]"
      }
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
        <div
          className={
            dark
              ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
              : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"
          }
        >
          {label}
        </div>
        <div
          className={
            dark
              ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100"
              : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"
          }
        >
          {value}
        </div>
        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function Chip({
  dark,
  label,
  value,
}: {
  dark: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={
        dark
          ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
          : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
      }
    >
      {label}:{" "}
      <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
        {value}
      </span>
    </span>
  );
}

function statusBadge(status: InventoryItemRow["status"], dark: boolean) {
  const base = "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold";

  if (status === "AVAILABLE") {
    return dark
      ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
      : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  if (status === "LOW_STOCK") {
    return dark
      ? `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`
      : `${base} border-amber-200 bg-amber-50 text-amber-700`;
  }

  if (status === "OUT_OF_STOCK") {
    return dark
      ? `${base} border-red-500/30 bg-red-500/10 text-red-300`
      : `${base} border-red-200 bg-red-50 text-red-700`;
  }

  if (status === "CHECKED_OUT") {
    return dark
      ? `${base} border-sky-500/30 bg-sky-500/10 text-sky-300`
      : `${base} border-sky-200 bg-sky-50 text-sky-700`;
  }

  return dark
    ? `${base} border-white/10 bg-white/5 text-slate-300`
    : `${base} border-[#ddd5c9] bg-[#f5f2ed] text-[#5b564d]`;
}

export default function InventorySiteClient({
  role,
  canEdit,
  site,
  summary,
  items,
}: {
  role: string;
  canEdit: boolean;
  site: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
  };
  summary: Summary;
  items: InventoryItemRow[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState<"ALL" | "MATERIAL" | "EQUIPMENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE"
  >("ALL");
  const [q, setQ] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredItems = useMemo(() => {
    const search = q.trim().toLowerCase();

    return items.filter((item) => {
      if (typeFilter !== "ALL" && item.itemType !== typeFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;

      if (!search) return true;

      const haystack = [
        item.name,
        item.description ?? "",
        item.stockNumber ?? "",
        item.manufacturer ?? "",
        item.model ?? "",
        item.serialNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [items, q, typeFilter, statusFilter]);

  const selectedItems = filteredItems.filter((item) =>
    selectedItemIds.includes(item.id)
  );

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedItemIds.includes(item.id));

  const exportRows = filteredItems.map((item, index) => ({
    No: index + 1,
    Item: item.name,
    Type: item.itemType,
    "Stock No": item.stockNumber ?? "",
    Serial: item.serialNumber ?? "",
    Quantity: `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`,
    Status: item.status,
    Condition: item.condition ?? "",
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Item", label: "Item" },
    { key: "Type", label: "Type" },
    { key: "Stock No", label: "Stock No" },
    { key: "Serial", label: "Serial" },
    { key: "Quantity", label: "Quantity" },
    { key: "Status", label: "Status" },
    { key: "Condition", label: "Condition" },
  ];

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedItemIds((prev) =>
        prev.filter((id) => !filteredItems.some((item) => item.id === id))
      );
      return;
    }

    setSelectedItemIds((prev) => {
      const merged = new Set([...prev, ...filteredItems.map((item) => item.id)]);
      return Array.from(merged);
    });
  }

  async function handleDeleteSelected() {
    if (selectedItems.length === 0) {
      return;
    }

    setDeleting(true);

    try {
      const results = await Promise.all(
        selectedItems.map((item) =>
          fetch("/store/api/inventory-item-delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: item.id }),
          })
        )
      );

      const failed = results.filter((res) => !res.ok);

      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} item(s).`);
        setDeleting(false);
        return;
      }

      setSelectedItemIds([]);
      setShowDeleteDialog(false);
      router.refresh();
    } catch {
      alert("Failed to delete selected items");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DeleteInventoryItemsDialog
        open={showDeleteDialog}
        dark={dark}
        items={selectedItems.map((item) => ({
          id: item.id,
          name: item.name,
          stockNumber: item.stockNumber,
          itemType: item.itemType,
        }))}
        deleting={deleting}
        onClose={() => {
          if (!deleting) setShowDeleteDialog(false);
        }}
        onConfirm={handleDeleteSelected}
      />

      <div
        className={
          dark
            ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
            : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
        }
      >
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <section
            className={
              dark
                ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
            }
          >
            <div
              className={
                dark
                  ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
                  : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
              }
            />

            {!dark ? (
              <>
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#1d5fa8]/8 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#c8611a]/8 blur-3xl" />
              </>
            ) : null}

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-col items-start gap-3">
                  <Link
                    href="/store"
                    className={
                      dark
                        ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                        : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                    }
                  >
                    ← Back to Store Dashboard
                  </Link>

                  <div
                    className={
                      dark
                        ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                        : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                    }
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Inventory Site
                  </div>
                </div>

                <h1
                  className={
                    dark
                      ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                      : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                  }
                >
                  {site.name} Inventory
                </h1>

                <p
                  className={
                    dark
                      ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                      : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                  }
                >
                  Manage materials and equipment for this site, monitor item status,
                  and prepare for issue, checkout, and restock workflows.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Chip dark={dark} label="Site" value={site.name} />
                  <Chip dark={dark} label="Location" value={site.location ?? "-"} />
                  <Chip dark={dark} label="Items" value={String(summary.totalItems)} />
                  <Chip dark={dark} label="Role" value={role} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PrintExportButton
                  title={`${site.name} Inventory`}
                  rows={exportRows}
                  columns={exportCols}
                />

                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={selectedItems.length === 0 || deleting}
                      className={
                        dark
                          ? "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          : "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      }
                    >
                      {deleting
                        ? "Deleting..."
                        : selectedItems.length > 0
                        ? `Delete Selected (${selectedItems.length})`
                        : "Delete Selected"}
                    </button>
                    
                    <Link
                        href={`/store/sites/${site.id}/restock`}
                        className={
                            dark
                            ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                            : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                        }
                        >
                        Restock Item
                        </Link>

                        <Link
                        href={`/store/sites/${site.id}/restocks`}
                        className={
                            dark
                            ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                            : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                        }
                        >
                        View Restock Log
                        </Link>

                    <Link
                        href={`/store/sites/${site.id}/issues`}
                        className={
                            dark
                            ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                            : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                        }
                        >
                        View Issue Log
                        </Link>

                    <Link
                        href={`/store/sites/${site.id}/issue`}
                        className={
                            dark
                            ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                            : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                        }
                        >
                        Issue Item
                        </Link>

                    <Link
                      href={`/store/sites/${site.id}/new`}
                      className={
                        dark
                          ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                          : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d2924]"
                      }
                    >
                      + Add Inventory Item
                    </Link>
                  </>
                ) : (
                  <div
                    className={
                      dark
                        ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-500"
                        : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-medium text-[#8b857c]"
                    }
                  >
                    View only
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={
                dark
                  ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                  : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
              }
            >
              {selectedItems.length} selected
            </span>

            {selectedItems.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedItemIds([])}
                className={
                  dark
                    ? "text-xs font-medium text-slate-400 hover:underline"
                    : "text-xs font-medium text-[#6f6a62] hover:underline"
                }
              >
                Clear selection
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              dark={dark}
              label="Total Items"
              value={String(summary.totalItems)}
              sub="all tracked records"
              accent={dark ? "bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" : "bg-[#1d5fa8]"}
            />
            <SummaryCard
              dark={dark}
              label="Materials"
              value={String(summary.materialCount)}
              sub="consumables and supplies"
              accent={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
            />
            <SummaryCard
              dark={dark}
              label="Equipment"
              value={String(summary.equipmentCount)}
              sub="tracked equipment units"
              accent={dark ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]" : "bg-[#b08b2c]"}
            />
            <SummaryCard
              dark={dark}
              label="Low Stock"
              value={String(summary.lowStockCount)}
              sub="needs restock"
              accent={dark ? "bg-[linear-gradient(90deg,#f97316,#fb923c)]" : "bg-[#c8611a]"}
            />
            <SummaryCard
              dark={dark}
              label="Checked Out"
              value={String(summary.checkedOutCount)}
              sub="currently unavailable"
              accent={dark ? "bg-[linear-gradient(90deg,#ef4444,#f87171)]" : "bg-[#c0392b]"}
            />
          </div>

          <section
            className={
              dark
                ? "print-area mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
                : "print-area mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
            }
          >
            <div className="print-only px-5 py-4">
              <div id="print-title" className="text-lg font-semibold text-gray-900">
                {site.name} Inventory
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {filteredItems.length} shown
              </div>
            </div>
            <div className="print-only h-px bg-gray-200" />

            <div
              className={
                dark
                  ? "h-1 w-full bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)] opacity-80"
                  : "h-1 w-full bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
              }
            />

            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between no-print">
              <div>
                <div
                  className={
                    dark
                      ? "text-sm font-semibold text-slate-100"
                      : "text-sm font-semibold text-[#1a1814]"
                  }
                >
                  Inventory Items
                </div>
                <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                  {filteredItems.length} shown
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search item, serial, model..."
                  className={
                    dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm outline-none"
                  }
                />

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  aria-label="Filter inventory items by type"
                  title="Filter inventory items by type"
                  className={
                    dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                      : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                  }
                >
                  <option value="ALL">All Types</option>
                  <option value="MATERIAL">Material</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  aria-label="Filter inventory items by status"
                  title="Filter inventory items by status"
                  className={
                    dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                      : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                  }
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out Of Stock</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                    <th className="w-16 px-5 py-3 font-medium">No</th>
                    <th className="w-14 px-5 py-3 font-medium no-print">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible inventory items"
                        title="Select all visible inventory items"
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Stock No</th>
                    <th className="px-5 py-3 font-medium">Serial</th>
                    <th className="px-5 py-3 font-medium">Qty</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Condition</th>
                  </tr>
                </thead>

                <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className={
                          dark
                            ? "px-5 py-10 text-center text-slate-500"
                            : "px-5 py-10 text-center text-gray-600"
                        }
                      >
                        No inventory items yet for this site.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => {
                      const checked = selectedItemIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={
                            checked
                              ? dark
                                ? "bg-white/10"
                                : "bg-[#f3ede4]"
                              : dark
                              ? "hover:bg-white/5"
                              : "hover:bg-[#fcfaf7]"
                          }
                        >
                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {index + 1}
                          </td>

                          <td className="px-5 py-3 no-print">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItemSelection(item.id)}
                              aria-label={`Select ${item.name}`}
                              title={`Select ${item.name}`}
                              className="h-4 w-4"
                            />
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-100" : "px-5 py-3 text-[#1a1814]"}>
                            <Link
                              href={`/store/sites/${site.id}/items/${item.id}/edit`}
                              className="block hover:underline"
                            >
                              <div className="font-medium">{item.name}</div>
                              {item.description ? (
                                <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>
                                  {item.description}
                                </div>
                              ) : null}
                            </Link>
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {item.itemType}
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {item.stockNumber ?? "-"}
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {item.serialNumber ?? "-"}
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {item.quantity}
                            {item.unit ? ` ${item.unit}` : ""}
                          </td>

                          <td className="px-5 py-3">
                            <span className={statusBadge(item.status, dark)}>{item.status}</span>
                          </td>

                          <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                            {item.condition ?? "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}