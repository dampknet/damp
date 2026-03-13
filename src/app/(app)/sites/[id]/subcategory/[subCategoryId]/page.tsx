import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteSubcategoryClient from "./SiteSubcategoryClient";

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

  const csvRows = assets.map((a) => ({
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

  const rows = assets.map((a) => ({
    id: a.id,
    assetName: a.assetName,
    serialNumber: a.serialNumber ?? "-",
    manufacturer: a.manufacturer ?? "-",
    model: a.model ?? "-",
    status: a.status,
  }));

  return (
    <SiteSubcategoryClient
      siteId={site.id}
      siteName={site.name}
      subId={sub.id}
      subName={sub.name}
      categoryName={category?.name ?? "-"}
      q={q}
      pageTitle={pageTitle}
      csvRows={csvRows}
      exportCols={exportCols}
      rows={rows}
    />
  );
}