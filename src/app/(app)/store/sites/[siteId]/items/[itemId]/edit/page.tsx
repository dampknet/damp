import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import { VALID_ITEM_TYPES } from "@/lib/item-types";
import type { EquipmentCondition, InventoryItemStatus, InventoryItemType } from "@prisma/client";
import EditInventoryItemClient from "./EditInventoryItemClient";

const VALID_CONDITIONS = ["NEW", "UNUSED", "USED", "FAULTY"];

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string; itemId: string }>;
}) {
  const { siteId, itemId } = await params;

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });
  if (!site) return notFound();

  const siteName = site.name;

  const item = await prisma.inventoryItem.findFirst({
    where:  { id: itemId, inventorySiteId: siteId },
    select: {
      id:               true,
      itemType:         true,
      name:             true,
      description:      true,
      itemCode:         true,
      manufacturer:     true,
      model:            true,
      quantity:         true,
      uncountable:      true,
      unit:             true,
      reorderLevel:     true,
      targetStockLevel: true,
      status:           true,
      condition:        true,
      _count:           { select: { instances: true } },
    },
  });
  if (!item) return notFound();

  const { _count, ...rest } = item;
  const safeItem      = rest;
  const instanceCount = _count.instances;

  async function updateInventoryItem(formData: FormData) {
    "use server";

    const itemTypeRaw      = String(formData.get("itemType")         ?? "").trim();
    const name             = String(formData.get("name")             ?? "").trim();
    const description      = String(formData.get("description")      ?? "").trim();
    const itemCode         = String(formData.get("itemCode")         ?? "").trim();
    const manufacturer     = String(formData.get("manufacturer")     ?? "").trim();
    const model            = String(formData.get("model")            ?? "").trim();
    const quantityRaw      = String(formData.get("quantity")         ?? "").trim();
    const unit             = String(formData.get("unit")             ?? "").trim();
    const reorderRaw       = String(formData.get("reorderLevel")     ?? "").trim();
    const targetStockRaw   = String(formData.get("targetStockLevel") ?? "").trim();
    const statusRaw        = String(formData.get("status")           ?? "AVAILABLE").trim();
    const conditionRaw     = String(formData.get("condition")        ?? "NEW").trim();
    const uncountable      = formData.get("uncountable") === "on";
    const generateEntities = formData.get("generateEntities") === "on";

    const itemType  = VALID_ITEM_TYPES.includes(itemTypeRaw as any) ? itemTypeRaw : "GENERAL";
    const condition = (VALID_CONDITIONS.includes(conditionRaw) ? conditionRaw : "NEW") as EquipmentCondition;

    const fail = (msg: string) =>
      redirect(`/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent(msg)}`);

    if (!name) fail("Item name is required");

    const quantity    = uncountable ? 0 : (quantityRaw   === "" ? 0    : Number(quantityRaw));
    const reorder     = uncountable ? 0 : (reorderRaw    === "" ? 0    : Number(reorderRaw));
    const targetStock = uncountable ? null : (targetStockRaw === "" ? null : Number(targetStockRaw));

    const validStatuses   = ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "CHECKED_OUT", "INACTIVE"];
    const preferredStatus = validStatuses.includes(statusRaw) ? (statusRaw as InventoryItemStatus) : null;

    const finalStatus = getAutoInventoryStatus({
      quantity:        Math.trunc(quantity),
      reorderLevel:    Math.trunc(reorder),
      preferredStatus,
      uncountable,
    });

    if (itemCode && itemCode !== safeItem.itemCode) {
      const existing = await prisma.inventoryItem.findFirst({
        where:  { itemCode, NOT: { id: itemId } },
        select: { id: true },
      });
      if (existing) fail(`Item code ${itemCode} is already in use`);
    }

    if (generateEntities && !uncountable && !itemCode) {
      fail("An item code is needed before entity codes can be generated");
    }

    let createdEntities   = 0;
    let conditionChanged  = false;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.inventoryItem.findUnique({
          where:  { id: itemId },
          select: { condition: true },
        });
        conditionChanged = before?.condition !== condition;

        const saved = await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            itemType:         itemType as InventoryItemType,
            name,
            description:      description  || null,
            itemCode:         itemCode     || null,
            manufacturer:     manufacturer || null,
            model:            model        || null,
            quantity:         Math.trunc(quantity),
            uncountable,
            unit:             unit         || null,
            reorderLevel:     Math.trunc(reorder),
            targetStockLevel: targetStock === null ? null : Math.trunc(targetStock),
            status:           finalStatus,
            condition,
          },
        });

        if (conditionChanged) {
          await tx.assetInstance.updateMany({
            where: { inventoryItemId: itemId },
            data:  { condition },
          });
        }

        if (generateEntities && !uncountable && itemCode) {
          const existingUnits = await tx.assetInstance.findMany({
            where:  { inventoryItemId: itemId },
            select: { entityCode: true },
          });

          const missing = Math.trunc(quantity) - existingUnits.length;

          if (missing > 0) {
            let maxSuffix = 0;
            for (const { entityCode } of existingUnits) {
              if (!entityCode?.startsWith(`${itemCode}-`)) continue;
              const n = parseInt(entityCode.slice(itemCode.length + 1), 10);
              if (!isNaN(n) && n > maxSuffix) maxSuffix = n;
            }

            const codes = Array.from({ length: missing }, (_, i) =>
              `${itemCode}-${String(maxSuffix + i + 1).padStart(2, "0")}`
            );

            const clash = await tx.assetInstance.findFirst({
              where:  { entityCode: { in: codes } },
              select: { entityCode: true },
            });
            if (clash) throw new Error(`Entity code ${clash.entityCode} already exists`);

            await tx.assetInstance.createMany({
              data: codes.map((entityCode) => ({
                inventoryItemId: itemId,
                entityCode,
                condition,
                status: "AVAILABLE" as const,
              })),
            });
            createdEntities = missing;
          }
        }

        return saved;
      }, { timeout: 30000 });

      await logActivity({
        type:       "INVENTORY_ITEM_UPDATED",
        title:      `Updated: ${updated.name}`,
        details:    `Site: ${siteName}. Code: ${updated.itemCode ?? "—"}. ${uncountable ? "Qty: N/A." : `Qty: ${updated.quantity}.`} Status: ${updated.status}. Condition: ${condition}${conditionChanged ? " (changed)" : ""}.${createdEntities ? ` ${createdEntities} entity code${createdEntities === 1 ? "" : "s"} generated.` : ""}`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId:   updated.id,
      });
    } catch (e) {
      console.error(e);
      const msg = (e as Error)?.message?.startsWith("Entity code") ? (e as Error).message : "Could not update inventory item";
      fail(msg);
    }

    redirect(`/store/sites/${siteId}`);
  }

  return (
    <EditInventoryItemClient
      site={site}
      item={safeItem}
      instanceCount={instanceCount}
      action={updateInventoryItem}
    />
  );
}
