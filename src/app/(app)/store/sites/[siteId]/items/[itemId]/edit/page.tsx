import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import type { InventoryItemStatus, InventoryItemType } from "@prisma/client";
import EditInventoryItemClient from "./EditInventoryItemClient";

const VALID_TYPES = [
  "EQUIPMENT","ACCESSORIES","TOOLS_AND_PARTS",
  "GENERAL","COOLING_INFRASTRUCTURE","CABLES_AND_ELECTRONICS",
];

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

  // ✅ Capture before server action closure
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
      instances: {
        select:  { condition: true },
        take:    1,
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!item) return notFound();

  const safeItem = {
    ...item,
    condition: item.instances[0]?.condition ?? "NEW",
  };

  async function updateInventoryItem(formData: FormData) {
    "use server";

    const itemTypeRaw    = String(formData.get("itemType")         ?? "").trim();
    const name           = String(formData.get("name")             ?? "").trim();
    const description    = String(formData.get("description")      ?? "").trim();
    const itemCode       = String(formData.get("itemCode")         ?? "").trim();
    const manufacturer   = String(formData.get("manufacturer")     ?? "").trim();
    const model          = String(formData.get("model")            ?? "").trim();
    const quantityRaw    = String(formData.get("quantity")         ?? "").trim();
    const unit           = String(formData.get("unit")             ?? "").trim();
    const reorderRaw     = String(formData.get("reorderLevel")     ?? "").trim();
    const targetStockRaw = String(formData.get("targetStockLevel") ?? "").trim();
    const statusRaw      = String(formData.get("status")           ?? "AVAILABLE").trim();
    const uncountable    = formData.get("uncountable") === "on";

    const itemType = VALID_TYPES.includes(itemTypeRaw) ? itemTypeRaw : "GENERAL";

    if (!name) {
      redirect(`/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Item name is required")}`);
    }

    const quantity    = uncountable ? 0 : (quantityRaw   === "" ? 0    : Number(quantityRaw));
    const reorder     = uncountable ? 0 : (reorderRaw    === "" ? 0    : Number(reorderRaw));
    const targetStock = uncountable ? null : (targetStockRaw === "" ? null : Number(targetStockRaw));

    const validStatuses = ["AVAILABLE","LOW_STOCK","OUT_OF_STOCK","CHECKED_OUT","INACTIVE"];
    const preferredStatus = validStatuses.includes(statusRaw) ? (statusRaw as InventoryItemStatus) : null;

    const finalStatus = getAutoInventoryStatus({
      quantity:        Math.trunc(quantity),
      reorderLevel:    Math.trunc(reorder),
      preferredStatus,
      uncountable,
    });

    // Check item code uniqueness if changed
    if (itemCode && itemCode !== safeItem.itemCode) {
      const existing = await prisma.inventoryItem.findFirst({
        where:  { itemCode, NOT: { id: itemId } },
        select: { id: true },
      });
      if (existing) {
        redirect(`/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent(`Item code ${itemCode} is already in use`)}`);
      }
    }

    try {
      const updated = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          itemType:         itemType as InventoryItemType,
          name,
          description:      description    || null,
          itemCode:         itemCode       || null,
          manufacturer:     manufacturer   || null,
          model:            model          || null,
          quantity:         Math.trunc(quantity),
          uncountable,
          unit:             unit           || null,
          reorderLevel:     Math.trunc(reorder),
          targetStockLevel: targetStock === null ? null : Math.trunc(targetStock),
          status:           finalStatus,
        },
      });

      await logActivity({
        type:       "INVENTORY_ITEM_UPDATED",
        title:      `Updated: ${updated.name}`,
        details:    `Site: ${siteName}. Code: ${updated.itemCode ?? "—"}. ${uncountable ? "Qty: N/A." : `Qty: ${updated.quantity}.`} Status: ${updated.status}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId:   updated.id,
      });
    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/items/${itemId}/edit?error=${encodeURIComponent("Could not update inventory item")}`);
    }

    redirect(`/store/sites/${siteId}`);
  }

  return (
    <EditInventoryItemClient
      site={site}
      item={safeItem as any}
      action={updateInventoryItem}
    />
  );
}
