import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import IssueInventoryItemClient from "./IssueInventoryItemClient";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { randomUUID } from "crypto";

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

  const siteName = site.name;

  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      status:          { not: "INACTIVE" },
      isDeleted:       false,
    },
    orderBy: { name: "asc" },
    select: {
      id:           true,
      name:         true,
      itemType:     true,
      itemCode:     true,
      quantity:     true,
      uncountable:  true,
      unit:         true,
      reorderLevel: true,
      status:       true,
      instances: {
        where:  { status: "AVAILABLE" }, // ✅ only show available instances
        select: {
          id:         true,
          entityCode: true,
          condition:  true,
          status:     true,
        },
      },
    },
  });

  const items = rawItems.map((item) => ({
    ...item,
    condition: item.instances[0]?.condition ?? "NEW",
  }));

  async function issueItemsAction(formData: FormData) {
    "use server";

    const bucketDataRaw    = String(formData.get("bucketData")       ?? "").trim();
    const requesterName    = String(formData.get("requesterName")    ?? "").trim();
    const requesterContact = String(formData.get("requesterContact") ?? "").trim();
    const authorizedBy     = String(formData.get("authorizedBy")     ?? "").trim();
    const purpose          = String(formData.get("purpose")          ?? "").trim();

    if (!bucketDataRaw || bucketDataRaw === "[]") {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Bucket is empty")}`);
    }

    let bucket: any[];
    try {
      bucket = JSON.parse(bucketDataRaw);
    } catch {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("Invalid bucket data")}`);
    }

    if (!Array.isArray(bucket) || bucket.length === 0) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent("No items in bucket")}`);
    }

    // ✅ Generate a groupId so all items in this trip are linked
    const groupId = randomUUID();
    let dbError: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        for (const entry of bucket) {
          // ✅ Only block duplicate open issues for countable tracked items
          // Uncountable items (N/A qty) can always be issued multiple times
          if (!entry.uncountable) {
            const existingOpen = await tx.warehouseIssue.findFirst({
              where: { inventoryItemId: entry.id, status: "OPEN" },
              select: { id: true },
            });
            if (existingOpen) {
              throw new Error(`"${entry.name}" already has an open issue. Return it first.`);
            }
          }

          await tx.warehouseIssue.create({
            data: {
              groupId,
              inventoryItemId:  entry.id,
              inventorySiteId:  siteId,
              quantityTaken:    Number(entry.quantity) || 1,
              takenBy:          requesterName,
              takenByContact:   requesterContact || null,
              authorizedBy:     authorizedBy || null,
              purpose,
              status:           "OPEN",
              conditionAtIssue: entry.bulkCondition ?? entry.conditions?.[0]?.condition ?? null, // ✅
              expectedReturnAt: entry.returnable ? new Date() : null,
              lines: Array.isArray(entry.entityCodes) && entry.entityCodes.length > 0
                ? {
                    create: entry.entityCodes.map((code: string) => ({
                      assetInstance: { connect: { entityCode: code } },
                    })),
                  }
                : undefined,
            },
          });

          // ✅ Only decrement quantity for countable items
          if (!entry.uncountable) {
            await tx.inventoryItem.update({
              where: { id: entry.id },
              data:  { quantity: { decrement: Number(entry.quantity) || 1 } },
            });
          }

          // Mark entity instances as CHECKED_OUT
          if (Array.isArray(entry.entityCodes) && entry.entityCodes.length > 0) {
            await tx.assetInstance.updateMany({
              where: { entityCode: { in: entry.entityCodes } },
              data:  { status: "CHECKED_OUT" },
            });
          }
        }
      });

      await logActivity({
        type:       "INVENTORY_ITEM_ISSUED",
        title:      `Issue: ${bucket.length} item type(s) — ${requesterName}`,
        details:    `Site: ${siteName}. Authorized by: ${authorizedBy}. Purpose: ${purpose}. Group: ${groupId}`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
      });

    } catch (e) {
      if (isRedirectError(e)) throw e;
      console.error("[ISSUE ACTION ERROR]", e);
      dbError = (e as any)?.message ?? "Database error";
    }

    if (dbError) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent(dbError)}`);
    }

    // ✅ Redirect to waybill receipt preview instead of issue log
    redirect(`/store/sites/${siteId}/issue/receipt?groupId=${groupId}`);
  }

  return (
    <IssueInventoryItemClient
      site={site}
      items={items as any}
      action={issueItemsAction}
    />
  );
}
