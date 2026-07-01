import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { EquipmentCondition } from "@prisma/client";
import ReturnEquipmentClient from "./ReturnEquipmentClient";

export default async function ReturnEquipmentPage({
  params,
}: {
  params: Promise<{ siteId: string; issueId: string }>;
}) {
  const { siteId, issueId } = await params;

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}/issues`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });
  if (!site) return notFound();

  // ✅ Capture before server action closure so TS knows it's non-null
  const siteName = site.name;

  const issue = await prisma.inventoryIssue.findFirst({
    where:  { id: issueId, inventorySiteId: siteId },
    select: {
      id:                 true,
      status:             true,
      quantity:           true,
      requesterName:      true,
      requesterContact:   true,
      purpose:            true,
      authorizedBy:       true,
      issuedAt:           true,
      expectedReturnDate: true,
      conditionAtIssue:   true,
      itemType:           true,
      inventoryItem: {
        select: {
          id:       true,
          name:     true,
          itemCode: true,
          quantity: true,
          unit:     true,
          status:   true,
          instances: {
            select:  { entityCode: true, condition: true },
            take:    5,
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!issue) return notFound();

  if (issue.status === "RETURNED") {
    redirect(
      `/store/sites/${siteId}/issues?success=${encodeURIComponent(
        "This item has already been returned"
      )}`
    );
  }

  const entityCodes = issue.inventoryItem.instances.map((i) => i.entityCode).join(", ") || "N/A";
  const condition   = issue.inventoryItem.instances[0]?.condition ?? "USED";

  const safeIssue = {
    ...issue,
    inventoryItem: {
      ...issue.inventoryItem,
      entityCodePreview: entityCodes,
      condition,
    },
  };

  // ✅ Capture primitives before server action closure
  const itemId   = safeIssue.inventoryItem.id;
  const itemName = safeIssue.inventoryItem.name;
  const issueQty = safeIssue.quantity;

  async function returnEquipment(formData: FormData) {
    "use server";

    const returnedBy         = String(formData.get("returnedBy")      ?? "").trim();
    const returnContact      = String(formData.get("returnContact")   ?? "").trim();
    const returnedAtRaw      = String(formData.get("returnedAt")      ?? "").trim();
    const returnConditionRaw = String(formData.get("returnCondition") ?? "").trim();
    const returnNote         = String(formData.get("returnNote")      ?? "").trim();

    if (!returnedBy) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Returned by is required")}`);
    }
    if (!returnContact) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Return contact is required")}`);
    }
    if (!returnedAtRaw) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Returned date and time is required")}`);
    }

    const returnedAt = new Date(returnedAtRaw);
    if (isNaN(returnedAt.getTime())) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Returned date is invalid")}`);
    }

    const validConditions = ["NEW", "UNUSED", "USED", "FAULTY"];
    if (!validConditions.includes(returnConditionRaw)) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Return condition is invalid")}`);
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryIssue.update({
          where: { id: issueId },
          data: {
            returnedBy,
            returnContact:   returnContact || null,
            returnedAt,
            returnCondition: returnConditionRaw as EquipmentCondition,
            returnNote:      returnNote || null,
            status:          "RETURNED",
          },
        });

        await tx.inventoryItem.update({
          where: { id: itemId },
          data:  { status: "AVAILABLE", quantity: { increment: issueQty } },
        });

        await tx.assetInstance.updateMany({
          where: { inventoryItemId: itemId, status: "CHECKED_OUT" },
          data:  {
            status:    "AVAILABLE",
            condition: returnConditionRaw as EquipmentCondition,
          },
        });
      });

      await logActivity({
        type:       "INVENTORY_EQUIPMENT_RETURNED",
        title:      `Returned: ${itemName}`,
        details:    `By ${returnedBy}. Contact: ${returnContact}. Site: ${siteName}. Condition: ${returnConditionRaw}.${returnNote ? ` Note: ${returnNote}` : ""}`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId:   itemId,
      });
    } catch {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Could not complete return")}`);
    }

    redirect(`/store/sites/${siteId}/issues?success=${encodeURIComponent("Item returned successfully")}`);
  }

  return (
    <ReturnEquipmentClient
      site={site}
      issue={{
        id:                 safeIssue.id,
        requesterName:      safeIssue.requesterName,
        requesterContact:   safeIssue.requesterContact,
        purpose:            safeIssue.purpose,
        authorizedBy:       safeIssue.authorizedBy,
        issuedAt:           safeIssue.issuedAt,
        expectedReturnDate: safeIssue.expectedReturnDate,
        conditionAtIssue:   safeIssue.conditionAtIssue as any,
        item: {
          id:                safeIssue.inventoryItem.id,
          name:              safeIssue.inventoryItem.name,
          itemCode:          safeIssue.inventoryItem.itemCode,
          entityCodePreview: safeIssue.inventoryItem.entityCodePreview,
          quantity:          safeIssue.inventoryItem.quantity,
          unit:              safeIssue.inventoryItem.unit,
          status:            safeIssue.inventoryItem.status as any,
          condition:         safeIssue.inventoryItem.condition as any,
        },
      }}
      action={returnEquipment}
    />
  );
}
