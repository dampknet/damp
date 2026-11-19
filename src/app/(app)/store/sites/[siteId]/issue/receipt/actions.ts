"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";
import { parseIssueDate }    from "@/lib/issue-date";

// Master admin: change the issue date of every item on one waybill (for back-dated paper waybills).
export async function changeIssueDate(groupId: string, dateValue: string): Promise<{ ok: boolean; message: string }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false, message: "Only a master admin can change the issue date." };

  const parsed = parseIssueDate(String(dateValue ?? ""));
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const newDate = parsed.date;

  const issues = await prisma.warehouseIssue.findMany({
    where:  { groupId: String(groupId ?? "") },
    select: {
      id: true, takenAt: true, deliveredAt: true, returnedAt: true, returnedBy: true, inventorySiteId: true, takenBy: true,
      inventoryItem: { select: { name: true } },
    },
  });
  if (!issues.length) return { ok: false, message: "Waybill not found." };

  // Keep the record consistent: an item can't be issued after it was delivered or returned.
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  for (const i of issues) {
    if (i.deliveredAt && day(newDate) > day(i.deliveredAt)) {
      return { ok: false, message: `"${i.inventoryItem.name}" was confirmed delivered on ${i.deliveredAt.toLocaleDateString("en-GB")}. The issue date can't be after that.` };
    }
    if (i.returnedAt && i.returnedBy !== "Non-returnable" && day(newDate) > day(i.returnedAt)) {
      return { ok: false, message: `"${i.inventoryItem.name}" was returned on ${i.returnedAt.toLocaleDateString("en-GB")}. The issue date can't be after that.` };
    }
  }

  const oldDate = issues[0].takenAt;
  if (day(oldDate) === day(newDate)) return { ok: true, message: "The issue date is already set to that day." };

  await prisma.$transaction([
    prisma.warehouseIssue.updateMany({ where: { groupId }, data: { takenAt: newDate } }),
    // Non-returnable items are closed at issue time; keep their close date in line with the issue date.
    prisma.warehouseIssue.updateMany({ where: { groupId, returnedBy: "Non-returnable" }, data: { returnedAt: newDate } }),
  ]);

  const fmt = (d: Date) => d.toLocaleDateString("en-GB");
  await logActivity({
    type:       "SYSTEM_EVENT",
    title:      `Issue date changed: ${fmt(oldDate)} → ${fmt(newDate)} (${issues.length} item${issues.length === 1 ? "" : "s"}, ${issues[0].takenBy})`,
    details:    `Waybill ${groupId}. Items: ${issues.map((i) => i.inventoryItem.name).join(", ")}. Changed by ${me.email}.`,
    actorEmail: me.email,
    entityType: "INVENTORY_SITE",
    entityId:   issues[0].inventorySiteId,
  });

  revalidatePath(`/store/sites/${issues[0].inventorySiteId}/issue/receipt`);
  return { ok: true, message: `Issue date changed to ${fmt(newDate)}.` };
}
