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
      10,
      "rolls",
      2,
      15,
      "AVAILABLE",
      "NEW", // ✅ Added NEW to template
    ],
    [
      "EQUIPMENT",
      "Signal Generator",
      "Portable signal generator",
      "EQ-001",
      "Rohde & Schwarz",
      "SMB100A",
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
  const safeSite = site; // ✅ Defined to fix "site is possibly null" errors

  async function confirmInventoryExcelImport(formData: FormData) {
    "use server";

    const freshProfile = await getCurrentProfile();
    const freshRole = freshProfile?.role ?? "VIEWER";
    const freshCanEdit = freshRole === "ADMIN" || freshRole === "EDITOR";

    if (!freshCanEdit) {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("Permission denied")}`);
    }

    const previewPayload = normalizeText(formData.get("previewPayload"));
    const validRowsPayload = normalizeText(formData.get("validRowsPayload"));

    const preview = decodeJson<PreviewRow[]>(previewPayload) ?? [];
    const validRows = decodeJson<ValidRow[]>(validRowsPayload) ?? [];

    if (validRows.length === 0) {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("No valid rows to import")}`);
    }

    const stockNumbers = validRows
      .map((row) => normalizeUpper(row.stockNumber))
      .filter(Boolean);

    const existingItems = stockNumbers.length > 0 
      ? await prisma.inventoryItem.findMany({
          where: {
            inventorySiteId: siteId,
            isDeleted: false,
            stockNumber: { in: stockNumbers },
          },
          select: { stockNumber: true },
        })
      : [];

    if (existingItems.length > 0) {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("Duplicate stock numbers detected.")}`);
    }

    try {
      let importedCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          // Normalize condition to include NEW and OLD
          const condition = (["NEW", "OLD", "GOOD", "FAULTY", "DAMAGED", "UNDER_REPAIR"].includes(normalizeUpper(row.condition))
            ? normalizeUpper(row.condition)
            : "GOOD") as any;

          // 1. Create Master Item
          const item = await tx.inventoryItem.create({
            data: {
              inventorySiteId: siteId,
              itemType: row.itemType,
              name: row.name,
              description: row.description,
              stockNumber: row.stockNumber,
              manufacturer: row.manufacturer,
              model: row.model,
              quantity: Math.trunc(row.quantity),
              unit: row.unit,
              reorderLevel: Math.trunc(row.reorderLevel),
              targetStockLevel: row.targetStockLevel,
              status: row.status,
              condition: condition,
            },
          });

          // 2. Create Instance Slots
          if (row.quantity > 0) {
            await tx.assetInstance.createMany({
              data: Array.from({ length: Math.trunc(row.quantity) }).map((_, i) => ({
                inventoryItemId: item.id,
                serialNumber: `IMPORT-${item.id.slice(-4)}-${i + 1}`,
                status: row.status === "AVAILABLE" ? "AVAILABLE" : "INACTIVE",
                condition: condition,
              })),
            });
          }
          importedCount++;
        }
      });

      await logActivity({
        type: "INVENTORY_IMPORT",
        title: `Excel import completed: ${importedCount} items`,
        details: `Imported into ${safeSite.name}.`,
        actorEmail: freshProfile?.email ?? null,
        entityType: "INVENTORY_SITE",
        entityId: safeSite.id,
      });

    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("Import failed during database write")}`);
    }

    redirect(`/store/sites/${siteId}/upload?success=${encodeURIComponent(`${validRows.length} items imported successfully`)}`);
  }

  const templateHref = await buildInventoryTemplateDataUrl();

  return (
    <UploadInventoryExcelClient
      site={safeSite}
      confirmAction={confirmInventoryExcelImport}
      templateHref={templateHref}
      templateFileName="inventory-import-template.xlsx"
      serverError={sp.error ?? null}
      serverSuccess={sp.success ?? null}
    />
  );
}