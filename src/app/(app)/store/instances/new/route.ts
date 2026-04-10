import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const json = await req.json();
  const { itemId, ...data } = json;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new asset instance
      const newInstance = await tx.assetInstance.create({
        data: {
          inventoryItemId: itemId,
          serialNumber: data.serialNumber,
          model: data.model,
          manufacturer: data.manufacturer,
          status: "AVAILABLE",
          condition: "NEW",
        }
      });

      // 2. Increment the total quantity of the main item
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: 1 } }
      });

      return newInstance;
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: "Duplicate Serial or DB Error" }, { status: 400 });
  }
}