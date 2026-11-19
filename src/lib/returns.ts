import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { generateItemCode, getSitePrefix } from "@/lib/inventory-upload";
import type { EquipmentCondition, Prisma } from "@prisma/client";

// Issued = used at the destination + returned to the store + still out.
// This file is the ONLY place that puts returned items back into stock.

export const CONDITIONS: EquipmentCondition[] = ["NEW", "UNUSED", "USED", "FAULTY"];
const isCondition = (c: unknown): c is EquipmentCondition => typeof c === "string" && (CONDITIONS as string[]).includes(c);

const issueSelect = {
  id: true, groupId: true, inventorySiteId: true, quantityTaken: true, quantityUsed: true, quantityReturned: true,
  takenBy: true, conditionAtIssue: true, status: true, deliveryStatus: true, destinationName: true, destinationSiteId: true, expectedReturnAt: true,
  inventoryItem: { select: { id: true, name: true, itemType: true, manufacturer: true, model: true, unit: true, uncountable: true, condition: true } },
  inventorySite: { select: { name: true } },
  lines: { select: { id: true, usedAt: true, returnedAt: true, assetInstance: { select: { id: true, entityCode: true, condition: true } } } },
} satisfies Prisma.WarehouseIssueSelect;

export type IssueForReturn = Prisma.WarehouseIssueGetPayload<{ select: typeof issueSelect }>;

export function loadIssueForReturn(issueId: string) {
  return prisma.warehouseIssue.findUnique({ where: { id: issueId }, select: issueSelect });
}

export const isTracked = (i: IssueForReturn) => i.lines.length > 0;

// Units that can still come back: for tracked items, units not installed and not yet returned.
export function returnableLines(i: IssueForReturn) {
  return i.lines.filter((l) => !l.usedAt && !l.returnedAt);
}

export function outstandingQty(i: IssueForReturn) {
  if (isTracked(i)) return returnableLines(i).length;
  return Math.max(0, i.quantityTaken - (i.quantityUsed ?? 0) - i.quantityReturned);
}

// Default condition for returned leftovers: the condition they had when issued.
export function defaultReturnCondition(i: IssueForReturn): EquipmentCondition {
  return isCondition(i.conditionAtIssue) ? i.conditionAtIssue : i.inventoryItem.condition;
}

export type ReceiveInput = {
  issueId:    string;
  returnedBy: string;
  note?:      string | null;
  // bulk items
  quantity?:  number;
  condition?: EquipmentCondition;
  // tracked items: which units came back, and their condition
  units?:     { lineId: string; condition: EquipmentCondition }[];
};

export type ReceiveResult = { ok: true; units: number; item: string; siteName: string; destination: string | null; settled: boolean } | { ok: false; message: string };

