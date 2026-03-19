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
    const serialNumber = String(formData.get("serialNumber") ?? "").trim();
    const quantityRaw = String(formData.get("quantity") ?? "").trim();
    const unit = String(formData.get("unit") ?? "").trim();
    const reorderLevelRaw = String(formData.get("reorderLevel") ?? "").trim();
    const targetStockLevelRaw = String(formData.get("targetStockLevel") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "AVAILABLE").trim();
    const conditionRaw = String(formData.get("condition") ?? "").trim();

    const itemType = itemTypeRaw === "EQUIPMENT" ? "EQUIPMENT" : "MATERIAL";

    if (!name) {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent("Item name is required")}`
      );
    }

    const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity < 0) {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent("Quantity must be a valid number")}`
      );
    }

    const reorderLevel = reorderLevelRaw === "" ? 0 : Number(reorderLevelRaw);
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent("Reorder level must be a valid number")}`
      );
    }

    const targetStockLevel =
      targetStockLevelRaw === "" ? null : Number(targetStockLevelRaw);

    if (
      targetStockLevelRaw !== "" &&
      (!Number.isFinite(targetStockLevel) || Number(targetStockLevel) < 0)
    ) {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent("Target stock level must be a valid number")}`
      );
    }

    let preferredStatus: InventoryItemStatus | null = null;
    if (
      statusRaw === "AVAILABLE" ||
      statusRaw === "LOW_STOCK" ||
      statusRaw === "OUT_OF_STOCK" ||
      statusRaw === "CHECKED_OUT" ||
      statusRaw === "INACTIVE"
    ) {
      preferredStatus = statusRaw as InventoryItemStatus;
    }

    const finalStatus = getAutoInventoryStatus({
      quantity: Math.trunc(quantity),
      reorderLevel: Math.trunc(reorderLevel),
      preferredStatus,
    });

    let condition: EquipmentCondition | null = null;
    if (itemType === "EQUIPMENT") {
      if (
        conditionRaw === "GOOD" ||
        conditionRaw === "FAULTY" ||
        conditionRaw === "DAMAGED" ||
        conditionRaw === "UNDER_REPAIR"
      ) {
        condition = conditionRaw as EquipmentCondition;
      } else {
        condition = "GOOD";
      }
    }

    try {
      const createdItem = await prisma.inventoryItem.create({
        data: {
          inventorySiteId: siteId,
          itemType: itemType as InventoryItemType,
          name,
          description: description || null,
          stockNumber: stockNumber || null,
          manufacturer: manufacturer || null,
          model: model || null,
          serialNumber: serialNumber || null,
          quantity: Math.trunc(quantity),
          unit: unit || null,
          reorderLevel: Math.trunc(reorderLevel),
          targetStockLevel:
            targetStockLevel === null ? null : Math.trunc(targetStockLevel),
          status: finalStatus,
          condition,
        },
      });

      await logActivity({
        type: "INVENTORY_ITEM_CREATED",
        title: `Inventory item created: ${createdItem.name}`,
        details: `Created ${createdItem.itemType} item at ${safeSite.name}. Qty: ${createdItem.quantity}${createdItem.unit ? ` ${createdItem.unit}` : ""}. Status: ${createdItem.status}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: createdItem.id,
      });

      if (createdItem.status === "LOW_STOCK") {
        await logActivity({
          type: "INVENTORY_LOW_STOCK",
          title: `Low stock detected: ${createdItem.name}`,
          details: `${createdItem.name} at ${safeSite.name} is low in stock. Qty: ${createdItem.quantity}${createdItem.unit ? ` ${createdItem.unit}` : ""}. Reorder level: ${createdItem.reorderLevel}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: createdItem.id,
        });
      }

      if (createdItem.status === "OUT_OF_STOCK") {
        await logActivity({
          type: "INVENTORY_OUT_OF_STOCK",
          title: `Out of stock: ${createdItem.name}`,
          details: `${createdItem.name} at ${safeSite.name} is out of stock.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: createdItem.id,
        });
      }
    } catch {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent(
          "Could not create inventory item"
        )}`
      );
    }

    redirect(`/store/sites/${siteId}`);
  }

  return <NewInventoryItemClient site={safeSite} action={createInventoryItem} />;
}