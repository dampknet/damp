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
          condition: true, // ✅ Logic: Fetching actual condition from DB
          instances: {
            select: { id: true, serialNumber: true, status: true, condition: true }
          }
        },
      },
    },
  });

  if (!site) return notFound();

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
      items={site.items as any}
    />
  );
}