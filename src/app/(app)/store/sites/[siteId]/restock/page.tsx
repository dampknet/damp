import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
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

    const nextQuantity = item.quantity + Math.trunc(quantityAdded);
    const nextStatus = getAutoInventoryStatus({
      quantity: nextQuantity,
      reorderLevel: item.reorderLevel,
      preferredStatus: item.status === "INACTIVE" ? "INACTIVE" : null,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryRestock.create({
          data: {
            inventoryItemId: item.id,
            inventorySiteId: siteId,
            quantityAdded: Math.trunc(quantityAdded),
            dateBought,
            dateReceived,
            supplier: supplier || null,
            receivedBy: receivedBy || null,
            note: note || null,
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            quantity: nextQuantity,
            status: nextStatus,
          },
        });
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
      site={site}
      items={items}
      action={restockItem}
    />
  );
}