import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, getEditorProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify, notifyStockLevels } from "@/lib/notifications";
import { parseIssueDate, toDateInput } from "@/lib/issue-date";
import { typeLabel, ALL_SITE_PREFIXES } from "@/lib/item-types";
import { codeSegmentsFor } from "@/lib/item-type-registry";
import { getSitePrefix } from "@/lib/inventory-upload";
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
      typeRef:      { select: { name: true, tracked: true } },
      subType:      { select: { name: true } },
      itemCode:     true,
      quantity:     true,
      uncountable:  true,
      unit:         true,
      reorderLevel: true,
      status:       true,
      condition:    true,
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

  const items = rawItems.map(({ typeRef, subType, ...item }) => ({
    ...item,
    itemType:  typeLabel({ itemType: item.itemType, typeRef, subType }),
    // Units tracked one by one: from the item type's setting (older items: Equipment / Cooling).
    tracked:   typeRef?.tracked ?? (item.itemType === "EQUIPMENT" || item.itemType === "COOLING_INFRASTRUCTURE"),
    condition: item.condition,
  }));

  // Barcode matching: this warehouse's short codes and label prefix.
  const [codeSegments, ownPrefix] = await Promise.all([codeSegmentsFor(siteId), getSitePrefix(siteId)]);
  const sitePrefixes = [...new Set([`${ownPrefix.toUpperCase()}-`, ...ALL_SITE_PREFIXES])].sort((a, b) => b.length - a.length);

  // The 42 broadcast sites items can be sent to, plus "Other" places already used (for suggestions).
  const [destinations, otherPlaceRows] = await Promise.all([
    prisma.site.findMany({
      where:   { isDeleted: false },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
    prisma.warehouseIssue.findMany({
      where:    { destinationSiteId: null, destinationName: { not: null } },
      distinct: ["destinationName"],
      select:   { destinationName: true },
      take:     200,
    }),
  ]);
  const otherPlaces = otherPlaceRows.map((r) => r.destinationName as string).sort((a, b) => a.localeCompare(b));

  async function issueItemsAction(formData: FormData) {
    "use server";

    // Re-check the caller on submit (role or suspension may have changed since the page loaded).
    const actor = await getEditorProfile();
    if (!actor) redirect(`/store/sites/${siteId}`);

    // Master admins may back-date an issue (paper waybills written before items were in the system).
    let issuedAt = new Date();
    const issueDateRaw = String(formData.get("issueDate") ?? "").trim();
    if (actor.isMasterAdmin && issueDateRaw && issueDateRaw !== toDateInput(issuedAt)) {
      const parsed = parseIssueDate(issueDateRaw);
      if ("error" in parsed) redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent(parsed.error)}`);
      issuedAt = parsed.date;
    }
    const backdated = toDateInput(issuedAt) !== toDateInput(new Date());

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

    // Every item needs a destination: one of the 42 sites (tracked as a delivery) or a typed place.
    const [liveSites, knownPlaces] = await Promise.all([
      prisma.site.findMany({ where: { isDeleted: false }, select: { id: true, name: true } }),
      prisma.warehouseIssue.findMany({
        where:    { destinationSiteId: null, destinationName: { not: null } },
        distinct: ["destinationName"],
        select:   { destinationName: true },
      }),
    ]);
    const siteById    = new Map(liveSites.map((s) => [s.id, s.name]));
    const siteByName  = new Map(liveSites.map((s) => [s.name.trim().toLowerCase(), s]));
    const placeByName = new Map(knownPlaces.map((p) => [String(p.destinationName).trim().toLowerCase(), String(p.destinationName)]));
    for (const entry of bucket) {
      const destSiteId = String(entry.destinationSiteId ?? "").trim();
      const destOther  = String(entry.destinationOther  ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
      const typedSite  = destOther ? siteByName.get(destOther.toLowerCase()) : undefined;
      if (destSiteId && siteById.has(destSiteId)) {
        entry.destinationSiteId = destSiteId;
        entry.destinationName   = siteById.get(destSiteId);
      } else if (!destSiteId && typedSite) {
        // Typed a site's name under "Other" — link it to that site.
        entry.destinationSiteId = typedSite.id;
        entry.destinationName   = typedSite.name;
      } else if (!destSiteId && destOther) {
        // Reuse the existing spelling of a place, so "head office" and "Head Office" stay one place.
        entry.destinationSiteId = null;
        entry.destinationName   = placeByName.get(destOther.toLowerCase()) ?? destOther;
      } else {
        redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent(`Choose a destination for "${entry.name}".`)}`);
      }
    }
    const destinationSummary = [...new Set(bucket.map((b) => String(b.destinationName)))].join(", ");

    // ✅ Check for duplicates BEFORE the transaction to save time
    for (const entry of bucket) {
      if (!entry.uncountable && entry.returnable) {
        const existingOpen = await prisma.warehouseIssue.findFirst({
          where: { inventoryItemId: entry.id, status: "OPEN" },
          select: { id: true },
        });
        if (existingOpen) {
          dbError = `"${entry.name}" already has an open issue. Return it first.`;
          break;
        }
      }
    }

    if (dbError) {
      redirect(`/store/sites/${siteId}/issue?error=${encodeURIComponent(dbError)}`);
    }

    try {
      // ✅ 30 second timeout — enough for large bulk issues
      await prisma.$transaction(async (tx) => {
        for (const entry of bucket) {
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
              conditionAtIssue: entry.bulkCondition ?? entry.conditions?.[0]?.condition ?? null,
              // ✅ Non-returnable items = RETURNED immediately so they show as CLOSED in DB
              takenAt:     issuedAt,
              status:      entry.returnable ? "OPEN"     : "RETURNED",
              returnedAt:  entry.returnable ? null        : issuedAt,
              returnedBy:  entry.returnable ? null        : "Non-returnable",
              expectedReturnAt: entry.returnable ? new Date() : null,
              destinationSiteId: entry.destinationSiteId ?? null,
              destinationName:   entry.destinationName,
              // Sites and "Other" places are both tracked until a master admin confirms delivery.
              deliveryStatus:    "PENDING",
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
      }, {
        timeout: 30000, // ✅ 30 seconds — handles large bulk issues
      });

      await logActivity({
        type:       "INVENTORY_ITEM_ISSUED",
        title:      `Issue: ${bucket.length} item type(s) — ${requesterName}`,
        details:    `Site: ${siteName}. Destination: ${destinationSummary}. Authorized by: ${authorizedBy}. Purpose: ${purpose}.${backdated ? ` Back-dated to ${issuedAt.toLocaleDateString("en-GB")} by ${actor.email}.` : ""} Group: ${groupId}`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_ITEM",
      });

      const totalUnits = bucket.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
      const itemNames  = bucket.map((b) => String(b.name ?? "")).filter(Boolean);
      await notify({
        type:       "ITEM_ISSUED",
        title:      `${totalUnits} item${totalUnits === 1 ? "" : "s"} issued from ${siteName} → ${destinationSummary}`,
        body:       `${itemNames.slice(0, 4).join(", ")}${itemNames.length > 4 ? ` and ${itemNames.length - 4} more` : ""}. Taken by ${requesterName}, authorized by ${authorizedBy || "—"}. Purpose: ${purpose}`,
        link:       `/store/sites/${siteId}/issue/receipt?groupId=${groupId}`,
        actorEmail: profile?.email ?? null,
      });

      await notifyStockLevels(
        bucket.filter((b) => !b.uncountable).map((b) => ({ itemId: String(b.id), taken: Number(b.quantity) || 1 })),
        siteName,
        siteId,
        profile?.email ?? null,
      );

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
      destinations={destinations}
      otherPlaces={otherPlaces}
      canBackdate={!!profile?.isMasterAdmin}
      codeSegments={codeSegments}
      sitePrefixes={sitePrefixes}
      today={toDateInput(new Date())}
      action={issueItemsAction}
    />
  );
}
