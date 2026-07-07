import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import { generateItemCode } from "@/lib/inventory-upload";
import type { EquipmentCondition, InventoryItemType } from "@prisma/client";
import NewInventoryItemClient from "./NewInventoryItemClient";

const VALID_TYPES = [
  "EQUIPMENT", "ACCESSORIES", "TOOLS_AND_PARTS",
  "GENERAL", "COOLING_INFRASTRUCTURE", "CABLES_AND_ELECTRONICS",
];

// ✅ Module-level — not inside the page component, so it never gets serialized
async function getSitePrefix(siteId: string): Promise<string> {
  const sample = await prisma.inventoryItem.findFirst({
    where:  { inventorySiteId: siteId, itemCode: { not: null } },
    select: { itemCode: true },
  });
  if (sample?.itemCode) {
    const parts = sample.itemCode.split("-");
    if (parts.length >= 1) return parts[0];
  }
  // Fallback: derive from site name
  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { name: true },
  });
  return (site?.name ?? "SITE").replace(/\s+/g, "").toUpperCase().slice(0, 4);
}

export default async function NewInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });
  if (!site) return notFound();

  // Capture primitives for the server action closure
  const siteName = site.name;

  async function createInventoryItem(formData: FormData) {
    "use server";

    const itemTypeRaw  = String(formData.get("itemType")         ?? "EQUIPMENT").trim();
    const name         = String(formData.get("name")             ?? "").trim();
    const description  = String(formData.get("description")      ?? "").trim();
    const itemCodeRaw  = String(formData.get("itemCode")         ?? "").trim();
    const manufacturer = String(formData.get("manufacturer")     ?? "").trim();
    const model        = String(formData.get("model")            ?? "").trim();
    const quantityRaw  = String(formData.get("quantity")         ?? "").trim();
    const unit         = String(formData.get("unit")             ?? "").trim();
    const reorderRaw   = String(formData.get("reorderLevel")     ?? "").trim();
    const targetRaw    = String(formData.get("targetStockLevel") ?? "").trim();
    const conditionRaw = String(formData.get("condition")        ?? "NEW").trim();
    const uncountable  = formData.get("uncountable") === "on";

    const itemType = VALID_TYPES.includes(itemTypeRaw) ? itemTypeRaw : "GENERAL";

    if (!name) {
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Item name is required")}`);
    }

    const quantity    = uncountable ? 0 : (quantityRaw === "" ? 0 : Number(quantityRaw));
    const reorder     = uncountable ? 0 : (reorderRaw  === "" ? 0 : Number(reorderRaw));
    const targetStock = uncountable ? null : (targetRaw === "" ? null : Number(targetRaw));

    const finalStatus = getAutoInventoryStatus({
      quantity:     Math.trunc(quantity),
      reorderLevel: Math.trunc(reorder),
      uncountable,
    });

    const condition = (["NEW","UNUSED","USED","FAULTY"].includes(conditionRaw)
      ? conditionRaw : "NEW") as EquipmentCondition;

    // Resolve item code
    let itemCode = itemCodeRaw || null;
    if (!itemCode) {
      const prefix = await getSitePrefix(siteId); // ✅ called as module function
      itemCode = await generateItemCode({ itemType: itemType as InventoryItemType, sitePrefix: prefix });
    } else {
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
            description:      description   || null,
            manufacturer:     manufacturer  || null,
            model:            model         || null,
            quantity:         Math.trunc(quantity),
            uncountable,
            unit:             unit          || null,
            reorderLevel:     Math.trunc(reorder),
            targetStockLevel: targetStock === null ? null : Math.trunc(targetStock),
            status:           finalStatus,
          },
        });

        // Only create entity slots for countable items with quantity > 0
        if (!uncountable && quantity > 0) {
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
          details:    `Code: ${itemCode}. Site: ${siteName}. ${uncountable ? "Quantity: N/A." : `Qty: ${created.quantity}.`} Condition: ${condition}.`,
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
