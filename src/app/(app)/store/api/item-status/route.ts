import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { StoreStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      itemId?: string;
      status?: StoreStatus;
    };

    if (!body.itemId || !body.status) {
      return NextResponse.json(
        { error: "itemId and status are required" },
        { status: 400 }
      );
    }

    if (body.status !== "RECEIVED" && body.status !== "NOT_RECEIVED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const current = await prisma.storeItem.findUnique({
      where: { id: body.itemId },
      select: {
        id: true,
        itemNo: true,
        description: true,
        status: true,
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Store item not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.storeItem.update({
        where: { id: body.itemId! },
        data: { status: body.status },
        select: {
          id: true,
          itemNo: true,
          description: true,
          status: true,
        },
      });

      if (current.status !== body.status) {
        await tx.activityLog.create({
          data: {
            type: "STORE_ITEM_STATUS_CHANGED",
            title: `Store item #${current.itemNo} status changed`,
            details: `${current.status} → ${body.status} (${current.description})`,
            entityType: "STORE_ITEM",
            entityId: item.id,
            actorEmail: profile?.email ?? null,
          },
        });
      }

      return item;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update item status" },
      { status: 500 }
    );
  }
}