import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteCategoryClient from "./SiteCategoryClient";

type SearchParams = { q?: string };

export default async function SiteCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; categoryId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id, categoryId } = await params;
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!site) return notFound();

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!category) return notFound();

  const assets = await prisma.asset.findMany({
    where: {
      siteId: site.id,
      categoryId: category.id,
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
    include: { subcategory: { select: { name: true } } },
  });

  const pageTitle = `${site.name} — ${category.name}`;

  const csvRows = assets.map((a) => ({
    Site: site.name,
    Category: category.name,
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

  const rows = assets.map((a) => ({
    id: a.id,
    subcategoryName: a.subcategory?.name ?? "-",
    assetName: a.assetName,
    serialNumber: a.serialNumber ?? "-",
    status: a.status,
  }));

  return (
    <SiteCategoryClient
      siteId={site.id}
      siteName={site.name}
      categoryId={category.id}
      categoryName={category.name}
      q={q}
      pageTitle={pageTitle}
      csvRows={csvRows}
      exportCols={exportCols}
      rows={rows}
    />
  );
}