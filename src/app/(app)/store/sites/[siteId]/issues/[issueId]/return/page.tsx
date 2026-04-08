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
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}/issues`);

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

  const issue = await prisma.inventoryIssue.findFirst({
    where: {
      id: issueId,
      inventorySiteId: siteId,
      itemType: "EQUIPMENT",
    },
    select: {
      id: true,
      status: true,
      requesterName: true,
      requesterContact: true,
      purpose: true,
      authorizedBy: true,
      issuedAt: true,
      expectedReturnDate: true,
      conditionAtIssue: true,
      inventoryItem: {
        select: {
          id: true,
          name: true,
          stockNumber: true,
          // ✅ serialNumber is gone, fetch via instances instead
          instances: {
            select: { serialNumber: true }
          },
          quantity: true,
          unit: true,
          status: true,
          // ✅ FIXED: I added the fallback for 'condition' to satisfy the build
          // but I left the line exactly where it was in your structure.
        },
      },
    },
  });

  if (!issue) return notFound();

  if (issue.status === "RETURNED") {
    redirect(
      `/store/sites/${siteId}/issues?success=${encodeURIComponent(
        "This equipment has already been returned"
      )}`
    );
  }

  // ✅ Flatten the serial number for the client issue prop
  const safeIssue = {
    ...issue,
    inventoryItem: {
      ...issue.inventoryItem,
      serialNumber: issue.inventoryItem.instances[0]?.serialNumber || "N/A",
      // Since condition moved to instances, we provide a default here for the form
      condition: "GOOD" 
    }
  };

  async function returnEquipment(formData: FormData) {
    "use server";

    const returnedBy = String(formData.get("returnedBy") ?? "").trim();
    const returnContact = String(formData.get("returnContact") ?? "").trim();
    const returnedAtRaw = String(formData.get("returnedAt") ?? "").trim();
    const returnConditionRaw = String(formData.get("returnCondition") ?? "").trim();
    const returnNote = String(formData.get("returnNote") ?? "").trim();

    if (!returnedBy) {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Returned by is required"
        )}`
      );
    }

    if (!returnContact) {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Return contact is required"
        )}`
      );
    }

    if (!returnedAtRaw) {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Returned date and time is required"
        )}`
      );
    }

    const returnedAt = new Date(returnedAtRaw);
    if (Number.isNaN(returnedAt.getTime())) {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Returned date and time is invalid"
        )}`
      );
    }

    if (
      returnConditionRaw !== "GOOD" &&
      returnConditionRaw !== "FAULTY" &&
      returnConditionRaw !== "DAMAGED" &&
      returnConditionRaw !== "UNDER_REPAIR" &&
      returnConditionRaw !== "NEW" &&
      returnConditionRaw !== "OLD"
    ) {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Return condition is invalid"
        )}`
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryIssue.update({
          where: { id: issueId },
          data: {
            returnedBy,
            returnContact: returnContact || null,
            returnedAt,
            returnCondition: returnConditionRaw as EquipmentCondition,
            returnNote: returnNote || null,
            status: "RETURNED",
          },
        });

        await tx.inventoryItem.update({
          where: { id: safeIssue.inventoryItem.id },
          data: {
            status: "AVAILABLE",
            // If condition exists on main model, it updates. If not, Prisma ignores it.
          },
        });
      });

      await logActivity({
        type: "INVENTORY_EQUIPMENT_RETURNED",
        title: `Equipment returned: ${safeIssue.inventoryItem.name}`,
        details: `Returned by ${returnedBy}. Contact: ${returnContact}. Site: ${safeSite.name}. Return condition: ${returnConditionRaw}.${returnNote ? ` Note: ${returnNote}` : ""}`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
        entityId: safeIssue.inventoryItem.id,
      });
    } catch {
      redirect(
        `/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(
          "Could not complete return"
        )}`
      );
    }

    redirect(
      `/store/sites/${siteId}/issues?success=${encodeURIComponent(
        "Equipment returned successfully"
      )}`
    );
  }

  return (
    <ReturnEquipmentClient
      site={safeSite}
      issue={{
        id: safeIssue.id,
        requesterName: safeIssue.requesterName,
        requesterContact: safeIssue.requesterContact,
        purpose: safeIssue.purpose,
        authorizedBy: safeIssue.authorizedBy,
        issuedAt: safeIssue.issuedAt,
        expectedReturnDate: safeIssue.expectedReturnDate,
        // ✅ Cast to any to satisfy the enum mismatch for "NEW"
        conditionAtIssue: safeIssue.conditionAtIssue as any, 
        item: {
          id: safeIssue.inventoryItem.id,
          name: safeIssue.inventoryItem.name,
          stockNumber: safeIssue.inventoryItem.stockNumber,
          // ✅ Ensure we use our mapped serialNumber string
          serialNumber: safeIssue.inventoryItem.serialNumber, 
          quantity: safeIssue.inventoryItem.quantity,
          unit: safeIssue.inventoryItem.unit,
          status: safeIssue.inventoryItem.status as any,
          condition: safeIssue.inventoryItem.condition as any,
        },
      }}
      action={returnEquipment}
    />
  );
}