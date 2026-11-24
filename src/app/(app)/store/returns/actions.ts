"use server";

import { storeEditor } from "@/lib/access";
import { revalidatePath }   from "next/cache";
import { getEditorProfile } from "@/lib/auth";
import {
  loadIssueForReturn, receiveReturn, returnableLines, outstandingQty, defaultReturnCondition, isTracked,
  recordReturnEffects, type ReceiveInput,
} from "@/lib/returns";

export type ReturnDetails = {
  issueId:          string;
  itemName:         string;
  unit:             string;
  warehouse:        string;
  warehouseId:      string;
  takenBy:          string;
  destination:      string | null;
  quantityTaken:    number;
  quantityUsed:     number | null;
  quantityReturned: number;
  outstanding:      number;
  tracked:          boolean;
  defaultCondition: string;
  units:            { lineId: string; entityCode: string; condition: string }[];
};

// Details for the "Receive returned items" window.
export async function getReturnDetails(issueId: string): Promise<ReturnDetails | { error: string }> {
  const i = await loadIssueForReturn(String(issueId ?? ""));
  if (!i) return { error: "Issued item not found." };
  // Returns go back into that warehouse: editor role + full access there.
  if (!(await storeEditor(i.inventorySiteId))) return { error: "You don't have edit access to the warehouse this came from." };
  return {
    issueId:          i.id,
    itemName:         i.inventoryItem.name,
    unit:             i.inventoryItem.unit || "pcs",
    warehouse:        i.inventorySite.name,
    warehouseId:      i.inventorySiteId,
    takenBy:          i.takenBy,
    destination:      i.destinationName,
    quantityTaken:    i.quantityTaken,
    quantityUsed:     i.quantityUsed,
    quantityReturned: i.quantityReturned,
    outstanding:      outstandingQty(i),
    tracked:          isTracked(i),
    defaultCondition: defaultReturnCondition(i),
    units:            returnableLines(i).map((l) => ({ lineId: l.id, entityCode: l.assetInstance.entityCode, condition: l.assetInstance.condition })),
  };
}

// Store staff receive leftovers back into stock.
export async function receiveReturnAction(input: ReceiveInput): Promise<{ ok: boolean; message: string }> {
  const issue = await loadIssueForReturn(String(input?.issueId ?? ""));
  if (!issue) return { ok: false, message: "Issued item not found." };
  const me = await storeEditor(issue.inventorySiteId);
  if (!me) return { ok: false, message: "You don't have edit access to the warehouse this came from." };

  const res = await receiveReturn(input, me.email);
  if (!res.ok) return res;

  await recordReturnEffects(res, input, me.email, issue.inventorySiteId);

  revalidatePath(`/store/sites/${issue.inventorySiteId}/issues`);
  revalidatePath(`/store/sites/${issue.inventorySiteId}`);
  revalidatePath("/store/returns");
  revalidatePath("/store/deliveries");
  if (issue.groupId) revalidatePath(`/store/sites/${issue.inventorySiteId}/issue/receipt`);
  return { ok: true, message: `${res.units} × ${res.item} received back into ${res.siteName} stock.` };
}
