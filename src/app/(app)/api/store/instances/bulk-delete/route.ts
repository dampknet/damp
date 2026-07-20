import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role    = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { ids?: string[]; itemId?: string };
    const ids    = body.ids    ?? [];
    const itemId = body.itemId ?? "";

    if (!ids.length || !itemId) {
      return NextResponse.json({ error: "ids and itemId are required" }, { status: 400 });
    }

    // Verify all instances belong to this item (security check)
    const instances = await prisma.assetInstance.findMany({
      where: { id: { in: ids }, inventoryItemId: itemId },
      select: { id: true },
    });

    if (!instances.length) {
      return NextResponse.json({ error: "No matching instances found" }, { status: 404 });
    }

    const confirmedIds = instances.map((i) => i.id);

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

    return NextResponse.json({ ok: true, deleted: confirmedIds.length });
  } catch (error) {
    console.error("[INSTANCES_BULK_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete instances" }, { status: 500 });
  }
}