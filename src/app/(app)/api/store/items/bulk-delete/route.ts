import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function DELETE(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role    = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { itemIds?: string[]; reason?: string };
    const itemIds = body.itemIds ?? [];
    const reason  = body.reason?.trim() || null;

    if (!itemIds.length) {
      return NextResponse.json({ error: "No item IDs provided" }, { status: 400 });
    }

    // Fetch items to confirm they exist and aren't already deleted
    const items = await prisma.inventoryItem.findMany({
      where:  { id: { in: itemIds }, isDeleted: false },
      select: { id: true, name: true },
    });

    if (!items.length) {
      return NextResponse.json({ error: "No valid items found" }, { status: 404 });
    }

    // Soft delete all + log each
    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: {
          isDeleted:      true,
          deletedAt:      new Date(),
          deletedByEmail: profile?.email ?? null,
          deleteReason:   reason,
        },
      });

      await tx.activityLog.createMany({
        data: items.map((item) => ({
          type:       "INVENTORY_ITEM_DELETED" as const,
          title:      `${item.name} deleted from inventory`,
          details:    reason,
          entityType: "INVENTORY_ITEM",
          entityId:   item.id,
          actorEmail: profile?.email ?? null,
        })),
      });
    });

    return NextResponse.json({ ok: true, deleted: items.length });
  } catch (error) {
    console.error("[BULK_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
  }
}