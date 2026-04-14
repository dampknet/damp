import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import IssueInventoryItemClient from "./IssueInventoryItemClient";

export default async function IssueInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const profile = await getCurrentProfile();
  const canEdit = profile?.role === "ADMIN" || profile?.role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();

  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      status: { not: "INACTIVE" },
      isDeleted: false,
    },
    orderBy: { name: "asc" },
    include: {
      instances: { select: { serialNumber: true, condition: true } },
    },
  });

  async function issueItemsAction(formData: FormData) {
    "use server";
    const bucketDataRaw = String(formData.get("bucketData") ?? "");
    const bucket = JSON.parse(bucketDataRaw);
    
    const requesterName = String(formData.get("requesterName"));
    const requesterContact = String(formData.get("requesterContact"));
    const department = String(formData.get("department"));
    const authorizedBy = String(formData.get("authorizedBy"));
    const purpose = String(formData.get("purpose"));

    try {
      await prisma.$transaction(async (tx) => {
        for (const entry of bucket) {
          // 1. Create the detailed issue record
          await tx.inventoryIssue.create({
            data: {
              inventoryItemId: entry.id,
              inventorySiteId: siteId,
              itemType: entry.itemType,
              quantity: entry.quantity,
              requesterName,
              requesterContact,
              department,
              purpose,
              authorizedBy,
              status: "ISSUED",
              returnNote: entry.serials.map((s: any) => s.sn).join(", "),
              expectedReturnDate: entry.expectedReturnDate ? new Date(entry.expectedReturnDate) : null,
              conditionAtIssue: entry.serials[0]?.condition || "GOOD",
            },
          });

          // 2. Decrement main Inventory stock
          await tx.inventoryItem.update({
            where: { id: entry.id },
            data: { quantity: { decrement: entry.quantity } },
          });

          // 3. Mark the scanned units as CHECKED_OUT in store
          if (entry.serials.length > 0) {
            await tx.assetInstance.updateMany({
              where: { serialNumber: { in: entry.serials.map((s: any) => s.sn) } },
              data: { status: "CHECKED_OUT" },
            });
          }
        }
      });

      await logActivity({
        type: "INVENTORY_ITEM_ISSUED",
        title: `Multi-Item Checkout: ${bucket.length} types`,
        actorEmail: profile?.email || null,
        entityType: "INVENTORY_ITEM",
      });
    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/issue?error=Database failure`);
    }

    redirect(`/store/sites/${siteId}/issues?success=Items Issued`);
  }

  return (
    <IssueInventoryItemClient
      site={site}
      items={rawItems as any}
      action={issueItemsAction}
    />
  );
}