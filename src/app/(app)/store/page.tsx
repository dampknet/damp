import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import StoreDashboardClient from "./StoreDashboardClient";

export default async function StoreDashboardPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const [
    inventorySites,
    totalInventoryItems,
    totalMaterials,
    totalEquipment,
    lowStockItems,
    checkedOutEquipment,
    centralStockCount,
    restockCount,
    materialIssueCount,
  ] = await Promise.all([
    prisma.inventorySite.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { itemType: "MATERIAL" } }),
    prisma.inventoryItem.count({ where: { itemType: "EQUIPMENT" } }),
    prisma.inventoryItem.count({
      where: {
        OR: [
          { status: "LOW_STOCK" },
          { status: "OUT_OF_STOCK" },
        ],
      },
    }),
    prisma.inventoryItem.count({
      where: { status: "CHECKED_OUT" },
    }),
    prisma.storeItem.count(),
    prisma.inventoryRestock.count(),
    prisma.materialIssue.count(),
  ]);

  const siteCards = inventorySites.map((site) => ({
    id: site.id,
    name: site.name,
    location: site.location ?? "-",
    itemCount: site._count.items,
  }));

  return (
    <StoreDashboardClient
      role={role}
      email={profile?.email ?? null}
      summary={{
        totalInventoryItems,
        totalMaterials,
        totalEquipment,
        lowStockItems,
        checkedOutEquipment,
        centralStockCount,
        restockCount,
        materialIssueCount,
      }}
      siteCards={siteCards}
    />
  );
}