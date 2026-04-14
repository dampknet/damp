import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("No data", { status: 400 });

    // 1. Grab all valid serials from the table
    const allInstances = await prisma.assetInstance.findMany({
      include: { inventoryItem: true }
    });

    // 2. See if the messy scan contains ANY of our database serials
    const match = allInstances.find(ins => 
      rawInput.includes(ins.serialNumber) || 
      ins.serialNumber.includes(rawInput) // Just in case
    );

    if (!match) {
      return NextResponse.json({ error: "No matching serial found in the scanned data." }, { status: 404 });
    }

    return NextResponse.json({
      id: match.inventoryItem.id,
      name: match.inventoryItem.name,
      itemType: match.inventoryItem.itemType,
      serialNumber: match.serialNumber,
      condition: match.condition,
    });

  } catch (error) {
    return new NextResponse("Server Error", { status: 500 });
  }
}