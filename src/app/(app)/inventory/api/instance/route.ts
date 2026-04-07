import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const instances = await prisma.assetInstance.findMany({
      where: { inventoryItemId: itemId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(instances);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
  }
}