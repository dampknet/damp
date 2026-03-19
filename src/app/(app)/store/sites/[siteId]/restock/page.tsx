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

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      name: true,
      location: true,
    },
  });

  if (!site) return notFound();
  const safeSite = site;

  const items = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      status: { not: "INACTIVE" },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      itemType: true,
      quantity: true,
      unit: true,
      stockNumber: true,
      serialNumber: true,
      reorderLevel: true,
      targetStockLevel: true,
      status: true,
    },
  });

  async function restockItem(formData: FormData) {
    "use server";

    const inventoryItemId = String(formData.get("inventoryItemId") ?? "").trim();
    const quantityAddedRaw = String(formData.get("quantityAdded") ?? "").trim();
    const dateBoughtRaw = String(formData.get("dateBought") ?? "").trim();
    const dateReceivedRaw = String(formData.get("dateReceived") ?? "").trim();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const receivedBy = String(formData.get("receivedBy") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!inventoryItemId) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Please select an item")}`);
    }

    const quantityAdded = Number(quantityAddedRaw);
    if (!Number.isFinite(quantityAdded) || quantityAdded <= 0) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Quantity added must be greater than 0")}`);
    }

    if (!dateReceivedRaw) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date received is required")}`);
    }

    const dateReceived = new Date(dateReceivedRaw);
    if (Number.isNaN(dateReceived.getTime())) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date received is invalid")}`);
    }

    let dateBought: Date | null = null;
    if (dateBoughtRaw) {
      dateBought = new Date(dateBoughtRaw);
      if (Number.isNaN(dateBought.getTime())) {
        redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Date bought is invalid")}`);
      }
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        name: true,
        unit: true,
        inventorySiteId: true,
        quantity: true,
        reorderLevel: true,
        targetStockLevel: true,
        status: true,
      },
    });

    if (!item || item.inventorySiteId !== siteId) {
      redirect(`/store/sites/${siteId}/restock?error=${encodeURIComponent("Selected item is invalid")}`);
    }

    const safeItem = item;

    const nextQuantity = safeItem.quantity + Math.trunc(quantityAdded);
    const nextStatus = getAutoInventoryStatus({
      quantity: nextQuantity,
      reorderLevel: safeItem.reorderLevel,
      preferredStatus: safeItem.status === "INACTIVE" ? "INACTIVE" : null,
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const restock = await tx.inventoryRestock.create({
          data: {
            inventoryItemId: safeItem.id,
            inventorySiteId: siteId,
            quantityAdded: Math.trunc(quantityAdded),
            dateBought,
            dateReceived,
            supplier: supplier || null,
            receivedBy: receivedBy || null,
            note: note || null,
          },
        });

        const updatedItem = await tx.inventoryItem.update({
          where: { id: safeItem.id },
          data: {
            quantity: nextQuantity,
            status: nextStatus,
          },
        });

        return { restock, updatedItem };
      });

      await logActivity({
        type: "INVENTORY_RESTOCK_ADDED",
        title: `Restock added: ${result.updatedItem.name}`,
        details: `Added ${Math.trunc(quantityAdded)}${result.updatedItem.unit ? ` ${result.updatedItem.unit}` : ""} at ${safeSite.name}. Received by: ${receivedBy || "-"}. Supplier: ${supplier || "-"}. New qty: ${result.updatedItem.quantity}${result.updatedItem.unit ? ` ${result.updatedItem.unit}` : ""}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: result.updatedItem.id,
      });

      redirect(
        `/store/sites/${siteId}/restocks?success=${encodeURIComponent("Item restocked successfully")}`
      );
    } catch {
      redirect(
        `/store/sites/${siteId}/restock?error=${encodeURIComponent("Could not restock item")}`
      );
    }
  }

  return (
    <RestockInventoryItemClient
      site={safeSite}
      items={items}
      action={restockItem}
    />
  );
}