export async function receiveReturn(input: ReceiveInput, actorEmail: string): Promise<ReceiveResult> {
  const issue = await loadIssueForReturn(input.issueId);
  if (!issue) return { ok: false, message: "Issued item not found." };

  const returnedBy = String(input.returnedBy ?? "").trim().slice(0, 120);
  if (!returnedBy) return { ok: false, message: "Enter who brought the items back." };
  const note = String(input.note ?? "").trim().slice(0, 500) || null;

  const tracked = isTracked(issue);
  const item    = issue.inventoryItem;

  // What exactly is coming back?
  let qty = 0;
  let units: { line: IssueForReturn["lines"][number]; condition: EquipmentCondition }[] = [];
  let bulkCondition: EquipmentCondition = defaultReturnCondition(issue);

  if (tracked) {
    const open = new Map(returnableLines(issue).map((l) => [l.id, l]));
    for (const u of input.units ?? []) {
      const line = open.get(u.lineId);
      if (!line) return { ok: false, message: "One of the selected units can't be returned (already returned or installed)." };
      if (!isCondition(u.condition)) return { ok: false, message: "Choose a condition for every unit." };
      units.push({ line, condition: u.condition });
      open.delete(u.lineId);
    }
    qty = units.length;
  } else {
    qty = Math.floor(Number(input.quantity));
    if (input.condition !== undefined) {
      if (!isCondition(input.condition)) return { ok: false, message: "Choose a valid condition." };
      bulkCondition = input.condition;
    }
  }

  const maxBack = outstandingQty(issue);
  if (!Number.isFinite(qty) || qty < 1) return { ok: false, message: "Enter how many came back (at least 1)." };
  if (qty > maxBack) return { ok: false, message: `Only ${maxBack} can come back for this item (issued ${issue.quantityTaken}${issue.quantityUsed != null ? `, used ${issue.quantityUsed}` : ""}${issue.quantityReturned ? `, already returned ${issue.quantityReturned}` : ""}).` };

  // A condition different from the stock line's (e.g. Faulty) goes to a separate stock line.
  // Prepare item codes for any line that has to be created BEFORE the transaction, so no query runs
  // outside it while it is open.
  const now = new Date();
  const otherConditions = new Set<EquipmentCondition>(tracked ? units.map((u) => u.condition) : [bulkCondition]);
  otherConditions.delete(item.condition);
  const newCodes = new Map<EquipmentCondition, string>();
  if (otherConditions.size) {
    const sitePrefix = await getSitePrefix(issue.inventorySiteId);
    for (const c of otherConditions) {
      const exists = await prisma.inventoryItem.findFirst({
        where: { inventorySiteId: issue.inventorySiteId, name: item.name, isDeleted: false, condition: c }, select: { id: true },
      });
      if (!exists) newCodes.set(c, await generateItemCode({ itemType: item.itemType, sitePrefix }));
    }
  }

  await prisma.$transaction(async (tx) => {
    // Stock line for a given condition at this warehouse: the issued item if the condition is the same,
    // otherwise an existing line with that condition, otherwise a new one.
    const targetFor = async (condition: EquipmentCondition) => {
      if (condition === item.condition) return item.id;
      const existing = await tx.inventoryItem.findFirst({
        where:  { inventorySiteId: issue.inventorySiteId, name: item.name, isDeleted: false, condition },
        select: { id: true },
      });
      if (existing) return existing.id;
      const code = newCodes.get(condition);
      if (!code) throw new Error("A stock line for this condition was just created by someone else — please try again.");
      newCodes.delete(condition);   // one new line per condition
      const created = await tx.inventoryItem.create({
        data: {
          inventorySiteId: issue.inventorySiteId, itemType: item.itemType, name: item.name,
          itemCode: code,
          manufacturer: item.manufacturer, model: item.model, unit: item.unit,
          quantity: 0, uncountable: false, reorderLevel: 0, status: "OUT_OF_STOCK", condition,
        },
        select: { id: true },
      });
      return created.id;
    };

    const addStock = async (itemId: string, n: number) => {
      if (item.uncountable) return;
      const updated = await tx.inventoryItem.update({
        where: { id: itemId }, data: { quantity: { increment: n } },
        select: { quantity: true, reorderLevel: true, status: true, uncountable: true },
      });
      const status = getAutoInventoryStatus({ quantity: updated.quantity, reorderLevel: updated.reorderLevel, preferredStatus: updated.status, uncountable: updated.uncountable });
      if (status !== updated.status) await tx.inventoryItem.update({ where: { id: itemId }, data: { status } });
    };

    if (tracked) {
      for (const u of units) {
        const target = await targetFor(u.condition);
        await tx.assetInstance.update({
          where: { id: u.line.assetInstance.id },
          data:  { inventoryItemId: target, condition: u.condition, status: "AVAILABLE" },
        });
        await tx.warehouseIssueLine.update({ where: { id: u.line.id }, data: { returnedAt: now } });
        await addStock(target, 1);   // the unit was taken off stock when issued; it only needs adding back
      }
    } else {
      await addStock(await targetFor(bulkCondition), qty);
    }

    const returnedTotal = issue.quantityReturned + qty;
    const settled       = (issue.quantityUsed ?? 0) + returnedTotal >= issue.quantityTaken;
    const nothingUsed   = (issue.quantityUsed ?? 0) === 0 && returnedTotal >= issue.quantityTaken;

    await tx.warehouseIssue.update({
      where: { id: issue.id },
      data: {
        quantityReturned: returnedTotal,
        // A returnable issue closes once everything is accounted for.
        ...(settled && issue.status === "OPEN" ? { status: "RETURNED", returnedAt: now, returnedBy, returnNote: note } : {}),
        // Everything came back and nothing was used: there is nothing left to deliver.
        ...(nothingUsed && issue.deliveryStatus && issue.deliveryStatus !== "RETURNED" ? { deliveryStatus: "RETURNED" } : {}),
      },
    });

    await tx.issueReturn.create({
      data: {
        warehouseIssueId: issue.id,
        quantity:         qty,
        condition:        tracked ? units[0].condition : bulkCondition,
        entityCodes:      units.map((u) => u.line.assetInstance.entityCode),
        returnedBy,
        receivedBy:       actorEmail,
        note,
      },
    });
  }, { timeout: 30000 });

  const settledNow = (issue.quantityUsed ?? 0) + issue.quantityReturned + qty >= issue.quantityTaken;
  return { ok: true, units: qty, item: item.name, siteName: issue.inventorySite.name, destination: issue.destinationName, settled: settledNow };
}

// Activity log + bell notification for a received return (server-only; not callable from the browser).
export async function recordReturnEffects(r: Extract<ReceiveResult, { ok: true }>, input: ReceiveInput, actorEmail: string, warehouseId: string) {
  const from = r.destination ? ` from ${r.destination}` : "";
  await logActivity({
    type:       "INVENTORY_EQUIPMENT_RETURNED",
    title:      `Returned: ${r.units} × ${r.item} to ${r.siteName}${from}`,
    details:    `Brought back by ${input.returnedBy}. Received by ${actorEmail}.${input.note ? ` Note: ${input.note}.` : ""}${r.settled ? " Item fully accounted for." : ""}`,
    actorEmail,
    entityType: "INVENTORY_ITEM",
    entityId:   input.issueId,
  });
  await notify({
    type:       "ITEM_RETURNED",
    title:      `${r.units} × ${r.item} returned to ${r.siteName}${from}`,
    body:       `Brought back by ${input.returnedBy}.${input.note ? ` Note: ${input.note}` : ""}`,
    link:       `/store/sites/${warehouseId}/issues`,
    actorEmail,
  });
}
