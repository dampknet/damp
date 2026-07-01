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
  const profile  = await getCurrentProfile();
  const canEdit  = profile?.role === "ADMIN" || profile?.role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();

  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      status:          { not: "INACTIVE" },
      isDeleted:       false,
    },
    orderBy: { name: "asc" },
    include: {
      instances: {
        select: {
          id:         true,
          entityCode: true,   // ✅ replaces serialNumber
          condition:  true,
          status:     true,
        },
      },
    },
  });

  async function issueItemsAction(formData: FormData) {
    "use server";

    const bucketDataRaw    = String(formData.get("bucketData") ?? "");
    const bucket           = JSON.parse(bucketDataRaw);
    const requesterName    = String(formData.get("requesterName"));
    const requesterContact = String(formData.get("requesterContact"));
    const department       = String(formData.get("department"));
    const authorizedBy     = String(formData.get("authorizedBy"));
    const purpose          = String(formData.get("purpose"));

    try {
      await prisma.$transaction(async (tx) => {
        for (const entry of bucket) {
          // 1. Create the warehouse issue record
          await tx.warehouseIssue.create({
            data: {
              inventoryItemId:  entry.id,
              inventorySiteId:  siteId,
              quantityTaken:    entry.quantity,
              takenBy:          requesterName,
              takenByContact:   requesterContact,
              authorizedBy,
              purpose,
              status:           "OPEN",
              expectedReturnAt: entry.expectedReturnDate
                ? new Date(entry.expectedReturnDate)
                : null,
              // Link specific entities as issue lines
              lines: entry.entityCodes?.length > 0 ? {
                create: entry.entityCodes.map((code: string) => ({
                  assetInstance: {
                    connect: { entityCode: code },
                  },
                })),
              } : undefined,
            },
          });

          // 2. Decrement quantity
          await tx.inventoryItem.update({
            where: { id: entry.id },
            data:  { quantity: { decrement: entry.quantity } },
          });

          // 3. Mark individual units as CHECKED_OUT
          if (entry.entityCodes?.length > 0) {
            await tx.assetInstance.updateMany({
              where: { entityCode: { in: entry.entityCodes } },
              data:  { status: "CHECKED_OUT" },
            });
          }
        }
      });

      await logActivity({
        type:       "INVENTORY_ITEM_ISSUED",
        title:      `Multi-Item Issue: ${bucket.length} item type(s)`,
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
