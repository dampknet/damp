import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintExportButton from "@/components/PrintExportButton";

type SearchParams = { q?: string };

export default async function SiteSubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subCategoryId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id, subCategoryId } = await params;
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!site) return notFound();

  const sub = await prisma.subcategory.findUnique({
    where: { id: subCategoryId },
    select: { id: true, name: true, categoryId: true },
  });
  if (!sub) return notFound();

  const category = await prisma.category.findUnique({
    where: { id: sub.categoryId },
    select: { id: true, name: true },
  });

  const assets = await prisma.asset.findMany({
    where: {
      siteId: site.id,
      subcategoryId: sub.id,
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
  });

  const pageTitleParts = [`${site.name} — ${sub.name}`];
  if (q) pageTitleParts.push(`Search: ${q}`);
  const pageTitle = pageTitleParts.join(" — ");

  const csvRows = assets.map((a: (typeof assets)[number]) => ({
    Site: site.name,
    Category: category?.name ?? "",
    Subcategory: sub.name,
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
              {site.name} — {sub.name}
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Category:{" "}
              <span className="font-medium">{category?.name ?? "-"}</span>
            </p>
          </div>

          <div className="print:hidden">
            <PrintExportButton
              title={pageTitle}
              filename={`${site.name}-${sub.name}.csv`}
              rows={csvRows}
              columns={exportCols}
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-4 print:hidden">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, serial, model, manufacturer…"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Search
            </button>
            <Link
              href={`/sites/${site.id}/subcategory/${sub.id}`}
              className="text-sm font-medium text-gray-700 hover:underline"
            >
              Clear
            </Link>
          </form>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-600" colSpan={5}>
                    No devices yet under this subcategory.
                  </td>
                </tr>
              ) : (
                assets.map((a: (typeof assets)[number]) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.assetName}
                    </td>
                    <td className="px-4 py-3">{a.serialNumber ?? "-"}</td>
                    <td className="px-4 py-3">{a.manufacturer ?? "-"}</td>
                    <td className="px-4 py-3">{a.model ?? "-"}</td>
                    <td className="px-4 py-3">{a.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
