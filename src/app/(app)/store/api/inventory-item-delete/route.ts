import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";

    if (!(role === "ADMIN" || role === "EDITOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { itemId?: string };
    const itemId = body.itemId?.trim();

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.inventoryItem.delete({
        where: { id: itemId },
      }),
      prisma.activityLog.create({
        data: {
          type: "INVENTORY_ITEM_DELETED",
          title: `${item.name} deleted from inventory`,
          details: null,
          entityType: "INVENTORY_ITEM",
          entityId: item.id,
          actorEmail: profile?.email ?? null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}