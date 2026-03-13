import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import SiteAssetsClient from "./SiteAssetsClient";

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

  const rawStatus = (sp.status ?? "").trim();
  const status: "" | "ACTIVE" | "FAULTY" | "DECOMMISSIONED" =
    rawStatus === "ACTIVE" ||
    rawStatus === "FAULTY" ||
    rawStatus === "DECOMMISSIONED"
      ? rawStatus
      : "";

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

  const csvRows = assets.map((a) => ({
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

  const assetRows = assets.map((a) => ({
    id: a.id,
    categoryName: a.category?.name ?? "-",
    subcategoryName: a.subcategory?.name ?? "-",
    assetName: a.assetName,
    serialNumber: a.serialNumber ?? null,
    status: a.status,
  }));

  return (
    <SiteAssetsClient
      siteId={site.id}
      siteName={site.name}
      role={role}
      canEdit={canEdit}
      q={q}
      status={status}
      pageTitle={pageTitle}
      assets={assetRows}
      csvRows={csvRows}
      exportCols={exportCols}
    />
  );
}