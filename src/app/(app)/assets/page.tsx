import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import AssetsClient from "./AssetsClient";

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
  const rawStatus = (sp.status ?? "").trim();

  const status: "" | "ACTIVE" | "FAULTY" | "DECOMMISSIONED" =
    rawStatus === "ACTIVE" ||
    rawStatus === "FAULTY" ||
    rawStatus === "DECOMMISSIONED"
      ? rawStatus
      : "";

  const assets = await prisma.asset.findMany({
    where: {
      isDeleted: false,
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

  const assetRows = assets.map((a, index) => ({
    id: a.id,
    no: index + 1,
    siteName: a.site?.name ?? "-",
    categoryName: a.category?.name ?? "-",
    subcategoryName: a.subcategory?.name ?? "-",
    assetName: a.assetName,
    serialNumber: a.serialNumber ?? null,
    manufacturer: a.manufacturer ?? "-",
    model: a.model ?? "-",
    status: a.status,
  }));

  return (
    <AssetsClient
      role={role}
      email={profile?.email ?? null}
      canEdit={canEdit}
      q={q}
      status={status}
      pageTitle={pageTitle}
      assets={assetRows}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}