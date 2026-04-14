import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { serial: rawInput } = await req.json();

    if (!rawInput) return new NextResponse("No data", { status: 400 });

    // 1. Fetch all serials from the AssetInstance table
    // We do this because the scan is a "junk sandwich" and we need to find the "meat" (the serial)
    const allInstances = await prisma.assetInstance.findMany({
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

    // 2. The Smart Matcher: Does the junk scan contain any serial from our DB?
    const match = allInstances.find(ins => 
      rawInput.includes(ins.serialNumber)
    );

    if (!match) {
      return NextResponse.json({ 
        error: "Serial not found in the scanned data. Please check if this item is registered." 
      }, { status: 404 });
    }

    // 3. Success: Return the parent Inventory Item data
    return NextResponse.json({
      id: match.inventoryItem.id,
      name: match.inventoryItem.name,
      itemType: match.inventoryItem.itemType,
      serialNumber: match.serialNumber,
      condition: match.condition,
    });

  } catch (error) {
    console.error("SCAN_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}