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
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      status: { not: "INACTIVE" },
      isDeleted: false,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      itemType: true,
      quantity: true,
      unit: true,
      stockNumber: true,
      instances: {
        select: { serialNumber: true }
      },
      reorderLevel: true,
      status: true,
      // ❌ REMOVED: condition: true (this was causing the build error)
    },
  });

  const items = rawItems.map(item => ({
    ...item,
    serialNumber: item.instances.map(i => i.serialNumber).join(", ") || "-",
    // ✅ ADDED: provide a default condition for the client UI since it's missing in DB
    condition: "GOOD", 
  }));

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

    if (!inventoryItemId) redirect(`/store/sites/${siteId}/issue?error=Please select an item`);
    if (!requesterName) redirect(`/store/sites/${siteId}/issue?error=Requester name is required`);

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
        // ❌ REMOVED: condition: true
      },
    });

    if (!item || item.inventorySiteId !== siteId) redirect(`/store/sites/${siteId}/issue?error=Invalid item`);

    const parsedQty = Number(quantityRaw);
    const issueQuantity = item.itemType === "EQUIPMENT" ? 1 : parsedQty;

    let expectedReturnDate: Date | null = null;
    if (item.itemType === "EQUIPMENT" && expectedReturnDateRaw) {
      expectedReturnDate = new Date(expectedReturnDateRaw);
    }

    let conditionAtIssue: EquipmentCondition | null = null;
    if (item.itemType === "EQUIPMENT") {
      conditionAtIssue = (["GOOD", "FAULTY", "DAMAGED", "UNDER_REPAIR"].includes(conditionAtIssueRaw) 
        ? conditionAtIssueRaw 
        : "GOOD") as EquipmentCondition;
    }

    const nextQuantity = item.itemType === "MATERIAL" ? Math.max(0, item.quantity - issueQuantity) : item.quantity;
    const nextStatus = getStatusAfterIssue({
      itemType: item.itemType as "MATERIAL" | "EQUIPMENT",
      currentQuantity: item.quantity,
      issueQuantity,
      reorderLevel: item.reorderLevel,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryIssue.create({
          data: {
            inventoryItemId: item.id,
            inventorySiteId: siteId,
            itemType: item.itemType as any,
            quantity: issueQuantity,
            requesterName,
            requesterContact,
            department,
            purpose,
            authorizedBy,
            expectedReturnDate,
            conditionAtIssue,
            status: "ISSUED",
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: nextQuantity, status: nextStatus },
        });
      });

      await logActivity({
        type: "INVENTORY_ITEM_ISSUED",
        title: `Item issued: ${item.name}`,
        details: `Issued ${issueQuantity} to ${requesterName}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: item.id,
      });
    } catch {
      redirect(`/store/sites/${siteId}/issue?error=Could not issue item`);
    }

    redirect(`/store/sites/${siteId}/issues?success=Item issued successfully`);
  }

  return (
    <IssueInventoryItemClient
      site={safeSite}
      items={items as any}
      action={issueItem}
    />
  );
}