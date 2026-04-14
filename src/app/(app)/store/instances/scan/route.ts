import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("No data", { status: 400 });

    // 1. Get all serial numbers from the AssetInstance table
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

    // 2. Search: Does the messy scanner string contain ANY of our serial numbers?
    // This looks for "2434567" or "101793" anywhere inside the junk text.
    const foundInstance = allInstances.find(ins => 
      rawInput.toLowerCase().includes(ins.serialNumber.toLowerCase())
    );

    if (!foundInstance) {
      return NextResponse.json({ 
        error: `Could not map scan to any serial in database.` 
      }, { status: 404 });
    }

    // 3. Success: Return the mapped data
    return NextResponse.json({
      id: foundInstance.inventoryItem.id,
      name: foundInstance.inventoryItem.name,
      itemType: foundInstance.inventoryItem.itemType,
      serialNumber: foundInstance.serialNumber,
      condition: foundInstance.condition,
    });

  } catch (error) {
    console.error("SCAN_ERROR", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}