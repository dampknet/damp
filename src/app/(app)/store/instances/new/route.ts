import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const json = await req.json();
  const { itemId, ...data } = json;

  if (!itemId) {
    return NextResponse.json({ message: "itemId is required" }, { status: 400 });
  }

  if (!data.entityCode) {
    return NextResponse.json({ message: "entityCode is required" }, { status: 400 });
  }

  try {
    // Check entityCode uniqueness first
    const existing = await prisma.assetInstance.findFirst({
      where: { entityCode: data.entityCode },
    });
    if (existing) {
      return NextResponse.json(
        { message: "This entity code is already assigned to another unit." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new asset instance
      const newInstance = await tx.assetInstance.create({
        data: {
          inventoryItemId: itemId,
          entityCode:      data.entityCode,   // ✅ required field
          model:           data.model        ?? null,
          manufacturer:    data.manufacturer ?? null,
          status:          "AVAILABLE",
          condition:       (data.condition ?? "NEW") as any,
        },
      });

      // 2. Increment the total quantity on the parent item
      await tx.inventoryItem.update({
        where: { id: itemId },
        data:  { quantity: { increment: 1 } },
      });

      return newInstance;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[INSTANCE_NEW_ERROR]", error);
    return NextResponse.json(
      { message: "Could not create instance. Check entity code uniqueness." },
      { status: 400 }
    );
  }
}