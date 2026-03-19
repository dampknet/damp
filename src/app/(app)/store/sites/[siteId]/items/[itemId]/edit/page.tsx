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
import EditInventoryItemClient from "./EditInventoryItemClient";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string; itemId: string }>;
}) {
  const { siteId, itemId } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      inventorySiteId: siteId,
    },
    select: {
      id: true,
      itemType: true,
      name: true,
      description: true,
      stockNumber: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      quantity: true,
      unit: true,
      reorderLevel: true,
      targetStockLevel: true,
      status: true,
      condition: true,
    },
  });

  if (!item) return notFound();

  const safeSite = site;
  const safeItem = item;

  async function updateInventoryItem(formData: FormData) {
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
        `/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Item name is required")}`
      );
    }

    const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity < 0) {
      redirect(
        `/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Quantity must be a valid number")}`
      );
    }

    const reorderLevel = reorderLevelRaw === "" ? 0 : Number(reorderLevelRaw);
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      redirect(
        `/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Reorder level must be a valid number")}`
      );
    }

    const targetStockLevel =
      targetStockLevelRaw === "" ? null : Number(targetStockLevelRaw);

    if (
      targetStockLevelRaw !== "" &&
      (!Number.isFinite(targetStockLevel) || Number(targetStockLevel) < 0)
    ) {
      redirect(
        `/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Target stock level must be a valid number")}`
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
      const beforeSummary = `Before → Name: ${safeItem.name}, Type: ${safeItem.itemType}, Qty: ${safeItem.quantity}${safeItem.unit ? ` ${safeItem.unit}` : ""}, Status: ${safeItem.status}`;

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
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

      const afterSummary = `After → Name: ${updatedItem.name}, Type: ${updatedItem.itemType}, Qty: ${updatedItem.quantity}${updatedItem.unit ? ` ${updatedItem.unit}` : ""}, Status: ${updatedItem.status}`;

      await logActivity({
        type: "INVENTORY_ITEM_UPDATED",
        title: `Inventory item updated: ${updatedItem.name}`,
        details: `${beforeSummary}. ${afterSummary}. Site: ${safeSite.name}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: updatedItem.id,
      });

      if (updatedItem.status === "LOW_STOCK") {
        await logActivity({
          type: "INVENTORY_LOW_STOCK",
          title: `Low stock detected: ${updatedItem.name}`,
          details: `${updatedItem.name} at ${safeSite.name} is low in stock. Qty: ${updatedItem.quantity}${updatedItem.unit ? ` ${updatedItem.unit}` : ""}. Reorder level: ${updatedItem.reorderLevel}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: updatedItem.id,
        });
      }

      if (updatedItem.status === "OUT_OF_STOCK") {
        await logActivity({
          type: "INVENTORY_OUT_OF_STOCK",
          title: `Out of stock: ${updatedItem.name}`,
          details: `${updatedItem.name} at ${safeSite.name} is out of stock.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: updatedItem.id,
        });
      }
    } catch {
      redirect(
        `/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent(
          "Could not update inventory item"
        )}`
      );
    }

    redirect(`/store/sites/${siteId}`);
  }

  return (
    <EditInventoryItemClient
      site={safeSite}
      item={safeItem}
      action={updateInventoryItem}
    />
  );
}