import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import type {
  EquipmentCondition,
  InventoryItemStatus,
  InventoryItemType,
} from "@prisma/client";
import NewInventoryItemClient from "./NewInventoryItemClient";

export default async function NewInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  async function createInventoryItem(formData: FormData) {
    "use server";

    const itemTypeRaw = String(formData.get("itemType") ?? "MATERIAL").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const stockNumber = String(formData.get("stockNumber") ?? "").trim();
    const manufacturer = String(formData.get("manufacturer") ?? "").trim();
    const model = String(formData.get("model") ?? "").trim();
    const quantityRaw = String(formData.get("quantity") ?? "").trim();
    const unit = String(formData.get("unit") ?? "").trim();
    const reorderLevelRaw = String(formData.get("reorderLevel") ?? "").trim();
    const targetStockLevelRaw = String(formData.get("targetStockLevel") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "AVAILABLE").trim();
    const conditionRaw = String(formData.get("condition") ?? "").trim();

    const itemType = itemTypeRaw === "EQUIPMENT" ? "EQUIPMENT" : "MATERIAL";

    if (!name) {
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Item name is required")}`);
    }

    const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
    const reorderLevel = reorderLevelRaw === "" ? 0 : Number(reorderLevelRaw);
    const targetStockLevel = targetStockLevelRaw === "" ? null : Number(targetStockLevelRaw);

    let preferredStatus: InventoryItemStatus | null = null;
    if (["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "CHECKED_OUT", "INACTIVE"].includes(statusRaw)) {
      preferredStatus = statusRaw as InventoryItemStatus;
    }

    const finalStatus = getAutoInventoryStatus({
      quantity: Math.trunc(quantity),
      reorderLevel: Math.trunc(reorderLevel),
      preferredStatus,
    });

    const condition = (["GOOD", "FAULTY", "DAMAGED", "UNDER_REPAIR"].includes(conditionRaw) 
      ? conditionRaw 
      : "GOOD") as EquipmentCondition;

    try {
      await prisma.$transaction(async (tx) => {
        const createdItem = await tx.inventoryItem.create({
          data: {
            inventorySiteId: siteId,
            itemType: itemType as InventoryItemType,
            name,
            description: description || null,
            stockNumber: stockNumber || null,
            manufacturer: manufacturer || null,
            model: model || null,
            quantity: Math.trunc(quantity),
            unit: unit || null,
            reorderLevel: Math.trunc(reorderLevel),
            targetStockLevel: targetStockLevel === null ? null : Math.trunc(targetStockLevel),
            status: finalStatus,
            condition,
          },
        });

        if (quantity > 0) {
          await tx.assetInstance.createMany({
            data: Array.from({ length: Math.trunc(quantity) }).map((_, i) => ({
              inventoryItemId: createdItem.id,
              serialNumber: `PENDING-${createdItem.id.slice(0,4)}-${i+1}`,
              // ✅ FIX: Use "AVAILABLE" or "INACTIVE" to match InventoryItemStatus enum
              status: finalStatus === "AVAILABLE" ? "AVAILABLE" : "INACTIVE", 
              condition: condition,
            }))
          });
        }

        await logActivity({
          type: "INVENTORY_ITEM_CREATED",
          title: `Inventory item created: ${createdItem.name}`,
          details: `Created ${createdItem.itemType} item at ${safeSite.name}. Qty: ${createdItem.quantity}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: createdItem.id,
        });
      });

    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Could not create inventory item")}`);
    }

    redirect(`/store/sites/${siteId}`);
  }

  return <NewInventoryItemClient site={safeSite} action={createInventoryItem} />;
}