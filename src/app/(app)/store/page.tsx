import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import StoreDashboardClient from "./StoreDashboardClient";

export default async function StoreDashboardPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const [
    inventorySites,
    totalInventoryItems,
    totalEquipment,
    totalAccessories,
    lowStockItems,
    checkedOutEquipment,
    centralStockCount,
    restockCount,
    issueCount,
  ] = await Promise.all([
    prisma.inventorySite.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        _count: { select: { items: { where: { isDeleted: false } } } },
      },
    }),

    // Total non-deleted items
    prisma.inventoryItem.count({
      where: { isDeleted: false },
    }),

    // Equipment specifically
    prisma.inventoryItem.count({
      where: { isDeleted: false, itemType: "EQUIPMENT" },
    }),

    // Accessories
    prisma.inventoryItem.count({
      where: { isDeleted: false, itemType: "ACCESSORIES" },
    }),

    // Low / out of stock
    prisma.inventoryItem.count({
      where: {
        isDeleted: false,
        OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      },
    }),

    // Equipment currently issued (open WarehouseIssues)
    prisma.warehouseIssue.count({
      where: { status: "OPEN" },
    }),

    prisma.storeItem.count(),

    prisma.inventoryRestock.count(),

    prisma.inventoryIssue.count(),
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
        totalEquipment,
        totalAccessories,
        lowStockItems,
        checkedOutEquipment,
        centralStockCount,
        restockCount,
        issueCount,
      }}
      siteCards={siteCards}
    />
  );
}
