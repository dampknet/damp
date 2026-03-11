import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import PrintExportButton from "@/components/PrintExportButton";
import AssetSerialInlineEdit from "@/components/AssetSerialInlineEdit";
import AssetStatusInlineEdit from "@/components/AssetStatusInlineEdit";

type SearchParams = {
  q?: string;
  status?: "ACTIVE" | "FAULTY" | "DECOMMISSIONED" | "";
};

export default async function AllAssetsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim() as SearchParams["status"];

  const assets = await prisma.asset.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { assetName: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { site: { name: { contains: q, mode: "insensitive" } } },
              { category: { name: { contains: q, mode: "insensitive" } } },
              { subcategory: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      site: { select: { name: true } },
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const pageTitleParts = ["All Assets"];
  if (status) pageTitleParts.push(`Status: ${status}`);
  if (q) pageTitleParts.push(`Search: ${q}`);
  const pageTitle = pageTitleParts.join(" — ");

  const exportRows = assets.map((a, index) => ({
    No: index + 1,
    Site: a.site?.name ?? "",
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
    { key: "No", label: "No" },
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
    <div className="min-h-screen bg-[#f5f2ed]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]">
                Asset Registry
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1a1814]">
                All Assets
              </h1>
              <p className="mt-2 text-sm font-medium text-[#8b857c]">
                View all assets across all sites, search them, and print or export.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {profile?.email ? (
                  <>
                    <span className="text-[#b5aea4]">•</span>
                    <span className="text-[#7a746a]">{profile.email}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={pageTitle}
                filename="all-assets.csv"
                rows={exportRows}
                columns={exportCols}
              />
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <form className="grid gap-3 md:grid-cols-3">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search asset, serial, model, manufacturer, site..."
                className="rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
              />

              <select
                name="status"
                defaultValue={status ?? ""}
                className="rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                aria-label="Filter by asset status"
                title="Filter by asset status"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FAULTY">FAULTY</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED</option>
              </select>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  Search
                </button>
                <Link
                  href="/assets"
                  className="text-sm font-semibold text-[#5b564d] hover:underline"
                >
                  Clear
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm font-semibold text-[#1a1814]">Assets</div>
            <div className="text-xs font-medium text-[#8b857c]">
              {assets.length} shown
            </div>
          </div>

          <div className="h-px bg-[#eee7dd]" />

          <div className="max-h-[75vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Site</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Sub</th>
                  <th className="px-5 py-3 font-semibold">Device</th>
                  <th className="px-5 py-3 font-semibold">Serial</th>
                  <th className="px-5 py-3 font-semibold">Manufacturer</th>
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eee7dd]">
                {assets.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-12 text-center text-[#8b857c]"
                      colSpan={9}
                    >
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assets.map((a, index) => (
                    <tr key={a.id} className="hover:bg-[#fcfaf7]">
                      <td className="px-5 py-3 font-medium text-[#6b655d]">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.site?.name ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.category?.name ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.subcategory?.name ?? "-"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#1a1814]">
                        {a.assetName}
                      </td>
                      <td className="px-5 py-3">
                        <AssetSerialInlineEdit
                          assetId={a.id}
                          initialSerial={a.serialNumber ?? null}
                          canEdit={canEdit}
                        />
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.manufacturer ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.model ?? "-"}
                      </td>
                      <td className="px-5 py-3">
                        <AssetStatusInlineEdit
                          assetId={a.id}
                          initialStatus={a.status}
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
      </div>
    </div>
  );
}