import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { itemId?: string };

    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const item = await prisma.storeItem.findUnique({
      where: { id: body.itemId },
      select: {
        id: true,
        itemNo: true,
        description: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Store item not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.storeItem.delete({ where: { id: body.itemId } }),
      prisma.activityLog.create({
        data: {
          type: "STORE_ITEM_DELETED",
          title: `Store item #${item.itemNo} deleted`,
          details: item.description,
          entityType: "STORE_ITEM",
          entityId: item.id,
          actorEmail: profile?.email ?? null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete store item" },
      { status: 500 }
    );
  }
}