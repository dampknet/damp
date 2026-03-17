import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
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

    const itemType =
      itemTypeRaw === "EQUIPMENT" ? "EQUIPMENT" : "MATERIAL";

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
      await prisma.inventoryItem.update({
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
      site={site}
      item={item}
      action={updateInventoryItem}
    />
  );
}