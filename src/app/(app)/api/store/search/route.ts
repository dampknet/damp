import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      isDeleted: false,
      OR: [
        { name:         { contains: q, mode: "insensitive" } },
        { description:  { contains: q, mode: "insensitive" } },
        { itemCode:     { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } },
        { model:        { contains: q, mode: "insensitive" } },
        { unit:         { contains: q, mode: "insensitive" } },
        {
          instances: {
            some: { entityCode: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      id:          true,
      name:        true,
      itemType:    true,
      itemCode:    true,
      quantity:    true,
      uncountable: true,
      unit:        true,
      status:      true,
      instances: {
        select:  { condition: true },
        take:    1,
        orderBy: { createdAt: "asc" },
      },
      inventorySite: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  const results = items.map((item) => ({
    itemId:      item.id,
    itemName:    item.name,
    itemType:    item.itemType,
    itemCode:    item.itemCode,
    quantity:    item.quantity,
    uncountable: item.uncountable,
    unit:        item.unit,
    status:      item.status,
    condition:   item.instances[0]?.condition ?? "NEW",
    siteId:      item.inventorySite.id,
    siteName:    item.inventorySite.name,
  }));

  return NextResponse.json({ results });
}
