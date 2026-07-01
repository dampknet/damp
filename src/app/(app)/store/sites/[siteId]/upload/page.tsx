import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  parseInventoryFile,
  generateItemCode,
  generateEntityCodes,
  type ValidRow,
} from "@/lib/inventory-upload";
import UploadInventoryExcelClient from "./UploadInventoryExcelClient";

/* ── Site prefix extracted from first existing item code or fallback ── */
async function getSitePrefix(siteId: string, siteName: string): Promise<string> {
  const sample = await prisma.inventoryItem.findFirst({
    where:  { inventorySiteId: siteId, itemCode: { not: null } },
    select: { itemCode: true },
  });

  if (sample?.itemCode) {
    // e.g. "KNET-EQUIP-001" → "KNET"
    const parts = sample.itemCode.split("-");
    if (parts.length >= 1) return parts[0];
  }

  // Fallback: first 4 chars of site name uppercased
  return siteName.replace(/\s+/g, "").toUpperCase().slice(0, 4);
}

async function buildInventoryTemplateDataUrl() {
  const XLSX = await import("xlsx");

  const headers = [
    "itemtype",
    "name",
    "description",
    "manufacturer",
    "item code",
    "serial number",
    "quantity",
    "unit",
    "reorderlevel",
    "targetstock level",
    "condition",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryTemplate");

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function decodeJson<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch { return null; }
}

export default async function UploadInventoryExcelPage({
  params,
  searchParams,
}: {
  params:       Promise<{ siteId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { siteId } = await params;
  const sp         = (await searchParams) ?? {};

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findFirst({
    where:  { id: siteId, isDeleted: false },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  /* ─────────────────────────────────────────────────────────────────────────
   * SERVER ACTION — called when the user clicks "Confirm Import"
   * ───────────────────────────────────────────────────────────────────────── */
  async function confirmInventoryExcelImport(formData: FormData) {
    "use server";

    const freshProfile = await getCurrentProfile();
    const freshRole    = freshProfile?.role ?? "VIEWER";
    if (freshRole !== "ADMIN" && freshRole !== "EDITOR") {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("Permission denied")}`);
    }

    const validRowsPayload = normalizeText(formData.get("validRowsPayload"));
    const validRows        = decodeJson<(ValidRow & { createEntities?: boolean })[]>(validRowsPayload) ?? [];

    if (validRows.length === 0) {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("No valid rows to import")}`);
    }

    /* ── Duplicate item-code check before touching DB ── */
    const suppliedCodes = validRows
      .map((r) => (r.itemCode ?? "").trim().toUpperCase())
      .filter(Boolean);

    if (suppliedCodes.length > 0) {
      const existing = await prisma.inventoryItem.findMany({
        where:  { itemCode: { in: suppliedCodes } },
        select: { itemCode: true },
      });
      if (existing.length > 0) {
        const dupes = existing.map((e) => e.itemCode).join(", ");
        redirect(
          `/store/sites/${siteId}/upload?error=${encodeURIComponent(
            `These item codes already exist: ${dupes}. Use Restock for existing items.`
          )}`
        );
      }
    }

    const sitePrefix = await getSitePrefix(siteId, safeSite.name);

    try {
      let importedCount = 0;

      await prisma.$transaction(
        async (tx) => {
          for (const row of validRows) {
            /* ── Resolve / auto-generate item code ── */
            let itemCode = (row.itemCode ?? "").trim() || null;
            if (!itemCode) {
              itemCode = await generateItemCode({ itemType: row.itemType, sitePrefix });
            }

            /* ── Create master InventoryItem ── */
            const created = await tx.inventoryItem.create({
              data: {
                inventorySiteId:  siteId,
                itemType:         row.itemType,
                itemCode,
                name:             row.name,
                description:      row.description,
                manufacturer:     row.manufacturer,
                model:            row.model,
                quantity:         row.quantity,
                uncountable:      row.uncountable,
                unit:             row.unit,
                reorderLevel:     row.reorderLevel,
                targetStockLevel: row.targetStockLevel,
                status:           row.status,
              },
            });

            /* ── Create AssetInstances if user ticked "Create Entities" ── */
            if (row.createEntities && !row.uncountable && row.quantity > 0) {
              const entityCodes = generateEntityCodes(itemCode, row.quantity);
              await tx.assetInstance.createMany({
                data: entityCodes.map((entityCode) => ({
                  inventoryItemId: created.id,
                  entityCode,
                  serialNumber:    row.serialNumber || null,
                  condition:       row.condition,
                  status:          "AVAILABLE" as const,
                })),
              });
            }

            importedCount++;
          }
        },
        { timeout: 30_000 }
      );

      await logActivity({
        type:       "INVENTORY_IMPORT",
        title:      `Excel import completed: ${importedCount} items`,
        details:    `Imported into ${safeSite.name}. ${validRows.filter((r) => r.createEntities).length} items had entities generated.`,
        actorEmail: freshProfile?.email ?? null,
        entityType: "INVENTORY_SITE",
        entityId:   safeSite.id,
      });
    } catch (e) {
      console.error(e);
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(
          "Import failed. The file may be too large or contain too many entities."
        )}`
      );
    }

    redirect(
      `/store/sites/${siteId}/upload?success=${encodeURIComponent(
        `${validRows.length} items imported successfully`
      )}`
    );
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
