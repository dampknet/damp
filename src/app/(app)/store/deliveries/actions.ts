"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";
import { notify }            from "@/lib/notifications";
import {
  loadIssueForReturn, receiveReturn, recordReturnEffects, returnableLines, isTracked, defaultReturnCondition,
} from "@/lib/returns";

export type ConfirmItem = {
  id:           string;
  used?:        number;     // bulk items: how many were used at the destination
  usedLineIds?: string[];   // tracked items: which units were installed
};

// Master admins confirm what was delivered and how much was actually used.
// Whatever wasn't used is "awaiting return" — or goes straight back into stock if it came back already.
export async function confirmDeliveries(
  items: ConfirmItem[],
  note: string,
  backNow = false,
  returnedBy = "",
): Promise<{ ok: boolean; message: string }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false, message: "Only a master admin can confirm deliveries." };

  const list = (Array.isArray(items) ? items : []).filter((x) => x && typeof x.id === "string").slice(0, 500);
  if (!list.length) return { ok: false, message: "Select at least one item." };
  const cleanNote = String(note ?? "").trim().slice(0, 500) || null;

  // Load and validate everything first, so nothing is half-saved.
  type Plan = { issue: NonNullable<Awaited<ReturnType<typeof loadIssueForReturn>>>; used: number; usedLineIds: string[] };
  const plans: Plan[] = [];
  for (const it of list) {
    const issue = await loadIssueForReturn(it.id);
    if (!issue || issue.deliveryStatus !== "PENDING") continue;
    const stillOut = issue.quantityTaken - issue.quantityReturned;

    if (isTracked(issue)) {
      const open = new Set(returnableLines(issue).map((l) => l.id));
      const ids  = [...new Set(it.usedLineIds ?? returnableLines(issue).map((l) => l.id))];
      if (ids.some((id) => !open.has(id))) return { ok: false, message: `"${issue.inventoryItem.name}": one of the selected units is no longer out.` };
      plans.push({ issue, used: ids.length, usedLineIds: ids });
    } else {
      const used = it.used === undefined ? stillOut : Math.floor(Number(it.used));
      if (!Number.isFinite(used) || used < 0 || used > stillOut) {
        return { ok: false, message: `"${issue.inventoryItem.name}": used must be between 0 and ${stillOut}.` };
      }
      plans.push({ issue, used, usedLineIds: [] });
    }
  }
  if (!plans.length) return { ok: false, message: "Those items are already confirmed (or were removed)." };

  const now = new Date();
  let confirmed = 0;
  for (const p of plans) {
    // Only rows that are still PENDING change, so two people confirming at once can't double-count.
    const { count } = await prisma.warehouseIssue.updateMany({
      where: { id: p.issue.id, deliveryStatus: "PENDING" },
      data:  { deliveryStatus: "DELIVERED", deliveredAt: now, deliveredBy: me.email, deliveryNote: cleanNote, quantityUsed: p.used },
    });
    if (!count) continue;
    confirmed++;
    if (p.usedLineIds.length) {
      await prisma.warehouseIssueLine.updateMany({ where: { id: { in: p.usedLineIds } }, data: { usedAt: now } });
    }
  }

  // Leftovers brought back with the engineer: straight back into stock (same condition as issued).
  let backUnits = 0;
  const backFailures: string[] = [];
  if (backNow) {
    for (const p of plans) {
      const fresh = await loadIssueForReturn(p.issue.id);
      if (!fresh || fresh.deliveryStatus !== "DELIVERED") continue;
      const input = isTracked(fresh)
        ? { issueId: fresh.id, returnedBy: returnedBy.trim() || fresh.takenBy, note: cleanNote, units: returnableLines(fresh).map((l) => ({ lineId: l.id, condition: l.assetInstance.condition })) }
        : { issueId: fresh.id, returnedBy: returnedBy.trim() || fresh.takenBy, note: cleanNote, quantity: fresh.quantityTaken - (fresh.quantityUsed ?? 0) - fresh.quantityReturned, condition: defaultReturnCondition(fresh) };
      if ((input.units?.length ?? input.quantity ?? 0) < 1) continue;
      const r = await receiveReturn(input, me.email);
      if (r.ok) { backUnits += r.units; await recordReturnEffects(r, input, me.email, fresh.inventorySiteId); }
      else backFailures.push(`${fresh.inventoryItem.name}: ${r.message}`);
    }
  }

  // One activity entry + one notification per destination.
  const byDest = new Map<string, Plan[]>();
  for (const p of plans) {
    const key = p.issue.destinationName ? p.issue.destinationName.trim().toLowerCase() : "—";
    byDest.set(key, [...(byDest.get(key) ?? []), p]);
  }
  for (const [, rows] of byDest) {
    const destName = rows[0].issue.destinationName ?? "destination";
    const siteId   = rows[0].issue.destinationSiteId;
    const summary  = rows.map((r) => `${r.issue.inventoryItem.name}: used ${r.used} of ${r.issue.quantityTaken - r.issue.quantityReturned}`).join("; ");

    await logActivity({
      type:       "INVENTORY_DELIVERY_CONFIRMED",
      title:      `Delivered at ${destName}: ${rows.length} item type(s)`,
      details:    `${summary}.${cleanNote ? ` Note: ${cleanNote}.` : ""} Confirmed by ${me.email}.`,
      actorEmail: me.email,
      entityType: siteId ? "SITE" : null,
      entityId:   siteId,
    });
    const leftovers = rows.some((r) => r.used < r.issue.quantityTaken - r.issue.quantityReturned);
    await notify({
      type:       "DELIVERY_CONFIRMED",
      title:      rows.length === 1
        ? `${rows[0].issue.inventoryItem.name} confirmed delivered at ${destName}`
        : `${rows.length} items confirmed delivered at ${destName}`,
      body:       `${summary}.${leftovers && !backNow ? " Unused items are awaiting return." : ""}${cleanNote ? ` Note: ${cleanNote}` : ""}`,
      link:       siteId ? `/sites/${siteId}/store` : `/store/deliveries?place=${encodeURIComponent(destName)}`,
      actorEmail: me.email,
      siteIds:    [...new Set(rows.map((r) => r.issue.inventorySiteId))], // emails go to people with these warehouses
      details: {
        items: rows.map((r) => ({
          name: r.issue.inventoryItem.name,
          qty:  `used ${r.used} of ${r.issue.quantityTaken - r.issue.quantityReturned}`,
        })),
        rows: [
          ["Delivered at", destName],
          ["From", [...new Set(rows.map((r) => r.issue.inventorySite.name))].join(", ")],
          ["Unused items", leftovers && !backNow ? "Awaiting return to the store" : null],
          ["Note", cleanNote],
        ],
        actorLabel: "Confirmed by",
      },
    });
  }

  revalidatePath("/store/deliveries");
  revalidatePath("/store/returns");
  for (const p of plans) {
    revalidatePath(`/store/sites/${p.issue.inventorySiteId}/issues`);
    if (p.issue.destinationSiteId) revalidatePath(`/sites/${p.issue.destinationSiteId}/store`);
  }

  const awaiting = plans.reduce((s, p) => s + Math.max(0, p.issue.quantityTaken - p.issue.quantityReturned - p.used), 0) - backUnits;
  return {
    ok: backFailures.length === 0,
    message: `${confirmed} item${confirmed === 1 ? "" : "s"} confirmed delivered.`
      + (backUnits ? ` ${backUnits} unused unit${backUnits === 1 ? "" : "s"} put back in stock.` : "")
      + (awaiting > 0 ? ` ${awaiting} unused unit${awaiting === 1 ? " is" : "s are"} awaiting return.` : "")
      + (backFailures.length ? ` Could not put back: ${backFailures.join("; ")}` : ""),
  };
}
