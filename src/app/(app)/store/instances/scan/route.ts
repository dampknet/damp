import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("Serial required", { status: 400 });

    // 1. Clean the input: Remove brackets and split by spaces/hyphens/colons
    // This turns "<Rhode & Schwarz><2501-101793>" into ["Rhode", "Schwarz", "2501", "101793"]
    const segments = rawInput
      .replace(/[<>]/g, " ")
      .split(/[\s\-:]+/)
      .filter(part => part.length > 2); // ignore tiny segments

    // 2. SEARCH: Check AssetInstance table for any record where the serialNumber 
    // is contained WITHIN the raw scanner input.
    const instance = await prisma.assetInstance.findFirst({
      where: {
        OR: segments.map(segment => ({
          serialNumber: {
            equals: segment.trim(),
            mode: 'insensitive'
          }
        }))
      },
      include: {
        inventoryItem: true // Pull the parent InventoryItem name
      }
    });

    // 3. Fallback: If segments didn't work, try a direct "contains" search on the whole string
    if (!instance) {
       const fallback = await prisma.assetInstance.findFirst({
         where: {
           OR: [
             { serialNumber: { contains: rawInput.trim(), mode: 'insensitive' } },
             // This is the winner: is the serialNumber part of what was scanned?
             { serialNumber: { in: segments } } 
           ]
         },
         include: { inventoryItem: true }
       });
       
       if (!fallback) {
         return NextResponse.json({ error: `Serial not found in segments: ${segments.join(', ')}` }, { status: 404 });
       }
       
       return NextResponse.json({
         id: fallback.inventoryItem.id,
         name: fallback.inventoryItem.name,
         itemType: fallback.inventoryItem.itemType,
         serialNumber: fallback.serialNumber,
         condition: fallback.condition,
       });
    }

    // 4. Success: Return the parent Item Name and the specific Serial
    return NextResponse.json({
      id: instance.inventoryItem.id,
      name: instance.inventoryItem.name,
      itemType: instance.inventoryItem.itemType,
      serialNumber: instance.serialNumber,
      condition: instance.condition,
    });

  } catch (error) {
    console.error("Scan API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}