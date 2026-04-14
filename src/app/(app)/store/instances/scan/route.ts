import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = body.serial;

    if (!rawInput) {
      return NextResponse.json({ error: "No data received" }, { status: 400 });
    }

    // 1. Get all serials from the table
    const allInstances = await prisma.assetInstance.findMany({
      include: { 
        inventoryItem: {
          select: { id: true, name: true, itemType: true }
        } 
      }
    });

    // 2. Find which serial is hidden in the junk
    const match = allInstances.find(ins => 
      rawInput.includes(ins.serialNumber)
    );

    if (!match) {
      return NextResponse.json({ error: "Serial not found in database" }, { status: 404 });
    }

    return NextResponse.json({
      id: match.inventoryItem.id,
      name: match.inventoryItem.name,
      itemType: match.inventoryItem.itemType,
      serialNumber: match.serialNumber,
      condition: match.condition,
    });

  } catch (error) {
    console.error("SCAN_API_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}