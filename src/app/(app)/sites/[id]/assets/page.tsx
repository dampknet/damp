import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintExportButton from "@/components/PrintExportButton";
import { getCurrentProfile } from "@/lib/auth";
import AssetSerialInlineEdit from "@/components/AssetSerialInlineEdit";

type SearchParams = {
  q?: string;
  status?: "ACTIVE" | "FAULTY" | "DECOMMISSIONED" | "";
};

export default async function SiteAssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim() as SearchParams["status"];

  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!site) return notFound();

  const assets = await prisma.asset.findMany({
    where: {
      siteId: site.id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { assetName: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
    },
  });

  const pageTitleParts = [`${site.name} — All Devices`];
  if (status) pageTitleParts.push(`Status: ${status}`);
  if (q) pageTitleParts.push(`Search: ${q}`);
  const pageTitle = pageTitleParts.join(" — ");

  const csvRows = assets.map((a: (typeof assets)[number]) => ({
    Site: site.name,
    Category: a.category?.name ?? "",
    Subcategory: a.subcategory?.name ?? "",
    Name: a.assetName,
    Serial: a.serialNumber ?? "",
    Manufacturer: a.manufacturer ?? "",
    Model: a.model ?? "",
    Status: a.status,
    UpdatedAt: a.updatedAt.toISOString(),
  }));

  const exportCols = [
    { key: "Site", label: "Site" },
    { key: "Category", label: "Category" },
    { key: "Subcategory", label: "Subcategory" },
    { key: "Name", label: "Device" },
    { key: "Serial", label: "Serial" },
    { key: "Manufacturer", label: "Manufacturer" },
    { key: "Model", label: "Model" },
    { key: "Status", label: "Status" },
    { key: "UpdatedAt", label: "Updated At" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 print:py-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/sites/${site.id}`}
              className="text-sm text-gray-600 hover:underline print:hidden"
            >
              ← Back to Site
            </Link>

            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {site.name} — All Devices
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Search, filter, print or export.
            </p>

            <div className="mt-2 text-xs text-gray-500 print:hidden">
              Role: <span className="font-semibold">{role}</span>
              {!canEdit ? " (view only)" : ""}
            </div>
          </div>

          <div className="print:hidden">
            <PrintExportButton
              title={pageTitle}
              filename={`${site.name}-devices.csv`}
              rows={csvRows}
              columns={exportCols}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-xl border bg-white p-4 print:hidden">
          <form className="grid gap-3 sm:grid-cols-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, serial, model, manufacturer…"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />

            <select
              name="status"
              aria-label="Filter by status"
              defaultValue={status ?? ""}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
              title="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FAULTY">Faulty</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Apply
              </button>

              <Link
                href={`/sites/${site.id}/assets`}
                className="w-full rounded-lg border bg-white px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {/* PRINT HEADER */}
        <div className="print-only mt-6">
          <div id="print-title" className="text-lg font-semibold text-gray-900">
            {pageTitle}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Printed on {new Date().toLocaleString()}
          </div>
        </div>
        <div className="print-only h-px bg-gray-200" />

        {/* Table */}
        <div className="print-area mt-4 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sub</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-600" colSpan={5}>
                    No devices yet for this site.
                  </td>
                </tr>
              ) : (
                assets.map((a: (typeof assets)[number]) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3">{a.category?.name ?? "-"}</td>
                    <td className="px-4 py-3">{a.subcategory?.name ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.assetName}
                    </td>

                    {/* ✅ Editable serial for ADMIN/EDITOR, read-only for VIEWER */}
                    <td className="px-4 py-3">
                      <AssetSerialInlineEdit
                        assetId={a.id}
                        initialSerial={a.serialNumber ?? null}
                        canEdit={canEdit}
                      />
                    </td>

                    <td className="px-4 py-3">{a.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500 print:hidden">
          Next: we can also add inline edits for Manufacturer + Model + Part Number.
        </p>
      </div>
    </div>
  );
}
