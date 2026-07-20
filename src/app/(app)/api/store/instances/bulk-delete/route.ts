import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role    = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body   = await req.json() as { ids?: string[]; itemId?: string };
    const ids    = body.ids    ?? [];
    const itemId = body.itemId ?? "";

    if (!ids.length || !itemId) {
      return NextResponse.json({ error: "ids and itemId are required" }, { status: 400 });
    }

    // Fetch instances + parent item name for audit log
    const [instances, parentItem] = await Promise.all([
      prisma.assetInstance.findMany({
        where:  { id: { in: ids }, inventoryItemId: itemId },
        select: { id: true, entityCode: true },
      }),
      prisma.inventoryItem.findUnique({
        where:  { id: itemId },
        select: { id: true, name: true, itemCode: true },
      }),
    ]);

    if (!instances.length) {
      return NextResponse.json({ error: "No matching instances found" }, { status: 404 });
    }

    const confirmedIds    = instances.map((i) => i.id);
    const entityCodesList = instances.map((i) => i.entityCode).join(", ");

    await prisma.$transaction([
      // Delete the instances
      prisma.assetInstance.deleteMany({
        where: { id: { in: confirmedIds } },
      }),
      // Decrement quantity on parent item
      prisma.inventoryItem.update({
        where: { id: itemId },
        data:  { quantity: { decrement: confirmedIds.length } },
      }),
    ]);

    // ✅ Log to audit trail
    await logActivity({
      type:       "INVENTORY_ITEM_UPDATED",
      title:      `Deleted ${confirmedIds.length} unit${confirmedIds.length !== 1 ? "s" : ""} from ${parentItem?.name ?? itemId}`,
      details:    `Entity codes removed: ${entityCodesList}. Item code: ${parentItem?.itemCode ?? "—"}.`,
      actorEmail: profile?.email ?? null,
      entityType: "INVENTORY_ITEM",
      entityId:   itemId,
    });

    return NextResponse.json({ ok: true, deleted: confirmedIds.length });
  } catch (error) {
    console.error("[INSTANCES_BULK_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete instances" }, { status: 500 });
  }
}