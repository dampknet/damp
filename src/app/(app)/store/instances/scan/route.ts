import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("No data", { status: 400 });

    // ✅ STEP 1: Aggressive Extraction
    // This finds every string of 5 or more digits anywhere in the junk
    const allNumericPotentials = rawInput.match(/\d{5,}/g) || [];

    if (allNumericPotentials.length === 0) {
      return NextResponse.json({ error: "No serial-like numbers found in scan." }, { status: 404 });
    }

    // ✅ STEP 2: Database Cross-Reference
    // We check all potential numbers found in the junk against the DB
    const instance = await prisma.assetInstance.findFirst({
      where: {
        serialNumber: {
          in: allNumericPotentials,
        },
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            itemType: true,
          },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ 
        error: `Found numbers ${allNumericPotentials.join(', ')} but none match our database.` 
      }, { status: 404 });
    }

    // ✅ STEP 3: Return the Parent Item Data
    return NextResponse.json({
      id: instance.inventoryItem.id,
      name: instance.inventoryItem.name,
      itemType: instance.inventoryItem.itemType,
      serialNumber: instance.serialNumber,
      condition: instance.condition,
    });

  } catch (error) {
    return new NextResponse("Server Error", { status: 500 });
  }
}