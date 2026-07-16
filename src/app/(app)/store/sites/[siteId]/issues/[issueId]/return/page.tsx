import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import ReturnItemClient from "./ReturnItemClient";
import type { EquipmentCondition, InventoryItemType } from "@prisma/client";

async function getNextItemCode(
  inventorySiteId: string,
  itemType: InventoryItemType
): Promise<string> {
  const TYPE_PREFIX: Record<string, string> = {
    EQUIPMENT:              "EQUIP",
    ACCESSORIES:            "ACCESS",
    TOOLS_AND_PARTS:        "TO/PA",
    GENERAL:                "GEN",
    COOLING_INFRASTRUCTURE: "COOL",
    CABLES_AND_ELECTRONICS: "CA/EL",
  };

  const sample = await prisma.inventoryItem.findFirst({
    where:  { inventorySiteId, itemCode: { not: null } },
    select: { itemCode: true },
  });

  let sitePrefix = "KNET";
  if (sample?.itemCode) {
    const parts = sample.itemCode.split("-");
    if (parts.length >= 1) sitePrefix = parts[0];
  }

  const typePrefix = TYPE_PREFIX[itemType] ?? "GEN";

  const existing = await prisma.inventoryItem.findMany({
    where:  { inventorySiteId, itemCode: { startsWith: `${sitePrefix}-${typePrefix}-` } },
    select: { itemCode: true },
  });

  let maxNum = 0;
  for (const item of existing) {
    const parts = item.itemCode?.split("-") ?? [];
    const num   = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${sitePrefix}-${typePrefix}-${String(maxNum + 1).padStart(3, "0")}`;
}

const TRACKED_TYPES: InventoryItemType[] = ["EQUIPMENT", "COOLING_INFRASTRUCTURE"];

export default async function ReturnItemPage({
  params,
}: {
  params: Promise<{ siteId: string; issueId: string }>;
}) {
  const { siteId, issueId } = await params;
  const profile  = await getCurrentProfile();
  const canEdit  = profile?.role === "ADMIN" || profile?.role === "EDITOR";
  if (!canEdit) redirect(`/store/sites/${siteId}/issues`);

  const issue = await prisma.warehouseIssue.findFirst({
    where:  { id: issueId, inventorySiteId: siteId, status: "OPEN" },
    select: {
      id:               true,
      groupId:          true,
      quantityTaken:    true,
      takenBy:          true,
      expectedReturnAt: true,
      purpose:          true,
      inventoryItem: {
        select: {
          id:              true,
          name:            true,
          itemType:        true,
          itemCode:        true,
          manufacturer:    true,
          model:           true,
          unit:            true,
          inventorySiteId: true,
        },
      },
      lines: {
        select: {
          id: true,
          assetInstance: {
            select: { id: true, entityCode: true, condition: true },
          },
        },
      },
    },
  });

  if (!issue) return notFound();

  const isTracked = TRACKED_TYPES.includes(issue.inventoryItem.itemType as InventoryItemType);

  // ✅ Capture all data as primitives BEFORE the server action closure
  const issuedItemId   = issue.inventoryItem.id;
  const issuedItemName = issue.inventoryItem.name;
  const issuedItemType = issue.inventoryItem.itemType as InventoryItemType;
  const issuedItemCode = issue.inventoryItem.itemCode;  // ✅ was missing
  const issuedMfr      = issue.inventoryItem.manufacturer;
  const issuedModel    = issue.inventoryItem.model;
  const issuedUnit     = issue.inventoryItem.unit;
  const issuedQty      = issue.quantityTaken;
  const issuedTakenBy  = issue.takenBy;
  const issuedPurpose  = issue.purpose;
  const profileEmail   = profile?.email ?? null;
  const issuedLines    = issue.lines.map((l) => ({
    id:         l.id,
    instanceId: l.assetInstance.id,
    entityCode: l.assetInstance.entityCode,
    condition:  l.assetInstance.condition,
  }));

  // Build units for the return form
  const units: { key: string; entityCode: string | null; currentCondition: string }[] =
    isTracked
      ? issuedLines.map((l) => ({
          key:              l.id,
          entityCode:       l.entityCode,
          currentCondition: l.condition,
        }))
      : Array.from({ length: issuedQty }, (_, i) => ({
          key:              `bulk-${i}`,
          entityCode:       null,
          currentCondition: "USED",
        }));

  async function processReturn(formData: FormData) {
    "use server";

    const returnedBy = String(formData.get("returnedBy") ?? "").trim();
    const returnNote = String(formData.get("returnNote") ?? "").trim();
    const returnedAt = String(formData.get("returnedAt") ?? "").trim();

    if (!returnedBy) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent("Returned by is required")}`);
    }

    const returnDate = returnedAt ? new Date(returnedAt) : new Date();
    let dbError: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {

        if (isTracked) {
          // ── Per-entity migration ──────────────────────────────────────────
          for (const line of issuedLines) {
            const newCondition = (String(
              formData.get(`condition_${line.id}`) ?? "USED"
            )) as EquipmentCondition;

            // Look for existing item at this site with same name that already
            // has at least one instance with the new condition
            const existingItem = await tx.inventoryItem.findFirst({
              where: {
                inventorySiteId: siteId,
                name:            issuedItemName,
                isDeleted:       false,
                instances:       { some: { condition: newCondition } },
              },
              select: { id: true, quantity: true },
            });

            if (existingItem) {
              // Move entity to existing item
              await tx.assetInstance.update({
                where: { id: line.instanceId },
                data: {
                  inventoryItemId: existingItem.id,
                  condition:       newCondition,
                  status:          "AVAILABLE",
                },
              });
              await tx.inventoryItem.update({
                where: { id: existingItem.id },
                data:  { quantity: { increment: 1 } },
              });
            } else {
              // Create new InventoryItem row for this condition
              const newItemCode = await getNextItemCode(siteId, issuedItemType);

              const newItem = await tx.inventoryItem.create({
                data: {
                  inventorySiteId: siteId,
                  itemType:        issuedItemType,
                  itemCode:        newItemCode,
                  name:            issuedItemName,
                  manufacturer:    issuedMfr,
                  model:           issuedModel,
                  quantity:        1,
                  uncountable:     false,
                  unit:            issuedUnit,
                  reorderLevel:    0,
                  status:          "AVAILABLE",
                },
              });

              // Entity keeps its original entity code, moves to new item
              await tx.assetInstance.update({
                where: { id: line.instanceId },
                data: {
                  inventoryItemId: newItem.id,
                  condition:       newCondition,
                  status:          "AVAILABLE",
                },
              });
            }

            // Always decrement the source item
            await tx.inventoryItem.update({
              where: { id: issuedItemId },
              data:  { quantity: { decrement: 1 } },
            });
          }
        } else {
          // ── Bulk: just restore quantity ───────────────────────────────────
          await tx.inventoryItem.update({
            where: { id: issuedItemId },
            data:  { quantity: { increment: issuedQty } },
          });
        }

        // Mark issue as RETURNED
        await tx.warehouseIssue.update({
          where: { id: issueId },
          data: {
            status:     "RETURNED",
            returnedBy,
            returnedAt: returnDate,
            returnNote: returnNote || null,
          },
        });
      });

      await logActivity({
        type:       "INVENTORY_EQUIPMENT_RETURNED",
        title:      `Returned: ${issuedItemName} — ${issuedTakenBy}`,
        details:    `Returned by ${returnedBy}. Note: ${returnNote || "—"}.`,
        actorEmail: profileEmail,
        entityType: "INVENTORY_ITEM",
        entityId:   issuedItemId,
      });

    } catch (e) {
      if (isRedirectError(e)) throw e;
      console.error("[RETURN ERROR]", e);
      dbError = (e as any)?.message ?? "Database error";
    }

    if (dbError) {
      redirect(`/store/sites/${siteId}/issues/${issueId}/return?error=${encodeURIComponent(dbError)}`);
    }

    redirect(`/store/sites/${siteId}/issues?success=${encodeURIComponent("Item returned successfully")}`);
  }

  return (
    <ReturnItemClient
      siteId={siteId}
      issue={{
        id:        issueId,
        takenBy:   issuedTakenBy,
        purpose:   issuedPurpose,
        isTracked,
        inventoryItem: {
          name:     issuedItemName,
          itemType: issuedItemType,
          itemCode: issuedItemCode,
          unit:     issuedUnit,
        },
      }}
      units={units}
      action={processReturn}
    />
  );
}
