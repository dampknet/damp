import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getStatusAfterIssue } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import type {
  EquipmentCondition,
  InventoryItemType,
} from "@prisma/client";
import IssueInventoryItemClient from "./IssueInventoryItemClient";

export default async function IssueInventoryItemPage({
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
      status: true,
      condition: true,
    },
  });

  async function issueItem(formData: FormData) {
    "use server";

    const inventoryItemId = String(formData.get("inventoryItemId") ?? "").trim();
    const requesterName = String(formData.get("requesterName") ?? "").trim();
    const requesterContact = String(formData.get("requesterContact") ?? "").trim();
    const department = String(formData.get("department") ?? "").trim();
    const purpose = String(formData.get("purpose") ?? "").trim();
    const authorizedBy = String(formData.get("authorizedBy") ?? "").trim();
    const quantityRaw = String(formData.get("quantity") ?? "").trim();
    const expectedReturnDateRaw = String(formData.get("expectedReturnDate") ?? "").trim();
    const conditionAtIssueRaw = String(formData.get("conditionAtIssue") ?? "").trim();

    if (!inventoryItemId) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Please select an item")}`);
    }

    if (!requesterName) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Requester name is required")}`);
    }

    if (!requesterContact) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Contact is required")}`);
    }

    if (!purpose) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Purpose is required")}`);
    }

    if (!authorizedBy) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Authorized by is required")}`);
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        name: true,
        inventorySiteId: true,
        itemType: true,
        quantity: true,
        unit: true,
        reorderLevel: true,
        status: true,
        condition: true,
      },
    });

    if (!item || item.inventorySiteId !== siteId) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Selected item is invalid")}`);
    }

    const safeItem = item;

    const parsedQty = Number(quantityRaw);
    const issueQuantity = safeItem.itemType === "EQUIPMENT" ? 1 : parsedQty;

    if (!Number.isFinite(issueQuantity) || issueQuantity <= 0) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Quantity must be greater than 0")}`);
    }

    if (safeItem.itemType === "MATERIAL" && issueQuantity > safeItem.quantity) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Issued quantity cannot exceed available quantity")}`);
    }

    if (safeItem.itemType === "EQUIPMENT" && safeItem.status === "CHECKED_OUT") {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("This equipment is already checked out")}`);
    }

    let expectedReturnDate: Date | null = null;
    if (safeItem.itemType === "EQUIPMENT" && expectedReturnDateRaw) {
      expectedReturnDate = new Date(expectedReturnDateRaw);
      if (Number.isNaN(expectedReturnDate.getTime())) {
        redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Expected return date is invalid")}`);
      }
    }

    let conditionAtIssue: EquipmentCondition | null = null;
    if (safeItem.itemType === "EQUIPMENT") {
      if (
        conditionAtIssueRaw === "GOOD" ||
        conditionAtIssueRaw === "FAULTY" ||
        conditionAtIssueRaw === "DAMAGED" ||
        conditionAtIssueRaw === "UNDER_REPAIR"
      ) {
        conditionAtIssue = conditionAtIssueRaw as EquipmentCondition;
      } else {
        conditionAtIssue = safeItem.condition ?? "GOOD";
      }
    }

    const nextQuantity =
      safeItem.itemType === "MATERIAL"
        ? Math.max(0, safeItem.quantity - issueQuantity)
        : safeItem.quantity;

    const nextStatus = getStatusAfterIssue({
      itemType: safeItem.itemType as "MATERIAL" | "EQUIPMENT",
      currentQuantity: safeItem.quantity,
      issueQuantity,
      reorderLevel: safeItem.reorderLevel,
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const createdIssue = await tx.inventoryIssue.create({
          data: {
            inventoryItemId: safeItem.id,
            inventorySiteId: siteId,
            itemType: safeItem.itemType as InventoryItemType,
            quantity: issueQuantity,
            requesterName,
            requesterContact: requesterContact || null,
            department: department || null,
            purpose,
            authorizedBy,
            expectedReturnDate,
            conditionAtIssue,
            status: "ISSUED",
          },
        });

        const updatedItem = await tx.inventoryItem.update({
          where: { id: safeItem.id },
          data: {
            quantity: nextQuantity,
            status: nextStatus,
          },
        });

        return { createdIssue, updatedItem };
      });

      await logActivity({
        type: "INVENTORY_ITEM_ISSUED",
        title: `${result.updatedItem.itemType === "EQUIPMENT" ? "Equipment issued" : "Material issued"}: ${result.updatedItem.name}`,
        details: `Issued ${issueQuantity}${result.updatedItem.unit ? ` ${result.updatedItem.unit}` : ""} to ${requesterName}. Authorized by ${authorizedBy}. Site: ${safeSite.name}. Purpose: ${purpose}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: result.updatedItem.id,
      });

      if (result.updatedItem.status === "LOW_STOCK") {
        await logActivity({
          type: "INVENTORY_LOW_STOCK",
          title: `Low stock detected: ${result.updatedItem.name}`,
          details: `${result.updatedItem.name} at ${safeSite.name} is low in stock after issue. Qty left: ${result.updatedItem.quantity}${result.updatedItem.unit ? ` ${result.updatedItem.unit}` : ""}. Reorder level: ${result.updatedItem.reorderLevel}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: result.updatedItem.id,
        });
      }

      if (result.updatedItem.status === "OUT_OF_STOCK") {
        await logActivity({
          type: "INVENTORY_OUT_OF_STOCK",
          title: `Out of stock: ${result.updatedItem.name}`,
          details: `${result.updatedItem.name} at ${safeSite.name} is out of stock after issue.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId: result.updatedItem.id,
        });
      }
    } catch {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Could not issue item")}`);
    }

    redirect(
      `/store/sites/${siteId}/issues?success=${encodeURIComponent("Item issued successfully")}`
    );
  }

  return (
    <IssueInventoryItemClient
      site={safeSite}
      items={items}
      action={issueItem}
    />
  );
}