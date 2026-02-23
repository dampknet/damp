import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import PrintExportButton from "@/components/PrintExportButton";
import StoreStatusSelect from "@/components/StoreStatusSelect";
import DeleteStoreItemDialog from "@/components/DeleteStoreItemDialog";

type SearchParams = {
  q?: string;
  status?: "ALL" | "RECEIVED" | "NOT_RECEIVED";
};

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "ALL") as SearchParams["status"];

  const qAsNumber = Number(q);
  const isNumberSearch = q.length > 0 && Number.isFinite(qAsNumber);

  const items = await prisma.storeItem.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { description: { contains: q, mode: "insensitive" } },
                ...(isNumberSearch ? [{ itemNo: qAsNumber }] : []),
              ],
            }
          : {},
        status && status !== "ALL" ? { status } : {},
      ],
    },
    orderBy: { itemNo: "asc" },
    select: {
      id: true,
      itemNo: true,
      description: true,
      quantity: true,
      status: true,
    },
  });

  const [receivedCount, notReceivedCount] = await Promise.all([
    prisma.storeItem.count({ where: { status: "RECEIVED" } }),
    prisma.storeItem.count({ where: { status: "NOT_RECEIVED" } }),
  ]);

  const statusLabel =
    status === "ALL" ? "All" : status === "RECEIVED" ? "Received" : "Not received";

  const printTitleParts = ["Store"];
  if (q) printTitleParts.push(`Search: ${q}`);
  if (status && status !== "ALL") printTitleParts.push(`Status: ${statusLabel}`);
  const printTitle = printTitleParts.join(" — ");

  const exportRows = items.map((it) => ({
    Item: it.itemNo,
    Description: it.description,
    Quantity: it.quantity,
    Status: it.status === "RECEIVED" ? "RECEIVED" : "NOT RECEIVED",
  }));

  const exportCols = [
    { key: "Item", label: "Item" },
    { key: "Description", label: "Description" },
    { key: "Quantity", label: "Quantity" },
    { key: "Status", label: "Status" },
  ];

  // ✅ Mini list for delete dialog dropdown
  const itemMini = items.map((it) => ({
    id: it.id,
    itemNo: it.itemNo,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header (NO PRINT) */}
        <div className="no-print rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Store</h1>
              <p className="mt-1 text-sm text-gray-600">
                Inventory list (search, filter, print, export).
              </p>

              <div className="mt-2 text-xs text-gray-500">
                Role: <span className="font-semibold">{role}</span>
                {!canEdit ? " (view only)" : ""}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  Total:{" "}
                  <span className="ml-1 font-semibold">
                    {receivedCount + notReceivedCount}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Received: <span className="ml-1 font-semibold">{receivedCount}</span>
                </span>

                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  Not received:{" "}
                  <span className="ml-1 font-semibold">{notReceivedCount}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton title={printTitle} rows={exportRows} columns={exportCols} />

              {/* ✅ DELETE MOVED TO TOP (also hide in print) */}
              <div className="print:hidden">
                <DeleteStoreItemDialog items={itemMini} canEdit={canEdit} />
              </div>

              {canEdit ? (
                <Link
                  href="/store/new"
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                >
                  + Add Item
                </Link>
              ) : (
                <div className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-500">
                  View only
                </div>
              )}
            </div>
          </div>

          {/* Search + Filter */}
          <div className="mt-6">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2">
                <span className="text-gray-400">🔎</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by item number or description…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search store items"
                />
              </div>

              <select
                name="status"
                defaultValue={status}
                className="rounded-xl border bg-white px-3 py-2 text-sm"
                aria-label="Filter by status"
                title="Filter by status"
              >
                <option value="ALL">All</option>
                <option value="RECEIVED">Received</option>
                <option value="NOT_RECEIVED">Not received</option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Search
              </button>

              {(q || (status && status !== "ALL")) ? (
                <Link href="/store" className="text-sm font-medium text-gray-700 hover:underline">
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </div>

        {/* Table (PRINT AREA) */}
        <div className="print-area mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* Print Header */}
          <div className="print-only px-5 py-4">
            <div id="print-title" className="text-lg font-semibold text-gray-900">
              {printTitle}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Printed on {new Date().toLocaleString()}
            </div>
          </div>
          <div className="print-only h-px bg-gray-200" />

          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">Store Items</div>
            <div className="text-xs text-gray-500">{items.length} shown</div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="w-20 px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="w-28 px-5 py-3 font-medium">Qty</th>
                  <th className="w-56 px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-gray-600" colSpan={4}>
                      <div className="mx-auto max-w-md">
                        <div className="text-base font-semibold text-gray-900">
                          No items found
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          Try a different keyword, or clear filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="align-top hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {it.itemNo}
                      </td>

                      <td className="px-5 py-3 text-gray-700">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
                          {it.description}
                        </pre>
                      </td>

                      <td className="px-5 py-3 text-gray-900">{it.quantity}</td>

                      <td className="px-5 py-3">
                        <StoreStatusSelect
                          itemId={it.id}
                          initialStatus={it.status}
                          canEdit={canEdit}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="no-print mt-3 text-xs text-gray-500">
          Tip: Print/Export only what you searched/filtered — the table only.
        </p>
      </div>
    </div>
  );
}