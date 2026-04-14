import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serial = searchParams.get("serial");

  if (!serial) return new NextResponse("Serial required", { status: 400 });

  const instance = await prisma.assetInstance.findUnique({
    where: { serialNumber: serial },
    include: { inventoryItem: true },
  });

  if (!instance) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: instance.inventoryItem.id,
    name: instance.inventoryItem.name,
    itemType: instance.inventoryItem.itemType,
    serialNumber: instance.serialNumber,
    condition: instance.condition,
  });
}