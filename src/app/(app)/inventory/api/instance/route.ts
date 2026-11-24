import { storeViewer, warehouseOfItem } from "@/lib/access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    if (!(await getCurrentProfile())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const owner = await warehouseOfItem(itemId);
    if (!owner || !(await storeViewer(owner))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const instances = await prisma.assetInstance.findMany({
      where: { inventoryItemId: itemId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(instances);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
  }
}