import { canEditStore, storeEditor } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, isAdminProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getWarehouseTypeOptions } from "@/lib/item-type-registry";
import {
  generateItemCode,
  generateEntityCodes,
  getSitePrefix,
  type ValidRow,
} from "@/lib/inventory-upload";
import UploadInventoryExcelClient from "./UploadInventoryExcelClient";

async function buildInventoryTemplateDataUrl() {
  const XLSX = await import("xlsx");

  const headers = [
    "itemtype",
    "subtype",
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
  params:        Promise<{ siteId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { siteId } = await params;
  const sp         = (await searchParams) ?? {};

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = canEditStore(profile, siteId); // editor role + full access here

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findFirst({
    where:  { id: siteId, isDeleted: false },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  async function confirmInventoryExcelImport(formData: FormData) {
    "use server";

    const freshProfile = await storeEditor(siteId); // re-check: editor + full access here
    const freshRole    = freshProfile?.role ?? "VIEWER";
    if (freshRole !== "ADMIN" && freshRole !== "EDITOR") {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("Permission denied")}`);
    }

    const validRowsPayload = normalizeText(formData.get("validRowsPayload"));
    const validRows        = decodeJson<(ValidRow & { createEntities?: boolean })[]>(validRowsPayload) ?? [];

    if (validRows.length === 0) {
      redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent("No valid rows to import")}`);
    }

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

    const sitePrefix = await getSitePrefix(siteId);

    // Re-check every row's type on the server: it must be switched on for this warehouse.
    const [typeRows, siteLinks] = await Promise.all([
      prisma.itemType.findMany({ select: { id: true, parentId: true, legacyKey: true, defaultCode: true } }),
      prisma.warehouseItemType.findMany({ where: { inventorySiteId: siteId, enabled: true }, select: { itemTypeId: true, code: true } }),
    ]);
    const typeById = new Map(typeRows.map((t) => [t.id, t]));
    const onHere   = new Map(siteLinks.map((l) => [l.itemTypeId, l]));
    for (const row of validRows) {
      const t = typeById.get(row.typeId);
      const s = row.subTypeId ? typeById.get(row.subTypeId) : null;
      if (!t || t.parentId || !onHere.has(t.id) || (row.subTypeId && (!s || s.parentId !== t.id || !onHere.has(s.id)))) {
        redirect(`/store/sites/${siteId}/upload?error=${encodeURIComponent(`"${row.name}": its item type isn't set up for this warehouse — preview the file again.`)}`);
      }
      row.itemType = t.legacyKey ?? "GENERAL";
    }

    // Allocate auto item codes up front, in sequence per short code. (Generating them one by one inside the
    // transaction can't see the rows just created in it, so every row got the same code.)
    const autoCodes = new Map<number, string>();
    const nextNum   = new Map<string, number>();
    for (let i = 0; i < validRows.length; i++) {
      if ((validRows[i].itemCode ?? "").trim()) continue;
      const t    = typeById.get(validRows[i].typeId)!;
      const code = onHere.get(t.id)?.code || t.defaultCode || "GEN";
      const pattern = `${sitePrefix}-${code}-`;
      if (!nextNum.has(pattern)) {
        const first = await generateItemCode({ code, sitePrefix });   // next free number in the database
        let n = parseInt(first.slice(pattern.length), 10);
        // Don't collide with codes typed into this same file.
        for (const r of validRows) {
          const c = (r.itemCode ?? "").trim().toUpperCase();
          if (c.startsWith(pattern.toUpperCase())) n = Math.max(n, (parseInt(c.slice(pattern.length).split("-")[0], 10) || 0) + 1);
        }
        nextNum.set(pattern, n);
      }
      const n = nextNum.get(pattern)!;
      autoCodes.set(i, `${pattern}${String(n).padStart(3, "0")}`);
      nextNum.set(pattern, n + 1);
    }

    try {
      let importedCount = 0;

      await prisma.$transaction(
        async (tx) => {
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const itemCode = (row.itemCode ?? "").trim() || autoCodes.get(i)!;

            const created = await tx.inventoryItem.create({
              data: {
                inventorySiteId:  siteId,
                itemType:         row.itemType,
                typeId:           row.typeId,
                subTypeId:        row.subTypeId,
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
                condition:        row.condition,
              },
            });

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
      canManageTypes={isAdminProfile(profile)}
      typesHere={(await getWarehouseTypeOptions(siteId)).map((t) => ({
        name: t.name, code: t.code, subTypes: t.subTypes.map((s) => s.name),
      }))}
    />
  );
}
