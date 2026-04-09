import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import InventorySiteClient from "./InventorySiteClient";

export default async function InventorySitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const site = await prisma.inventorySite.findFirst({
    where: { id: siteId, isDeleted: false },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      items: {
        where: { isDeleted: false },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          itemType: true,
          description: true,
          stockNumber: true,
          manufacturer: true,
          model: true,
          quantity: true,
          unit: true,
          reorderLevel: true,
          status: true,
          // ❌ REMOVED: condition: true (This was the line 39 error)
          instances: {
            select: { id: true, serialNumber: true, status: true, condition: true }
          }
        },
      },
    },
  });

  if (!site) return notFound();

  // ✅ Logic: Since the master item doesn't have a condition, we look at the first instance
  // or default to "GOOD" to show in your table column.
  const itemsWithCondition = site.items.map(item => ({
    ...item,
    condition: item.instances[0]?.condition || "GOOD"
  }));

  const summary = {
    totalItems: site.items.length,
    materialCount: site.items.filter((i) => i.itemType === "MATERIAL").length,
    equipmentCount: site.items.filter((i) => i.itemType === "EQUIPMENT").length,
    lowStockCount: site.items.filter((i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK").length,
    checkedOutCount: site.items.filter((i) => i.status === "CHECKED_OUT").length,
  };

  return (
    <InventorySiteClient
      role={role}
      canEdit={canEdit}
      site={site}
      summary={summary}
      items={itemsWithCondition as any}
    />
  );
}