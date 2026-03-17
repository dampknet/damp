import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
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

    const itemType =
      itemTypeRaw === "EQUIPMENT" ? "EQUIPMENT" : "MATERIAL";

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

    let status: InventoryItemStatus = "AVAILABLE";
    if (
      statusRaw === "LOW_STOCK" ||
      statusRaw === "OUT_OF_STOCK" ||
      statusRaw === "CHECKED_OUT" ||
      statusRaw === "INACTIVE" ||
      statusRaw === "AVAILABLE"
    ) {
      status = statusRaw as InventoryItemStatus;
    }

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
      await prisma.inventoryItem.create({
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
          status,
          condition,
        },
      });

      redirect(`/store/sites/${siteId}`);
    } catch {
      redirect(
        `/store/sites/${siteId}/new?error=${encodeURIComponent(
          "Could not create inventory item"
        )}`
      );
    }
  }

  return <NewInventoryItemClient site={site} action={createInventoryItem} />;
}