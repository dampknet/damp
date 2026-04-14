import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("Input required", { status: 400 });

    /** * 1. EXTRACT SERIAL NUMBER
     * We look for the part that is likely the serial number.
     * Logic: Split the string by anything that isn't a letter or number, 
     * then find the first segment that is purely numeric and long enough.
     */
    const parts = rawInput
      .replace(/[<>]/g, " ")     // Remove brackets
      .split(/[\s\-:]+/)         // Split by space, hyphen, or colon
      .map(p => p.trim());

    // Strategy A: Find a segment that is exactly numeric and >= 5 digits (like 101793 or 2434567)
    let extractedSerial = parts.find(p => /^\d{5,}$/.test(p));

    // Strategy B fallback: Find any segment that matches a serial in our DB exactly
    if (!extractedSerial) {
      const allAssetSerials = await prisma.assetInstance.findMany({
        select: { serialNumber: true }
      });
      extractedSerial = allAssetSerials.find(ins => 
        rawInput.toLowerCase().includes(ins.serialNumber.toLowerCase())
      )?.serialNumber;
    }

    if (!extractedSerial) {
      return NextResponse.json({ error: `Could not find a serial number in that scan.` }, { status: 404 });
    }

    /**
     * 2. DATABASE LOOKUP (AssetInstance Table)
     * Now that we have the clean serial (e.g., 101793), find who it belongs to.
     */
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
      return NextResponse.json({ error: `Serial ${extractedSerial} extracted, but not found in Database.` }, { status: 404 });
    }

    /**
     * 3. RETURN DATA
     * Pull the Name from the parent inventory item and the condition from the instance.
     */
    return NextResponse.json({
      id: instance.inventoryItem.id,       // The ID to group by in your bucket
      name: instance.inventoryItem.name,   // The Name to show in the "Item" column
      itemType: instance.inventoryItem.itemType,
      serialNumber: instance.serialNumber, // The clean serial 101793
      condition: instance.condition,       // The condition for your colored badge
    });

  } catch (error) {
    console.error("Scan API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}