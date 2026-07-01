import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import { generateItemCode } from "@/lib/inventory-upload";
import type { EquipmentCondition, InventoryItemStatus, InventoryItemType } from "@prisma/client";
import NewInventoryItemClient from "./NewInventoryItemClient";

const VALID_TYPES = [
  "EQUIPMENT", "ACCESSORIES", "TOOLS_AND_PARTS",
  "GENERAL", "COOLING_INFRASTRUCTURE", "CABLES_AND_ELECTRONICS",
];

export default async function NewInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });
  if (!site) return notFound();

  // Get site prefix from existing items
  async function getSitePrefix(): Promise<string> {
    const sample = await prisma.inventoryItem.findFirst({
      where:  { inventorySiteId: siteId, itemCode: { not: null } },
      select: { itemCode: true },
    });
    if (sample?.itemCode) {
      const parts = sample.itemCode.split("-");
      if (parts.length >= 1) return parts[0];
    }
    return site!.name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  }

  async function createInventoryItem(formData: FormData) {
    "use server";

    const itemTypeRaw    = String(formData.get("itemType")        ?? "EQUIPMENT").trim();
    const name           = String(formData.get("name")            ?? "").trim();
    const description    = String(formData.get("description")     ?? "").trim();
    const itemCodeRaw    = String(formData.get("itemCode")        ?? "").trim();
    const manufacturer   = String(formData.get("manufacturer")    ?? "").trim();
    const model          = String(formData.get("model")           ?? "").trim();
    const quantityRaw    = String(formData.get("quantity")        ?? "").trim();
    const unit           = String(formData.get("unit")            ?? "").trim();
    const reorderRaw     = String(formData.get("reorderLevel")    ?? "").trim();
    const targetRaw      = String(formData.get("targetStockLevel") ?? "").trim();
    const conditionRaw   = String(formData.get("condition")       ?? "NEW").trim();

    const itemType = VALID_TYPES.includes(itemTypeRaw) ? itemTypeRaw : "GENERAL";

    if (!name) {
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Item name is required")}`);
    }

    const quantity    = quantityRaw === "" ? 0 : Number(quantityRaw);
    const reorder     = reorderRaw  === "" ? 0 : Number(reorderRaw);
    const targetStock = targetRaw   === "" ? null : Number(targetRaw);

    const finalStatus = getAutoInventoryStatus({
      quantity:        Math.trunc(quantity),
      reorderLevel:    Math.trunc(reorder),
      preferredStatus: null,
    });

    const condition = (["NEW","UNUSED","USED","FAULTY"].includes(conditionRaw)
      ? conditionRaw : "NEW") as EquipmentCondition;

    // Resolve item code
    let itemCode = itemCodeRaw || null;
    if (!itemCode) {
      const sitePrefix = await getSitePrefix();
      itemCode = await generateItemCode({ itemType: itemType as InventoryItemType, sitePrefix });
    } else {
      // Check uniqueness
      const existing = await prisma.inventoryItem.findFirst({
        where: { itemCode }, select: { id: true },
      });
      if (existing) {
        redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent(`Item code ${itemCode} already exists`)}`);
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.inventoryItem.create({
          data: {
            inventorySiteId:  siteId,
            itemType:         itemType as InventoryItemType,
            itemCode,
            name,
            description:      description  || null,
            manufacturer:     manufacturer  || null,
            model:            model         || null,
            quantity:         Math.trunc(quantity),
            unit:             unit           || null,
            reorderLevel:     Math.trunc(reorder),
            targetStockLevel: targetStock === null ? null : Math.trunc(targetStock),
            status:           finalStatus,
          },
        });

        // Create entity slots with generated entity codes
        if (quantity > 0) {
          await tx.assetInstance.createMany({
            data: Array.from({ length: Math.trunc(quantity) }).map((_, i) => ({
              inventoryItemId: created.id,
              entityCode:      `${itemCode}-${String(i + 1).padStart(2, "0")}`,
              status:          "AVAILABLE" as const,
              condition,
            })),
          });
        }

        await logActivity({
          type:       "INVENTORY_ITEM_CREATED",
          title:      `Created: ${created.name}`,
          details:    `Code: ${itemCode}. Site: ${site!.name}. Qty: ${created.quantity}. Condition: ${condition}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId:   created.id,
        });
      });
    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Could not create inventory item")}`);
    }

    redirect(`/store/sites/${siteId}`);
  }

  return <NewInventoryItemClient site={site} action={createInventoryItem} />;
}
