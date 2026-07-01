import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import RestockInventoryItemClient from "./RestockInventoryItemClient";

export default async function RestockInventoryItemPage({
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

  const rawItems = await prisma.inventoryItem.findMany({
    where:   { inventorySiteId: siteId, isDeleted: false, status: { not: "INACTIVE" } },
    orderBy: { name: "asc" },
    select: {
      id:              true,
      name:            true,
      itemType:        true,
      itemCode:        true,
      quantity:        true,
      uncountable:     true,
      unit:            true,
      reorderLevel:    true,
      targetStockLevel: true,
      status:          true,
      instances: {
        select:  { entityCode: true },
        take:    3,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const items = rawItems.map((item) => ({
    ...item,
    entityCodePreview: item.instances.map((i) => i.entityCode).join(", ") || "-",
  }));

  async function restockItem(formData: FormData) {
    "use server";

    const inventoryItemId  = String(formData.get("inventoryItemId") ?? "").trim();
    const quantityAddedRaw = String(formData.get("quantityAdded")   ?? "").trim();
    const dateBoughtRaw    = String(formData.get("dateBought")      ?? "").trim();
    const dateReceivedRaw  = String(formData.get("dateReceived")    ?? "").trim();
    const supplier         = String(formData.get("supplier")        ?? "").trim();
    const receivedBy       = String(formData.get("receivedBy")      ?? "").trim();
    const note             = String(formData.get("note")            ?? "").trim();

    if (!inventoryItemId) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Please select an item")}`);
    }

    const quantityAdded = Number(quantityAddedRaw);
    if (!Number.isFinite(quantityAdded) || quantityAdded <= 0) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Quantity must be greater than 0")}`);
    }

    if (!dateReceivedRaw) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date received is required")}`);
    }

    const dateReceived = new Date(dateReceivedRaw);
    if (isNaN(dateReceived.getTime())) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date received is invalid")}`);
    }

    let dateBought: Date | null = null;
    if (dateBoughtRaw) {
      dateBought = new Date(dateBoughtRaw);
      if (isNaN(dateBought.getTime())) {
        redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date bought is invalid")}`);
      }
    }

    const item = await prisma.inventoryItem.findUnique({
      where:  { id: inventoryItemId },
      select: {
        id: true, name: true, unit: true, itemCode: true,
        inventorySiteId: true, quantity: true,
        reorderLevel: true, targetStockLevel: true, status: true,
      },
    });

    if (!item || item.inventorySiteId !== siteId) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Selected item is invalid")}`);
    }

    const nextQty    = item.quantity + Math.trunc(quantityAdded);
    const nextStatus = getAutoInventoryStatus({
      quantity:        nextQty,
      reorderLevel:    item.reorderLevel,
      preferredStatus: item.status === "INACTIVE" ? "INACTIVE" : null,
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const restock = await tx.inventoryRestock.create({
          data: {
            inventoryItemId: item.id,
            inventorySiteId: siteId,
            quantityAdded:   Math.trunc(quantityAdded),
            dateBought,
            dateReceived,
            supplier:        supplier    || null,
            receivedBy:      receivedBy  || null,
            note:            note        || null,
          },
        });

        const updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data:  { quantity: nextQty, status: nextStatus },
        });

        // Generate entity code slots for the restocked quantity
        const existingCount = await tx.assetInstance.count({
          where: { inventoryItemId: item.id },
        });

        await tx.assetInstance.createMany({
          data: Array.from({ length: Math.trunc(quantityAdded) }).map((_, i) => ({
            inventoryItemId: item.id,
            entityCode:      `${item.itemCode ?? item.id.slice(-6)}-${String(existingCount + i + 1).padStart(2, "0")}`,
            status:          "AVAILABLE" as const,
            condition:       "USED" as const,
          })),
          skipDuplicates: true,
        });

        return { restock, updated };
      });

      await logActivity({
        type:       "INVENTORY_RESTOCK_ADDED",
        title:      `Restock: ${result.updated.name}`,
        details:    `+${Math.trunc(quantityAdded)}${result.updated.unit ? ` ${result.updated.unit}` : ""} at ${site.name}. New qty: ${result.updated.quantity}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId:   result.updated.id,
      });

      redirect(`/store/sites/${siteId}/restocks?success=${encodeURIComponent("Item restocked successfully")}`);
    } catch {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Could not restock item")}`);
    }
  }

  return (
    <RestockInventoryItemClient
      site={site}
      items={items as any}
      action={restockItem}
    />
  );
}
