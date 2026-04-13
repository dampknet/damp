import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "EDITOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { ids, itemId } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new NextResponse("No IDs provided", { status: 400 });
    }

    // We use a transaction to ensure both steps happen or none happen
    await prisma.$transaction([
      // 1. Delete the specific instances
      prisma.assetInstance.deleteMany({
        where: {
          id: { in: ids },
          itemId: itemId,
        },
      }),
      // 2. Decrement the main item quantity by the number of deleted items
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: {
            decrement: ids.length,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BULK_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}