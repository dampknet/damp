import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let serial = searchParams.get("serial");

  if (!serial) return new NextResponse("Serial required", { status: 400 });

  // ✅ FIX: Clean the serial number. 
  // If the scanner sends "Serial serial number: 101793", this grabs just "101793"
  const cleanSerial = serial
    .replace(/<([^>]+)>/g, "$1") // Remove brackets if present
    .split(/[:\s]+/)             // Split by colon or space
    .find(part => /^\d+$/.test(part) || part.length > 4) || serial; // Find the actual number part

  // Try searching with the cleaned serial
  let instance = await prisma.assetInstance.findUnique({
    where: { serialNumber: cleanSerial.trim() },
    include: { inventoryItem: true },
  });

  // Fallback: if not found, try a case-insensitive search
  if (!instance) {
    instance = await prisma.assetInstance.findFirst({
      where: { 
        serialNumber: {
          equals: cleanSerial.trim(),
          mode: 'insensitive'
        }
      },
      include: { inventoryItem: true },
    });
  }

  if (!instance) {
    return NextResponse.json({ error: `Serial ${cleanSerial} not found` }, { status: 404 });
  }

  return NextResponse.json({
    id: instance.inventoryItem.id,
    name: instance.inventoryItem.name,
    itemType: instance.inventoryItem.itemType,
    serialNumber: instance.serialNumber,
    condition: instance.condition,
    unit: instance.inventoryItem.unit,
  });
}