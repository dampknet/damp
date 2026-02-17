import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StoreStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
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

    // extra safety: only allow enum values
    if (body.status !== "RECEIVED" && body.status !== "NOT_RECEIVED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.storeItem.update({
      where: { id: body.itemId },
      data: { status: body.status },
      select: { id: true, status: true },
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
