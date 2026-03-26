import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { PreviewRow, ValidRow } from "@/lib/inventory-upload";
import UploadInventoryExcelClient from "./UploadInventoryExcelClient";

async function buildInventoryTemplateDataUrl() {
  const XLSX = await import("xlsx");

  const rows = [
    [
      "itemType",
      "name",
      "description",
      "stockNumber",
      "manufacturer",
      "model",
      "serialNumber",
      "quantity",
      "unit",
      "reorderLevel",
      "targetStockLevel",
      "status",
      "condition",
    ],
    [
      "MATERIAL",
      "Coaxial Cable",
      "75 ohm cable roll",
      "MAT-001",
      "Belden",
      "RG6",
      "",
      10,
      "rolls",
      2,
      15,
      "AVAILABLE",
      "",
    ],
    [
      "EQUIPMENT",
      "Signal Generator",
      "Portable signal generator",
      "EQ-001",
      "Rohde & Schwarz",
      "SMB100A",
      "SG-2026-001",
      1,
      "pcs",
      0,
      "",
      "AVAILABLE",
      "GOOD",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryTemplate");

  const base64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeUpper(v: unknown) {
  return normalizeText(v).toUpperCase();
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default async function UploadInventoryExcelPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { siteId } = await params;
  const sp = (await searchParams) ?? {};

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findFirst({
    where: { id: siteId, isDeleted: false },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();

  async function confirmInventoryExcelImport(formData: FormData) {
    "use server";

    const freshProfile = await getCurrentProfile();
    const freshRole = freshProfile?.role ?? "VIEWER";
    const freshCanEdit = freshRole === "ADMIN" || freshRole === "EDITOR";

    if (!freshCanEdit) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(
          "You are not allowed to import inventory files"
        )}`
      );
    }

    const previewPayload = normalizeText(formData.get("previewPayload"));
    const validRowsPayload = normalizeText(formData.get("validRowsPayload"));

    const preview = decodeJson<PreviewRow[]>(previewPayload) ?? [];
    const validRows = decodeJson<ValidRow[]>(validRowsPayload) ?? [];

    if (validRows.length === 0) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(
          "No valid rows available to import"
        )}`
      );
    }

    const existingSite = await prisma.inventorySite.findFirst({
      where: { id: siteId, isDeleted: false },
      select: { id: true, name: true },
    });

    if (!existingSite) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(
          "Inventory site not found"
        )}`
      );
    }

    const stockNumbers = validRows
      .map((row) => normalizeUpper(row.stockNumber))
      .filter(Boolean);

    const serialNumbers = validRows
      .map((row) => normalizeUpper(row.serialNumber))
      .filter(Boolean);

    const duplicateWhere =
      stockNumbers.length > 0 || serialNumbers.length > 0
        ? {
            OR: [
              ...(stockNumbers.length > 0
                ? [{ stockNumber: { in: stockNumbers } } as const]
                : []),
              ...(serialNumbers.length > 0
                ? [{ serialNumber: { in: serialNumbers } } as const]
                : []),
            ],
          }
        : undefined;

    const existingItems = duplicateWhere
      ? await prisma.inventoryItem.findMany({
          where: {
            inventorySiteId: siteId,
            isDeleted: false,
            ...duplicateWhere,
          },
          select: {
            stockNumber: true,
            serialNumber: true,
          },
        })
      : [];

    if (existingItems.length > 0) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(
          "Some rows can no longer be imported because matching stock or serial numbers now exist. Please preview the file again."
        )}`
      );
    }

    const created = await prisma.inventoryItem.createMany({
      data: validRows.map((row) => ({
        inventorySiteId: siteId,
        ...row,
      })),
    });

    await logActivity({
      type: "INVENTORY_IMPORT",
      title: `Inventory Excel import completed for ${existingSite.name}`,
      details: `Imported ${created.count} valid row(s) into ${existingSite.name}. Total rows read: ${preview.length}. Invalid/skipped rows: ${preview.filter((row) => !!row.error).length}.`,
      actorEmail: freshProfile?.email ?? null,
      entityType: "INVENTORY_SITE",
      entityId: existingSite.id,
    });

    redirect(
      `/store/sites/${siteId}/upload?success=${encodeURIComponent(
        `${created.count} row(s) imported successfully`
      )}`
    );
  }

  const templateHref = await buildInventoryTemplateDataUrl();

  return (
    <UploadInventoryExcelClient
      site={site}
      confirmAction={confirmInventoryExcelImport}
      templateHref={templateHref}
      templateFileName="inventory-import-template.xlsx"
      serverError={sp.error ?? null}
      serverSuccess={sp.success ?? null}
    />
  );
}