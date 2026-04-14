import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("No data", { status: 400 });

    /**
     * ✅ THE EXTRACTION LOGIC
     * This Regex finds the actual serial numbers like 101793 or 2434567 
     * inside the messy strings you showed me.
     */
    const serialMatch = rawInput.match(/\b\d{5,}\b/); 
    const extractedSerial = serialMatch ? serialMatch[0] : null;

    if (!extractedSerial) {
      return NextResponse.json({ 
        error: `Could not find a serial number in that junk data.` 
      }, { status: 404 });
    }

    // ✅ DATABASE SEARCH
    // We look in AssetInstance for the clean serial we just extracted
    const instance = await prisma.assetInstance.findUnique({
      where: { serialNumber: extractedSerial },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            itemType: true,
          }
        }
      }
    });

    if (!instance) {
      return NextResponse.json({ 
        error: `Found serial ${extractedSerial}, but it's not in the database.` 
      }, { status: 404 });
    }

    // ✅ SUCCESS: Return the Item Name and Condition
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